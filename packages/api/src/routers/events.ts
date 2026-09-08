import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { canManageGlobalOperations } from "../lib/platform-access";
import { and, asc, desc, eq, gte, ilike, isNull, isNotNull, lt, or, sql } from "drizzle-orm";
import { db, hubEvents, tenants } from "@epl-fellows-platform/db";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager } from "../lib/network-access.js";

const eventInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional().nullable(),
  venue: z.string().max(300).optional(),
  onlineUrl: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
  isGlobal: z.boolean().optional().default(false),
});

type EventRow = typeof hubEvents.$inferSelect;

function isUpcoming(row: EventRow, now = new Date()) {
  const end = row.endsAt ?? row.startsAt;
  return end >= now;
}

function upcomingWhere(now: Date) {
  return or(
    gte(hubEvents.endsAt, now),
    and(isNull(hubEvents.endsAt), gte(hubEvents.startsAt, now)),
  )!;
}

function pastWhere(now: Date) {
  return or(
    and(isNotNull(hubEvents.endsAt), lt(hubEvents.endsAt, now)),
    and(isNull(hubEvents.endsAt), lt(hubEvents.startsAt, now)),
  )!;
}

function mapEvent(row: EventRow) {
  const upcoming = isUpcoming(row);
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    venue: row.venue,
    onlineUrl: row.onlineUrl,
    isOnline: Boolean(row.onlineUrl?.trim()),
    isUpcoming: upcoming,
    timeframe: upcoming ? ("upcoming" as const) : ("past" as const),
    sortOrder: row.sortOrder ?? 0,
    isGlobal: row.isGlobal ?? false,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

async function resolveGlobalTenantId(): Promise<string> {
  const globalTenant = await db.query.tenants.findFirst({
    where: eq(tenants.countryCode, "GLOBAL"),
  });
  if (globalTenant) return globalTenant.id;

  const [created] = await db
    .insert(tenants)
    .values({
      name: "EPL Global Platform",
      slug: "default",
      countryCode: "GLOBAL",
      isActive: true,
    })
    .returning();
  if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create the global hub" });
  return created.id;
}

export const eventsRouter = router({
  aggregates: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const baseFilter = or(
        eq(hubEvents.tenantId, tenantId),
        eq(hubEvents.isGlobal, true),
      )!;

      const [upcomingRow, pastRow, monthRow] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(hubEvents)
          .where(and(baseFilter, upcomingWhere(now))),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(hubEvents)
          .where(and(baseFilter, pastWhere(now))),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(hubEvents)
          .where(and(baseFilter, gte(hubEvents.startsAt, monthStart), lt(hubEvents.startsAt, monthEnd))),
      ]);

      const upcoming = upcomingRow[0]?.count ?? 0;
      const past = pastRow[0]?.count ?? 0;
      const thisMonth = monthRow[0]?.count ?? 0;

      return {
        upcoming,
        past,
        thisMonth,
        total: upcoming + past,
      };
    }),

  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        timeframe: z.enum(["all", "upcoming", "past"]).optional().default("all"),
        search: z.string().max(120).optional(),
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().min(2000).max(2100).optional(),
        includeGlobal: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const now = new Date();
      const baseFilter = input.includeGlobal
        ? or(eq(hubEvents.tenantId, tenantId), eq(hubEvents.isGlobal, true))!
        : eq(hubEvents.tenantId, tenantId);

      const filters = [baseFilter];

      if (input.timeframe === "upcoming") {
        filters.push(upcomingWhere(now));
      } else if (input.timeframe === "past") {
        filters.push(pastWhere(now));
      }

      if (input.month != null && input.year != null) {
        const monthStart = new Date(input.year, input.month - 1, 1);
        const monthEnd = new Date(input.year, input.month, 1);
        filters.push(gte(hubEvents.startsAt, monthStart));
        filters.push(lt(hubEvents.startsAt, monthEnd));
      }

      if (input.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        filters.push(
          or(
            ilike(hubEvents.title, q),
            ilike(hubEvents.description, q),
            ilike(hubEvents.venue, q),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(hubEvents)
        .where(and(...filters))
        .orderBy(
          input.timeframe === "past" ? desc(hubEvents.startsAt) : asc(hubEvents.startsAt),
        );

      return {
        items: rows.map(mapEvent),
        readOnly: ctx.role === "super_admin",
      };
    }),

  create: protectedProcedure
    .input(
      eventInputSchema.extend({
        tenantId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isSuperAdmin = canManageGlobalOperations(ctx);
      const isGlobal = Boolean(input.isGlobal);

      if (isGlobal && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Global operations access is required to create global events",
        });
      }

      let targetTenantId: string;
      if (isGlobal) {
        targetTenantId = await resolveGlobalTenantId();
        if (input.tenantId && input.tenantId !== targetTenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "Global events belong to EPL Global Platform." });
      } else {
        assertNetworkManager(ctx);
        targetTenantId = resolveTenantId(ctx, input.tenantId);
        await assertTenantAccess(ctx, targetTenantId);
      }

      if (input.endsAt && input.endsAt < input.startsAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "End time must be after start time" });
      }

      const [created] = await db
        .insert(hubEvents)
        .values({
          tenantId: targetTenantId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? null,
          venue: input.venue?.trim() || null,
          onlineUrl: input.onlineUrl?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
          isGlobal,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create event" });
      }

      return mapEvent(created);
    }),

  update: protectedProcedure
    .input(
      eventInputSchema.partial().extend({
        tenantId: z.string().uuid().optional(),
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isSuperAdmin = canManageGlobalOperations(ctx);

      const existing = await db.query.hubEvents.findFirst({
        where: eq(hubEvents.id, input.id),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      if (ctx.role === "tenant_admin" && !existing.isGlobal) await assertTenantAccess(ctx, existing.tenantId);
      if (existing.isGlobal && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Global operations access is required to edit global events",
        });
      }

      if (!isSuperAdmin) {
        assertNetworkManager(ctx);
        const resolved = resolveTenantId(ctx, input.tenantId ?? existing.tenantId);
        await assertTenantAccess(ctx, resolved);
        if (existing.tenantId !== resolved) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You cannot edit events of another hub" });
        }
      }

      const startsAt = input.startsAt ?? existing.startsAt;
      const endsAt = input.endsAt !== undefined ? input.endsAt : existing.endsAt;
      if (endsAt && endsAt < startsAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "End time must be after start time" });
      }

      const patch: Partial<typeof hubEvents.$inferInsert> = { updatedAt: new Date() };
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.description !== undefined) patch.description = input.description?.trim() || null;
      if (input.startsAt !== undefined) patch.startsAt = input.startsAt;
      if (input.endsAt !== undefined) patch.endsAt = input.endsAt;
      if (input.venue !== undefined) patch.venue = input.venue?.trim() || null;
      if (input.onlineUrl !== undefined) patch.onlineUrl = input.onlineUrl?.trim() || null;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
      if (isSuperAdmin && (input.isGlobal !== undefined || input.tenantId !== undefined)) {
        const isGlobal = input.isGlobal ?? existing.isGlobal;
        const target = isGlobal ? await resolveGlobalTenantId() : input.tenantId ?? existing.tenantId;
        if (isGlobal && input.tenantId && input.tenantId !== target) throw new TRPCError({ code: "BAD_REQUEST", message: "Global events belong to EPL Global Platform." });
        if (!isGlobal) {
          const hub = await db.query.tenants.findFirst({ where: eq(tenants.id, target) });
          if (!hub || hub.countryCode === "GLOBAL" || (ctx.role === "tenant_admin" && !hub.isActive)) throw new TRPCError({ code: "BAD_REQUEST", message: "Select an active country hub." });
        }
        patch.isGlobal = isGlobal; patch.tenantId = target;
      }

      const [updated] = await db
        .update(hubEvents)
        .set(patch)
        .where(eq(hubEvents.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return mapEvent(updated);
    }),

  delete: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid().optional(), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const isSuperAdmin = canManageGlobalOperations(ctx);

      const existing = await db.query.hubEvents.findFirst({
        where: eq(hubEvents.id, input.id),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      if (ctx.role === "tenant_admin" && !existing.isGlobal) await assertTenantAccess(ctx, existing.tenantId);
      if (existing.isGlobal && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Global operations access is required to delete global events",
        });
      }

      if (!isSuperAdmin) {
        assertNetworkManager(ctx);
        const resolved = resolveTenantId(ctx, input.tenantId ?? existing.tenantId);
        await assertTenantAccess(ctx, resolved);
        if (existing.tenantId !== resolved) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You cannot delete events of another hub" });
        }
      }

      const [deleted] = await db
        .delete(hubEvents)
        .where(eq(hubEvents.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return { success: true };
    }),
});
