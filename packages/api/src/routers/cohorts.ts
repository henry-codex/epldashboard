import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, fellows, hubCohorts, placements } from "@epl-fellows-platform/db";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager, canViewNetworkRoster } from "../lib/network-access.js";
import { assertTenantProgram } from "../lib/program-access.js";
import { mergedCohortStats, parseCohortNumber } from "../lib/cohort-stats.js";
import { parseCsv, serializeCsv } from "../lib/csv.js";

const fellowStatusSchema = z.enum(["active", "alumni", "inactive"]);

const COHORT_MEMBER_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "program",
  "phone",
  "gender",
  "institution",
  "roleTitle",
  "city",
  "country",
] as const;

const cohortMemberInputSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  gender: z.string().max(40).optional(),
  program: z.string().min(1).max(120),
  institution: z.string().max(200).optional(),
  roleTitle: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
});

function assertCohortMemberEntry(
  cohort: typeof hubCohorts.$inferSelect,
): asserts cohort is typeof hubCohorts.$inferSelect & { cohortYear: number } {
  if (cohort.cohortYear == null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Link a cohort year before adding members" });
  }
  if (cohort.status !== "completed") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Add alumni members on completed cohorts only. Active fellows are managed in Network.",
    });
  }
}

function placementLabel(row: { institution: string | null; city: string | null; roleTitle?: string | null }) {
  if (!row.institution) return null;
  const parts = [row.institution];
  if (row.roleTitle) parts.push(row.roleTitle);
  if (row.city) parts.push(row.city);
  return parts.join(" · ");
}

function mapMember(
  row: typeof fellows.$inferSelect,
  placement?: { institution: string; city: string; roleTitle: string; country: string } | null,
) {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    gender: row.gender,
    program: row.program,
    status: row.status as "active" | "alumni" | "inactive",
    cohortYear: row.cohortYear,
    source: row.source,
    updatedAt: row.updatedAt,
    placementLabel: placement ? placementLabel(placement) : null,
    placementInstitution: placement?.institution ?? null,
    placementCity: placement?.city ?? null,
  };
}

async function loadCohort(tenantId: string, cohortId: string) {
  const cohort = await db.query.hubCohorts.findFirst({
    where: and(eq(hubCohorts.id, cohortId), eq(hubCohorts.tenantId, tenantId)),
  });
  if (!cohort) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Cohort not found" });
  }
  return cohort;
}

async function loadMemberPlacements(tenantId: string, fellowIds: string[]) {
  if (fellowIds.length === 0) return new Map<string, typeof placements.$inferSelect>();

  const rows = await db
    .select()
    .from(placements)
    .where(and(eq(placements.tenantId, tenantId), inArray(placements.fellowId, fellowIds)))
    .orderBy(desc(placements.isCurrent), desc(placements.startDate));

  const map = new Map<string, typeof placements.$inferSelect>();
  for (const row of rows) {
    if (!map.has(row.fellowId)) map.set(row.fellowId, row);
  }
  return map;
}

async function createAlumniPlacement(
  tenantId: string,
  fellowId: string,
  cohortYear: number,
  input: { institution: string; roleTitle: string; city: string; country: string },
) {
  await db.insert(placements).values({
    tenantId,
    fellowId,
    institution: input.institution.trim(),
    roleTitle: input.roleTitle.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
    startDate: `${cohortYear}-01-01`,
    endDate: `${cohortYear + 1}-12-31`,
    isCurrent: false,
  });
}

function hasPlacementInput(input: {
  institution?: string;
  roleTitle?: string;
  city?: string;
  country?: string;
}) {
  return [input.institution, input.roleTitle, input.city, input.country].some((value) => value?.trim());
}

function parsePlacementInput(input: {
  institution?: string;
  roleTitle?: string;
  city?: string;
  country?: string;
}) {
  const institution = input.institution?.trim() ?? "";
  const roleTitle = input.roleTitle?.trim() ?? "";
  const city = input.city?.trim() ?? "";
  const country = input.country?.trim() ?? "";
  if (!institution || !roleTitle || !city || !country) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Retention requires institution, role, city, and country",
    });
  }
  return { institution, roleTitle, city, country };
}

const cohortStatusSchema = z.enum(["in_progress", "completed"]);

const cohortInputSchema = z.object({
  label: z.string().min(1).max(80),
  cohortNumber: z.number().int().min(1).max(999).optional(),
  cohortYear: z.number().int().min(2000).max(2100).optional(),
  status: cohortStatusSchema,
  startsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable(),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable(),
  startedCount: z.number().int().min(0).max(10000).nullish(),
  graduatedCount: z.number().int().min(0).max(10000).nullish(),
  placedCount: z.number().int().min(0).max(10000).nullish(),
  notes: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
});

function mapCohort(row: typeof hubCohorts.$inferSelect, merged: Awaited<ReturnType<typeof mergedCohortStats>>[number] | null) {
  if (merged) return merged;
  const startsOn = row.startsOn ? String(row.startsOn).slice(0, 10) : null;
  const endsOn = row.endsOn ? String(row.endsOn).slice(0, 10) : null;
  return {
    id: row.id,
    label: row.label,
    cohortNumber: row.cohortNumber,
    cohortYear: row.cohortYear,
    startsOn,
    endsOn,
    timelineProgress: null as number | null,
    daysRemaining: null as number | null,
    status: row.status as "in_progress" | "completed",
    statusLabel: row.status === "completed" ? "Completed" : "In progress",
    startedCount: row.startedCount,
    graduatedCount: row.graduatedCount,
    placedCount: row.placedCount,
    totalFellows: row.startedCount ?? 0,
    activeFellows: 0,
    alumniFellows: row.graduatedCount ?? 0,
    inactiveFellows: 0,
    placed: row.placedCount ?? 0,
    placementRate: 0,
    graduationRate: 0,
    inProgress: row.status === "in_progress",
    dataSource: "manual" as const,
    isVirtual: false,
    notes: row.notes,
    sortOrder: row.sortOrder ?? 0,
  };
}

export const cohortsRouter = router({
  aggregates: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const items = await mergedCohortStats(tenantId);

      let totalFellows = 0;
      let totalPlaced = 0;
      let totalGraduated = 0;
      let inProgress = 0;

      for (const item of items) {
        totalFellows += item.totalFellows;
        totalPlaced += item.placed;
        totalGraduated += item.alumniFellows;
        if (item.inProgress) inProgress += 1;
      }

      return {
        cohortCount: items.length,
        totalFellows,
        totalPlaced,
        totalGraduated,
        inProgressCohorts: inProgress,
        fellowsInProgress: items.reduce((sum, item) => sum + item.activeFellows, 0),
      };
    }),

  list: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const items = await mergedCohortStats(tenantId);
      return { items };
    }),

  get: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), cohortId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const items = await mergedCohortStats(tenantId);
      const item = items.find((row) => row.id === input.cohortId);
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cohort not found" });
      }
      return item;
    }),

  create: protectedProcedure
    .input(cohortInputSchema.extend({ tenantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const label = input.label.trim();
      const cohortNumber = input.cohortNumber ?? parseCohortNumber(label);

      if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cohort end date must be on or after the start date",
        });
      }

      try {
        const [created] = await db
          .insert(hubCohorts)
          .values({
            tenantId,
            label,
            cohortNumber,
            cohortYear: input.cohortYear ?? null,
            status: input.status,
            startsOn: input.startsOn ?? null,
            endsOn: input.endsOn ?? null,
            startedCount: input.startedCount ?? null,
            graduatedCount: input.graduatedCount ?? null,
            placedCount: input.placedCount ?? null,
            notes: input.notes?.trim() || null,
            sortOrder: input.sortOrder ?? cohortNumber ?? 0,
          })
          .returning();

        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create cohort" });
        }

        const merged = (await mergedCohortStats(tenantId)).find((item) => item.id === created.id);
        return mapCohort(created, merged ?? null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create cohort";
        if (message.includes("hub_cohorts_tenant_label_idx") || message.includes("duplicate key")) {
          throw new TRPCError({ code: "CONFLICT", message: "A cohort with this label already exists in this hub" });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  update: protectedProcedure
    .input(
      cohortInputSchema.partial().extend({
        tenantId: z.string().uuid(),
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const existing = await db.query.hubCohorts.findFirst({
        where: and(eq(hubCohorts.id, input.id), eq(hubCohorts.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cohort not found" });
      }

      const patch: Partial<typeof hubCohorts.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.label !== undefined) {
        patch.label = input.label.trim();
        if (input.cohortNumber === undefined) {
          patch.cohortNumber = parseCohortNumber(input.label.trim());
        }
      }
      if (input.cohortNumber !== undefined) patch.cohortNumber = input.cohortNumber;
      if (input.cohortYear !== undefined) patch.cohortYear = input.cohortYear ?? null;
      if (input.status !== undefined) patch.status = input.status;
      if (input.startsOn !== undefined) patch.startsOn = input.startsOn ?? null;
      if (input.endsOn !== undefined) patch.endsOn = input.endsOn ?? null;
      if (input.startedCount !== undefined) patch.startedCount = input.startedCount;
      if (input.graduatedCount !== undefined) patch.graduatedCount = input.graduatedCount;
      if (input.placedCount !== undefined) patch.placedCount = input.placedCount;
      if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

      if (input.startsOn !== undefined || input.endsOn !== undefined) {
        const startsOn = input.startsOn !== undefined ? input.startsOn : existing.startsOn;
        const endsOn = input.endsOn !== undefined ? input.endsOn : existing.endsOn;
        const startStr = startsOn ? String(startsOn).slice(0, 10) : null;
        const endStr = endsOn ? String(endsOn).slice(0, 10) : null;
        if (startStr && endStr && endStr < startStr) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cohort end date must be on or after the start date",
          });
        }
      }

      try {
        const [updated] = await db
          .update(hubCohorts)
          .set(patch)
          .where(and(eq(hubCohorts.id, input.id), eq(hubCohorts.tenantId, tenantId)))
          .returning();

        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cohort not found" });
        }

        const merged = (await mergedCohortStats(tenantId)).find((item) => item.id === updated.id);
        return mapCohort(updated, merged ?? null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update cohort";
        if (message.includes("hub_cohorts_tenant_label_idx") || message.includes("duplicate key")) {
          throw new TRPCError({ code: "CONFLICT", message: "A cohort with this label already exists in this hub" });
        }
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const existing = await db.query.hubCohorts.findFirst({
        where: and(eq(hubCohorts.id, input.id), eq(hubCohorts.tenantId, tenantId)),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cohort not found" });
      }

      if (existing.cohortYear != null) {
        const linked = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(fellows)
          .where(and(eq(fellows.tenantId, tenantId), eq(fellows.cohortYear, existing.cohortYear)));

        if ((linked[0]?.count ?? 0) > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Cannot delete a cohort that still has fellows linked via cohort year. Reassign fellows first.",
          });
        }
      }

      const [deleted] = await db
        .delete(hubCohorts)
        .where(and(eq(hubCohorts.id, input.id), eq(hubCohorts.tenantId, tenantId)))
        .returning();

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cohort not found" });
      }

      return { success: true };
    }),

  members: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        cohortId: z.string().uuid(),
        search: z.string().max(120).optional(),
        status: fellowStatusSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!canViewNetworkRoster(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to view this cohort roster" });
      }

      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const cohort = await loadCohort(tenantId, input.cohortId);

      if (cohort.cohortYear == null) {
        return {
          cohort: { id: cohort.id, label: cohort.label, cohortYear: null, status: cohort.status },
          canImport: false,
          canAddMember: false,
          items: [] as ReturnType<typeof mapMember>[],
          total: 0,
        };
      }

      const canManageMembers = cohort.status === "completed";

      const filters = [eq(fellows.tenantId, tenantId), eq(fellows.cohortYear, cohort.cohortYear)];
      if (canManageMembers) {
        filters.push(eq(fellows.status, "alumni"));
      } else if (input.status) {
        filters.push(eq(fellows.status, input.status));
      } else {
        filters.push(eq(fellows.status, "active"));
      }
      if (input.search?.trim()) {
        const q = `%${input.search.trim()}%`;
        filters.push(
          or(
            ilike(fellows.firstName, q),
            ilike(fellows.lastName, q),
            ilike(fellows.email, q),
            ilike(fellows.program, q),
          )!,
        );
      }

      const rows = await db
        .select()
        .from(fellows)
        .where(and(...filters))
        .orderBy(desc(fellows.lastName), desc(fellows.firstName));

      const placementMap = await loadMemberPlacements(
        tenantId,
        rows.map((row) => row.id),
      );
      const items = rows.map((row) => mapMember(row, placementMap.get(row.id) ?? null));
      return {
        cohort: { id: cohort.id, label: cohort.label, cohortYear: cohort.cohortYear, status: cohort.status },
        canImport: canManageMembers,
        canAddMember: canManageMembers,
        items,
        total: items.length,
      };
    }),

  createMember: protectedProcedure
    .input(
      cohortMemberInputSchema.extend({
        tenantId: z.string().uuid(),
        cohortId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const cohort = await loadCohort(tenantId, input.cohortId);
      assertCohortMemberEntry(cohort);

      await assertTenantProgram(tenantId, input.program);

      try {
        const [created] = await db
          .insert(fellows)
          .values({
            tenantId,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email: input.email.trim().toLowerCase(),
            phone: input.phone?.trim() || null,
            gender: input.gender?.trim() || null,
            cohortYear: cohort.cohortYear!,
            program: input.program.trim(),
            status: "alumni",
            source: "manual",
          })
          .returning();

        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add cohort member" });
        }

        if (hasPlacementInput(input)) {
          const placement = parsePlacementInput(input);
          await createAlumniPlacement(tenantId, created.id, cohort.cohortYear!, placement);
        }

        const placementMap = await loadMemberPlacements(tenantId, [created.id]);
        return mapMember(created, placementMap.get(created.id) ?? null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add cohort member";
        if (message.includes("fellows_tenant_email_idx") || message.includes("duplicate key")) {
          throw new TRPCError({ code: "CONFLICT", message: "A fellow with this email already exists in this hub" });
        }
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  importMembers: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        cohortId: z.string().uuid(),
        csv: z.string().min(1).max(2_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const cohort = await loadCohort(tenantId, input.cohortId);
      assertCohortMemberEntry(cohort);

      const { headers, rows } = parseCsv(input.csv);
      if (!headers.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "CSV is empty or missing a header row" });
      }

      const required = ["firstName", "lastName", "email", "program"];
      const missing = required.filter((h) => !headers.includes(h));
      if (missing.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `CSV missing required columns: ${missing.join(", ")}`,
        });
      }

      let created = 0;
      let updated = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i]!;
        const rowNum = i + 2;

        try {
          const payload = {
            firstName: row.firstName?.trim() ?? "",
            lastName: row.lastName?.trim() ?? "",
            email: row.email?.trim().toLowerCase() ?? "",
            phone: row.phone?.trim() || null,
            gender: row.gender?.trim() || null,
            cohortYear: cohort.cohortYear,
            program: row.program?.trim() ?? "",
            status: "alumni" as const,
            source: "csv" as const,
            lastSyncedAt: new Date(),
          };

          if (!payload.firstName || !payload.lastName || !payload.email || !payload.program) {
            errors.push({ row: rowNum, message: "Missing required core fields" });
            continue;
          }

          try {
            await assertTenantProgram(tenantId, payload.program);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Invalid program";
            errors.push({ row: rowNum, message });
            continue;
          }

          const existing = await db.query.fellows.findFirst({
            where: and(eq(fellows.tenantId, tenantId), eq(fellows.email, payload.email)),
          });

          let fellowId: string;
          if (existing) {
            await db
              .update(fellows)
              .set({ ...payload, updatedAt: new Date() })
              .where(eq(fellows.id, existing.id));
            fellowId = existing.id;
            updated += 1;
          } else {
            const [inserted] = await db.insert(fellows).values({ tenantId, ...payload }).returning();
            if (!inserted) {
              errors.push({ row: rowNum, message: "Failed to create fellow record" });
              continue;
            }
            fellowId = inserted.id;
            created += 1;
          }

          if (hasPlacementInput(row)) {
            const placement = parsePlacementInput(row);
            const currentPlacement = await db.query.placements.findFirst({
              where: and(eq(placements.fellowId, fellowId), eq(placements.tenantId, tenantId)),
            });
            if (currentPlacement) {
              await db
                .update(placements)
                .set({
                  institution: placement.institution,
                  roleTitle: placement.roleTitle,
                  city: placement.city,
                  country: placement.country,
                  isCurrent: false,
                })
                .where(eq(placements.id, currentPlacement.id));
            } else {
              await createAlumniPlacement(tenantId, fellowId, cohort.cohortYear!, placement);
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Import failed";
          errors.push({ row: rowNum, message });
        }
      }

      return { created, updated, errors, cohortYear: cohort.cohortYear };
    }),

  exportMembers: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), cohortId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!canViewNetworkRoster(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to export this cohort roster" });
      }

      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const cohort = await loadCohort(tenantId, input.cohortId);

      if (cohort.cohortYear == null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Link a cohort year before exporting members" });
      }

      const rows = await db
        .select()
        .from(fellows)
        .where(and(eq(fellows.tenantId, tenantId), eq(fellows.cohortYear, cohort.cohortYear)))
        .orderBy(asc(fellows.lastName), asc(fellows.firstName));

      const placementMap = await loadMemberPlacements(
        tenantId,
        rows.map((row) => row.id),
      );

      const csvRows = rows.map((row) => {
        const placement = placementMap.get(row.id);
        return {
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          program: row.program,
          phone: row.phone ?? "",
          gender: row.gender ?? "",
          institution: placement?.institution ?? "",
          roleTitle: placement?.roleTitle ?? "",
          city: placement?.city ?? "",
          country: placement?.country ?? "",
        };
      });

      const slug = cohort.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return {
        filename: `${slug || "cohort"}-members.csv`,
        csv: serializeCsv([...COHORT_MEMBER_HEADERS], csvRows),
      };
    }),
});
