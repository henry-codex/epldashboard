import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, ilike, inArray, ne, or } from "drizzle-orm";
import { db, alumniExecutives, tenants } from "@epl-fellows-platform/db";
import { router, protectedProcedure, superAdminProcedure } from "../index";

const executiveInputSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.string().min(1).max(160),
  organization: z.string().max(160).optional(),
  tenantId: z.string().uuid().optional().nullable(),
  cohortLabel: z.string().max(80).optional(),
  parentId: z.string().uuid().optional().nullable(),
  email: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  linkedinUrl: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
});

type ExecutiveRow = typeof alumniExecutives.$inferSelect;
type TenantRow = typeof tenants.$inferSelect;

function hubMeta(row: TenantRow | undefined) {
  if (!row) return null;
  const settings = (row.settings ?? {}) as { flag?: string; color?: string; iso2?: string };
  return {
    id: row.id,
    name: row.name,
    countryCode: row.countryCode ?? "",
    flag: settings.flag ?? "",
    iso2: settings.iso2 ?? "",
    color: settings.color ?? "#4150A3",
  };
}

function mapExecutive(row: ExecutiveRow, hub: TenantRow | undefined) {
  const country = hubMeta(hub);
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    role: row.role,
    organization: row.organization,
    tenantId: row.tenantId,
    country,
    cohortLabel: row.cohortLabel,
    parentId: row.parentId,
    email: row.email,
    phone: row.phone,
    linkedinUrl: row.linkedinUrl,
    notes: row.notes,
    sortOrder: row.sortOrder ?? 0,
    status: row.status as "active" | "archived",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadHubMap(tenantIds: string[]) {
  const ids = [...new Set(tenantIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, TenantRow>();
  const rows = await db.select().from(tenants).where(inArray(tenants.id, ids));
  return new Map(rows.map((row) => [row.id, row]));
}

async function assertCountryHub(tenantId: string | null | undefined) {
  if (!tenantId) return null;
  const row = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  if (!row || row.countryCode === "GLOBAL") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Select a regional hub" });
  }
  return row;
}

async function assertParentExists(parentId: string | null | undefined, excludeId?: string) {
  if (!parentId) return;
  if (excludeId && parentId === excludeId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A board member cannot report to themselves" });
  }
  const parent = await db.query.alumniExecutives.findFirst({
    where: eq(alumniExecutives.id, parentId),
  });
  if (!parent || parent.status === "archived") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Reports-to person was not found" });
  }
}

async function wouldCreateCycle(id: string, parentId: string | null) {
  if (!parentId) return false;
  if (parentId === id) return true;
  const seen = new Set<string>([id]);
  let current: string | null = parentId;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    const [parent] = await db
      .select({ parentId: alumniExecutives.parentId })
      .from(alumniExecutives)
      .where(eq(alumniExecutives.id, current))
      .limit(1);
    current = parent?.parentId ?? null;
  }
  return false;
}

export const alumniExecutivesRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          includeArchived: z.boolean().optional().default(false),
          search: z.string().max(120).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const includeArchived = ctx.role === "super_admin" && Boolean(input?.includeArchived);
      const filters = includeArchived ? [] : [eq(alumniExecutives.status, "active")];

      if (input?.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        filters.push(
          or(
            ilike(alumniExecutives.firstName, q),
            ilike(alumniExecutives.lastName, q),
            ilike(alumniExecutives.role, q),
            ilike(alumniExecutives.organization, q),
            ilike(alumniExecutives.cohortLabel, q),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(alumniExecutives)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(
          asc(alumniExecutives.sortOrder),
          asc(alumniExecutives.lastName),
          asc(alumniExecutives.firstName),
        );

      const hubMap = await loadHubMap(rows.map((row) => row.tenantId).filter((id): id is string => Boolean(id)));

      return {
        items: rows.map((row) => mapExecutive(row, row.tenantId ? hubMap.get(row.tenantId) : undefined)),
        canManage: ctx.role === "super_admin",
      };
    }),

  create: superAdminProcedure.input(executiveInputSchema).mutation(async ({ input }) => {
    const hub = await assertCountryHub(input.tenantId);
    await assertParentExists(input.parentId);

    const [created] = await db
      .insert(alumniExecutives)
      .values({
        tenantId: hub?.id ?? null,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role.trim(),
        organization: input.organization?.trim() || null,
        cohortLabel: input.cohortLabel?.trim() || null,
        parentId: input.parentId ?? null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        linkedinUrl: input.linkedinUrl?.trim() || null,
        notes: input.notes?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
        status: "active",
      })
      .returning();

    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add board member" });
    }

    return mapExecutive(created, hub ?? undefined);
  }),

  update: superAdminProcedure
    .input(executiveInputSchema.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.alumniExecutives.findFirst({
        where: eq(alumniExecutives.id, input.id),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board member not found" });
      }

      const parentId = input.parentId === undefined ? existing.parentId : input.parentId;
      if (parentId) {
        await assertParentExists(parentId, input.id);
        if (await wouldCreateCycle(input.id, parentId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "That reports-to choice would create a loop" });
        }
      }

      const hub =
        input.tenantId === undefined
          ? existing.tenantId
            ? (await db.query.tenants.findFirst({ where: eq(tenants.id, existing.tenantId) })) ?? null
            : null
          : await assertCountryHub(input.tenantId);

      const patch: Partial<typeof alumniExecutives.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.firstName !== undefined) patch.firstName = input.firstName.trim();
      if (input.lastName !== undefined) patch.lastName = input.lastName.trim();
      if (input.role !== undefined) patch.role = input.role.trim();
      if (input.organization !== undefined) patch.organization = input.organization?.trim() || null;
      if (input.tenantId !== undefined) patch.tenantId = hub?.id ?? null;
      if (input.cohortLabel !== undefined) patch.cohortLabel = input.cohortLabel?.trim() || null;
      if (input.parentId !== undefined) patch.parentId = input.parentId;
      if (input.email !== undefined) patch.email = input.email?.trim() || null;
      if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
      if (input.linkedinUrl !== undefined) patch.linkedinUrl = input.linkedinUrl?.trim() || null;
      if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      const [updated] = await db
        .update(alumniExecutives)
        .set(patch)
        .where(eq(alumniExecutives.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board member not found" });
      }

      const nextHub = updated.tenantId
        ? (hub?.id === updated.tenantId ? hub : await db.query.tenants.findFirst({ where: eq(tenants.id, updated.tenantId) }))
        : undefined;

      return mapExecutive(updated, nextHub ?? undefined);
    }),

  archive: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(alumniExecutives)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(alumniExecutives.id, input.id), ne(alumniExecutives.status, "archived")))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board member not found" });
      }

      return { success: true };
    }),

  delete: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.alumniExecutives.findFirst({
        where: eq(alumniExecutives.id, input.id),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board member not found" });
      }

      await db
        .update(alumniExecutives)
        .set({ parentId: existing.parentId, updatedAt: new Date() })
        .where(eq(alumniExecutives.parentId, existing.id));

      const [deleted] = await db
        .delete(alumniExecutives)
        .where(eq(alumniExecutives.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Board member not found" });
      }

      return { success: true };
    }),
});
