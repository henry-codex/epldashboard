import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db, hubPartners } from "@epl-fellows-platform/db";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager } from "../lib/network-access.js";
import { livePartnerFellowCounts, syncPartnerFellowCounts } from "../lib/partner-stats.js";

const partnerStatusSchema = z.enum(["active", "inactive", "archived"]);
const orgKindSchema = z.enum(["placement", "partner"]);
const partnerTypeSchema = z.enum(["funder", "government", "ngo", "corporate", "other"]);

const partnerInputSchema = z.object({
  name: z.string().min(1).max(160),
  kind: orgKindSchema.optional().default("placement"),
  partnerType: partnerTypeSchema.optional(),
  contactPerson: z.string().max(120).optional(),
  contactEmail: z.string().max(120).optional(),
  contactPhone: z.string().max(40).optional(),
  region: z.string().max(120).optional(),
  fellowCount: z.number().int().min(0).max(10000).optional().default(0),
  status: partnerStatusSchema.optional().default("active"),
  notes: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
});

function orgLabel(kind: "placement" | "partner") {
  return kind === "partner" ? "partner" : "placement institution";
}

function mapPartner(
  row: typeof hubPartners.$inferSelect,
  includeContact: boolean,
  liveFellowCount?: number,
) {
  const kind = (row.kind === "partner" ? "partner" : "placement") as "placement" | "partner";
  const partnerType = row.partnerType as
    | "funder"
    | "government"
    | "ngo"
    | "corporate"
    | "other"
    | null;
  const base = {
    id: row.id,
    name: row.name,
    kind,
    partnerType,
    partnerTypeLabel:
      partnerType === "funder"
        ? "Funder"
        : partnerType === "government"
          ? "Government"
          : partnerType === "ngo"
            ? "NGO"
            : partnerType === "corporate"
              ? "Corporate"
              : partnerType === "other"
                ? "Other"
                : null,
    region: row.region,
    fellowCount: liveFellowCount ?? row.fellowCount ?? 0,
    status: row.status as "active" | "inactive" | "archived",
    statusLabel:
      row.status === "archived" ? "Archived" : row.status === "inactive" ? "Inactive" : "Active",
    sortOrder: row.sortOrder ?? 0,
    updatedAt: row.updatedAt,
  };

  return {
    ...base,
    contactPerson: includeContact ? row.contactPerson : null,
    contactEmail: includeContact ? row.contactEmail : null,
    contactPhone: includeContact ? row.contactPhone : null,
    notes: includeContact ? row.notes : null,
    createdAt: includeContact ? row.createdAt : null,
  };
}

export const partnersRouter = router({
  aggregates: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        kind: orgKindSchema.optional().default("placement"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const isPlatformViewer = ctx.role === "super_admin";
      const kind = input.kind;

      const { partnerRows, counts } = await livePartnerFellowCounts(tenantId, kind);

      let totalPartners = partnerRows.length;
      let activePartners = 0;
      let fellowsAtActivePartners = 0;
      let funders = 0;

      for (const row of partnerRows) {
        if (row.status === "active") {
          activePartners += 1;
          fellowsAtActivePartners += counts.get(row.id) ?? 0;
          if (row.partnerType === "funder") funders += 1;
        }
      }

      return {
        totalPartners: isPlatformViewer ? activePartners : totalPartners,
        activePartners,
        fellowsAtActivePartners,
        funders,
      };
    }),

  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        kind: orgKindSchema.optional().default("placement"),
        status: z.enum(["all", "active", "inactive", "archived"]).optional().default("all"),
        search: z.string().max(120).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const isPlatformViewer = ctx.role === "super_admin";
      const includeContact = !isPlatformViewer;
      const kind = input.kind;

      const liveCounts =
        kind === "placement" ? await syncPartnerFellowCounts(tenantId) : new Map<string, number>();

      const filters = [eq(hubPartners.tenantId, tenantId), eq(hubPartners.kind, kind)];
      if (isPlatformViewer) {
        filters.push(eq(hubPartners.status, "active"));
      } else if (input.status !== "all") {
        filters.push(eq(hubPartners.status, input.status));
      }

      if (input.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        filters.push(
          or(
            ilike(hubPartners.name, q),
            ilike(hubPartners.region, q),
            ilike(hubPartners.contactPerson, q),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(hubPartners)
        .where(and(...filters))
        .orderBy(asc(hubPartners.sortOrder), asc(hubPartners.name));

      return {
        items: rows.map((row) => mapPartner(row, includeContact, liveCounts.get(row.id) ?? 0)),
        readOnly: isPlatformViewer,
      };
    }),

  create: protectedProcedure
    .input(partnerInputSchema.extend({ tenantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const kind = input.kind ?? "placement";
      if (kind === "partner" && !input.partnerType) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Select a partner type" });
      }

      const name = input.name.trim();
      try {
        const [created] = await db
          .insert(hubPartners)
          .values({
            tenantId,
            name,
            kind,
            partnerType: kind === "partner" ? (input.partnerType ?? "other") : null,
            contactPerson: input.contactPerson?.trim() || null,
            contactEmail: input.contactEmail?.trim() || null,
            contactPhone: input.contactPhone?.trim() || null,
            region: input.region?.trim() || null,
            fellowCount: 0,
            status: input.status ?? "active",
            notes: input.notes?.trim() || null,
            sortOrder: input.sortOrder ?? 0,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create ${orgLabel(kind)}`,
          });
        }

        return mapPartner(created, true, 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : `Failed to create ${orgLabel(kind)}`;
        if (message.includes("hub_partners_tenant") || message.includes("duplicate key")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A ${orgLabel(kind)} with this name already exists in this hub`,
          });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  update: protectedProcedure
    .input(
      partnerInputSchema.partial().extend({
        tenantId: z.string().uuid(),
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const existing = await db.query.hubPartners.findFirst({
        where: and(eq(hubPartners.id, input.id), eq(hubPartners.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      }

      const kind = (existing.kind === "partner" ? "partner" : "placement") as "placement" | "partner";
      const patch: Partial<typeof hubPartners.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.partnerType !== undefined) {
        patch.partnerType = kind === "partner" ? input.partnerType : null;
      }
      if (input.contactPerson !== undefined) patch.contactPerson = input.contactPerson?.trim() || null;
      if (input.contactEmail !== undefined) patch.contactEmail = input.contactEmail?.trim() || null;
      if (input.contactPhone !== undefined) patch.contactPhone = input.contactPhone?.trim() || null;
      if (input.region !== undefined) patch.region = input.region?.trim() || null;
      if (input.status !== undefined) patch.status = input.status;
      if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      try {
        const [updated] = await db
          .update(hubPartners)
          .set(patch)
          .where(and(eq(hubPartners.id, input.id), eq(hubPartners.tenantId, tenantId)))
          .returning();

        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
        }

        const liveCounts =
          kind === "placement" ? await syncPartnerFellowCounts(tenantId) : new Map<string, number>();
        return mapPartner(updated, true, liveCounts.get(updated.id) ?? 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : `Failed to update ${orgLabel(kind)}`;
        if (message.includes("hub_partners_tenant") || message.includes("duplicate key")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A ${orgLabel(kind)} with this name already exists in this hub`,
          });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        id: z.string().uuid(),
        status: partnerStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const [updated] = await db
        .update(hubPartners)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(hubPartners.id, input.id), eq(hubPartners.tenantId, tenantId)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      }

      const kind = updated.kind === "partner" ? "partner" : "placement";
      const live = await livePartnerFellowCounts(tenantId, kind);
      return mapPartner(updated, true, live.counts.get(updated.id) ?? 0);
    }),

  delete: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const [deleted] = await db
        .delete(hubPartners)
        .where(and(eq(hubPartners.id, input.id), eq(hubPartners.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
      }

      return { success: true };
    }),
});
