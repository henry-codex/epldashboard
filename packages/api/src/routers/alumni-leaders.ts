import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, hubAlumniLeaders, hubCohorts } from "@epl-fellows-platform/db";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager } from "../lib/network-access.js";
import { assertTenantProgram } from "../lib/program-access.js";

const leaderInputSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.string().min(1).max(160),
  organization: z.string().max(160).optional(),
  cohortId: z.string().uuid().optional().nullable(),
  cohortYear: z.number().int().min(2000).max(2100).optional(),
  program: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  parentId: z.string().uuid().optional().nullable(),
  tier: z.number().int().min(0).max(3).optional().default(0),
  email: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  linkedinUrl: z.string().max(300).optional(),
  isRepresentative: z.boolean().optional().default(false),
  notes: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
});

type LeaderRow = typeof hubAlumniLeaders.$inferSelect;
type CohortRow = typeof hubCohorts.$inferSelect;

async function loadCohortMap(tenantId: string, cohortIds: string[]) {
  if (cohortIds.length === 0) return new Map<string, CohortRow>();
  const rows = await db
    .select()
    .from(hubCohorts)
    .where(and(eq(hubCohorts.tenantId, tenantId), inArray(hubCohorts.id, cohortIds)));
  return new Map(rows.map((row) => [row.id, row]));
}

async function resolveCohortFields(
  tenantId: string,
  input: { cohortId?: string | null; cohortYear?: number },
) {
  if (input.cohortId) {
    const cohort = await db.query.hubCohorts.findFirst({
      where: and(eq(hubCohorts.id, input.cohortId), eq(hubCohorts.tenantId, tenantId)),
    });
    if (!cohort) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Selected cohort not found for this hub" });
    }
    return { cohortId: cohort.id, cohortYear: cohort.cohortYear ?? input.cohortYear ?? null };
  }
  return { cohortId: null, cohortYear: input.cohortYear ?? null };
}

function mapLeader(
  row: LeaderRow,
  includeContact: boolean,
  cohort?: CohortRow | null,
) {
  const base = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    role: row.role,
    organization: row.organization,
    cohortId: row.cohortId,
    cohortYear: row.cohortYear,
    cohortLabel: cohort?.label ?? (row.cohortYear != null ? `Cohort ${row.cohortYear}` : null),
    program: row.program,
    region: row.region,
    parentId: row.parentId,
    tier: row.tier ?? 0,
    isRepresentative: row.isRepresentative ?? false,
    status: row.status as "active" | "inactive" | "archived",
    sortOrder: row.sortOrder ?? 0,
    updatedAt: row.updatedAt,
  };

  if (!includeContact) return base;

  return {
    ...base,
    email: row.email,
    phone: row.phone,
    linkedinUrl: row.linkedinUrl,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

export const alumniLeadersRouter = router({
  aggregates: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const isPlatformViewer = ctx.role === "super_admin";

      const rows = await db
        .select({
          status: hubAlumniLeaders.status,
          count: sql<number>`count(*)::int`,
          representatives: sql<number>`count(*) filter (where ${hubAlumniLeaders.isRepresentative} = true)::int`,
        })
        .from(hubAlumniLeaders)
        .where(eq(hubAlumniLeaders.tenantId, tenantId))
        .groupBy(hubAlumniLeaders.status);

      let totalLeaders = 0;
      let activeLeaders = 0;
      let representatives = 0;

      for (const row of rows) {
        if (row.status === "archived") continue;
        totalLeaders += row.count;
        if (row.status === "active") {
          activeLeaders = row.count;
          representatives = row.representatives;
        }
      }

      return {
        totalLeaders: isPlatformViewer ? activeLeaders : totalLeaders,
        activeLeaders,
        representatives,
      };
    }),

  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        includeArchived: z.boolean().optional().default(false),
        search: z.string().max(120).optional(),
        representativesOnly: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const isPlatformViewer = ctx.role === "super_admin";
      const includeContact = !isPlatformViewer;

      const filters = [eq(hubAlumniLeaders.tenantId, tenantId)];
      if (isPlatformViewer || !input.includeArchived) {
        filters.push(eq(hubAlumniLeaders.status, "active"));
      }
      if (input.representativesOnly) {
        filters.push(eq(hubAlumniLeaders.isRepresentative, true));
      }
      if (input.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        filters.push(
          or(
            ilike(hubAlumniLeaders.firstName, q),
            ilike(hubAlumniLeaders.lastName, q),
            ilike(hubAlumniLeaders.role, q),
            ilike(hubAlumniLeaders.organization, q),
            ilike(hubAlumniLeaders.region, q),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(hubAlumniLeaders)
        .where(and(...filters))
        .orderBy(asc(hubAlumniLeaders.sortOrder), asc(hubAlumniLeaders.lastName), asc(hubAlumniLeaders.firstName));

      const cohortMap = await loadCohortMap(
        tenantId,
        rows.map((row) => row.cohortId).filter((id): id is string => Boolean(id)),
      );

      return {
        items: rows.map((row) => mapLeader(row, includeContact, row.cohortId ? cohortMap.get(row.cohortId) : null)),
        readOnly: isPlatformViewer,
      };
    }),

  create: protectedProcedure
    .input(leaderInputSchema.extend({ tenantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      if (input.program?.trim()) {
        await assertTenantProgram(tenantId, input.program);
      }

      const cohortFields = await resolveCohortFields(tenantId, input);

      const [created] = await db
        .insert(hubAlumniLeaders)
        .values({
          tenantId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          role: input.role.trim(),
          organization: input.organization?.trim() || null,
          cohortId: cohortFields.cohortId,
          cohortYear: cohortFields.cohortYear,
          program: input.program?.trim() || null,
          region: input.region?.trim() || null,
          parentId: input.parentId ?? null,
          tier: input.isRepresentative ? 0 : (input.tier ?? 1),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          linkedinUrl: input.linkedinUrl?.trim() || null,
          isRepresentative: input.isRepresentative ?? false,
          status: "active",
          notes: input.notes?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create alumni leader" });
      }

      const cohort = created.cohortId ? (await loadCohortMap(tenantId, [created.cohortId])).get(created.cohortId) : null;
      return mapLeader(created, true, cohort);
    }),

  update: protectedProcedure
    .input(
      leaderInputSchema.partial().extend({
        tenantId: z.string().uuid(),
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const existing = await db.query.hubAlumniLeaders.findFirst({
        where: and(eq(hubAlumniLeaders.id, input.id), eq(hubAlumniLeaders.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alumni leader not found" });
      }

      if (input.program?.trim()) {
        await assertTenantProgram(tenantId, input.program);
      }

      const patch: Partial<typeof hubAlumniLeaders.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.firstName !== undefined) patch.firstName = input.firstName.trim();
      if (input.lastName !== undefined) patch.lastName = input.lastName.trim();
      if (input.role !== undefined) patch.role = input.role.trim();
      if (input.organization !== undefined) patch.organization = input.organization?.trim() || null;
      if (input.cohortId !== undefined || input.cohortYear !== undefined) {
        const cohortFields = await resolveCohortFields(tenantId, {
          cohortId: input.cohortId,
          cohortYear: input.cohortYear,
        });
        patch.cohortId = cohortFields.cohortId;
        patch.cohortYear = cohortFields.cohortYear;
      }
      if (input.program !== undefined) patch.program = input.program?.trim() || null;
      if (input.region !== undefined) patch.region = input.region?.trim() || null;
      if (input.parentId !== undefined) patch.parentId = input.parentId;
      if (input.tier !== undefined) patch.tier = input.tier;
      if (input.email !== undefined) patch.email = input.email?.trim() || null;
      if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
      if (input.linkedinUrl !== undefined) patch.linkedinUrl = input.linkedinUrl?.trim() || null;
      if (input.isRepresentative !== undefined) {
        patch.isRepresentative = input.isRepresentative;
        patch.tier = input.isRepresentative ? 0 : (input.tier ?? existing.tier ?? 1);
      }
      if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      const [updated] = await db
        .update(hubAlumniLeaders)
        .set(patch)
        .where(and(eq(hubAlumniLeaders.id, input.id), eq(hubAlumniLeaders.tenantId, tenantId)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alumni leader not found" });
      }

      const cohort = updated.cohortId ? (await loadCohortMap(tenantId, [updated.cohortId])).get(updated.cohortId) : null;
      return mapLeader(updated, true, cohort);
    }),

  archive: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const [updated] = await db
        .update(hubAlumniLeaders)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(hubAlumniLeaders.id, input.id), eq(hubAlumniLeaders.tenantId, tenantId)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alumni leader not found" });
      }

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const [deleted] = await db
        .delete(hubAlumniLeaders)
        .where(and(eq(hubAlumniLeaders.id, input.id), eq(hubAlumniLeaders.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Alumni leader not found" });
      }

      return { success: true };
    }),
});
