import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, fellows, hubCohorts, hubCohortMcfStats, placements, tenants } from "@epl-fellows-platform/db";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager, canViewNetworkRoster } from "../lib/network-access.js";
import { assertTenantProgram } from "../lib/program-access.js";
import { mergedCohortStats, parseCohortNumber } from "../lib/cohort-stats.js";
import { parseCsv, serializeCsv } from "../lib/csv.js";
import { mcfStatsFromRoster } from "../lib/mcf-from-roster.js";
import { FELLOW_STATUSES, type FellowStatus } from "../lib/fellow-status.js";
import { parseCountryStatsSheet, detectStatsSheetKind } from "@epl-fellows-platform/db/lib/country-stats-import";

const fellowStatusSchema = z.enum(FELLOW_STATUSES);
// Blank form fields arrive as null: "not reported", distinct from a real zero.
const mcfCount = z.number().int().min(0).nullable();
const mcfPercent = z.number().int().min(0).max(100).nullable();

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
  placement?: { institution: string; city: string | null; roleTitle: string | null; country: string } | null,
) {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    gender: row.gender,
    program: row.program,
    status: row.status as FellowStatus,
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
  toBeRecruitedCount: z.number().int().min(0).max(10000).nullish(),
  maleCount: z.number().int().min(0).max(10000).nullish(),
  femaleCount: z.number().int().min(0).max(10000).nullish(),
  pwdCount: z.number().int().min(0).max(10000).nullish(),
  idpCount: z.number().int().min(0).max(10000).nullish(),
  scholarCount: z.number().int().min(0).max(10000).nullish(),
  attritionRatePercent: z.number().int().min(0).max(100).nullish(),
  attritionMale: z.number().int().min(0).max(100).nullish(),
  attritionFemale: z.number().int().min(0).max(100).nullish(),
  attritionPwd: z.number().int().min(0).max(100).nullish(),
  attritionIdp: z.number().int().min(0).max(100).nullish(),
  isMcf: z.boolean().optional(),
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
    statusLabel:
      row.status === "completed"
        ? "Completed"
        : (row.graduatedCount ?? 0) === 0 && (row.startedCount ?? 0) > 0
          ? "Incoming"
          : "In progress",
    startedCount: row.startedCount,
    graduatedCount: row.graduatedCount,
    placedCount: row.placedCount,
    toBeRecruitedCount: row.toBeRecruitedCount,
    maleCount: row.maleCount,
    femaleCount: row.femaleCount,
    pwdCount: row.pwdCount,
    idpCount: row.idpCount,
    scholarCount: row.scholarCount,
    attritionRatePercent: row.attritionRatePercent,
    attritionMale: row.attritionMale,
    attritionFemale: row.attritionFemale,
    attritionPwd: row.attritionPwd,
    attritionIdp: row.attritionIdp,
    isMcf: row.isMcf ?? false,
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
      let anyRetentionConfirmed = false;

      for (const item of items) {
        totalFellows += item.totalFellows;
        // Post-program retention only counts once a cohort has actually
        // completed and a manager has confirmed a retained count — item.placed
        // falls back to "currently has an active placement" for in-progress
        // cohorts, which is a different thing (in-program institution
        // assignment) and would otherwise inflate this into a false "Retained"
        // total made up entirely of fellows who haven't graduated yet.
        if (!item.inProgress && item.placedCount != null) {
          totalPlaced += item.placedCount;
          anyRetentionConfirmed = true;
        }
        totalGraduated += item.alumniFellows;
        if (item.inProgress) inProgress += 1;
      }

      return {
        cohortCount: items.length,
        totalFellows,
        totalPlaced: anyRetentionConfirmed ? totalPlaced : null,
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
            toBeRecruitedCount: input.toBeRecruitedCount ?? null,
            maleCount: input.maleCount ?? null,
            femaleCount: input.femaleCount ?? null,
            pwdCount: input.pwdCount ?? null,
            idpCount: input.idpCount ?? null,
            scholarCount: input.scholarCount ?? null,
            attritionRatePercent: input.attritionRatePercent ?? null,
            attritionMale: input.attritionMale ?? null,
            attritionFemale: input.attritionFemale ?? null,
            attritionPwd: input.attritionPwd ?? null,
            attritionIdp: input.attritionIdp ?? null,
            isMcf: input.isMcf ?? false,
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
      if (input.toBeRecruitedCount !== undefined) patch.toBeRecruitedCount = input.toBeRecruitedCount;
      if (input.maleCount !== undefined) patch.maleCount = input.maleCount;
      if (input.femaleCount !== undefined) patch.femaleCount = input.femaleCount;
      if (input.pwdCount !== undefined) patch.pwdCount = input.pwdCount;
      if (input.idpCount !== undefined) patch.idpCount = input.idpCount;
      if (input.scholarCount !== undefined) patch.scholarCount = input.scholarCount;
      if (input.attritionRatePercent !== undefined) patch.attritionRatePercent = input.attritionRatePercent;
      if (input.attritionMale !== undefined) patch.attritionMale = input.attritionMale;
      if (input.attritionFemale !== undefined) patch.attritionFemale = input.attritionFemale;
      if (input.attritionPwd !== undefined) patch.attritionPwd = input.attritionPwd;
      if (input.attritionIdp !== undefined) patch.attritionIdp = input.attritionIdp;
      if (input.isMcf !== undefined) patch.isMcf = input.isMcf;
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
        // Not completed yet — the roster is whoever Network already has for
        // this cohort year, active or incoming. Defaulting to "active" only
        // hid every fellow in a cohort that hasn't started (all "incoming"),
        // showing an empty list when Network actually has the full roster.
        filters.push(inArray(fellows.status, ["active", "incoming"]));
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
            // Store the hub's own spelling of the program title.
            payload.program = (await assertTenantProgram(tenantId, payload.program)).title;
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

  // Imports the workbook's "All Stats" tab — one file with every country's
  // cohort planning numbers stacked in blocks. A country manager uploads
  // this same file unedited; we read only the block matching their hub's
  // name (attrition rates and "Total to be Recruited" have no per-fellow
  // source, so they can only ever come from here). Counts that a fellow
  // roster import can already derive more accurately (male/female/pwd/idp/
  // scholar/started/graduated) are only overwritten on an existing cohort
  // when that field is still empty — a value already there is trusted as
  // real fellow-derived data and left alone, but a genuine gap (a cohort
  // record that predates any roster import) gets filled in rather than
  // staying blank forever just because the row already existed.
  importStats: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), csv: z.string().min(1).max(2_000_000) }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hub not found" });
      }

      // The two tabs look identical to the parser, so without this check an
      // MCF upload would silently overwrite the country-wide figures with
      // the Foundation-funded subset.
      if (detectStatsSheetKind(input.csv) === "mcf") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This is the MCF Stats sheet. Import it from the MCF Stats tab so it doesn't overwrite your country-wide figures.",
        });
      }

      const { cohorts: parsedRows, warnings } = parseCountryStatsSheet(input.csv, tenant.name);
      if (parsedRows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            warnings[0] ??
            `No cohort rows found for "${tenant.name}" in this file. Upload the workbook's All Stats sheet unedited.`,
        });
      }

      const existingCohorts = await db.query.hubCohorts.findMany({ where: eq(hubCohorts.tenantId, tenantId) });
      const byYear = new Map(existingCohorts.filter((c) => c.cohortYear != null).map((c) => [c.cohortYear!, c]));

      let created = 0;
      let updated = 0;

      for (const row of parsedRows) {
        const existing = byYear.get(row.cohortYear);
        if (existing) {
          const fillIfEmpty = <K extends keyof typeof existing>(key: K, value: (typeof existing)[K]) =>
            existing[key] == null ? value : undefined;

          const patch = {
            toBeRecruitedCount: row.toBeRecruitedCount,
            attritionRatePercent: row.attritionRatePercent,
            attritionMale: row.attritionMale,
            attritionFemale: row.attritionFemale,
            attritionPwd: row.attritionPwd,
            attritionIdp: row.attritionIdp,
            startedCount: fillIfEmpty("startedCount", row.startedCount),
            graduatedCount: fillIfEmpty("graduatedCount", row.graduatedCount),
            maleCount: fillIfEmpty("maleCount", row.maleCount),
            femaleCount: fillIfEmpty("femaleCount", row.femaleCount),
            pwdCount: fillIfEmpty("pwdCount", row.pwdCount),
            idpCount: fillIfEmpty("idpCount", row.idpCount),
            scholarCount: fillIfEmpty("scholarCount", row.scholarCount),
            updatedAt: new Date(),
          };
          const definedPatch = Object.fromEntries(
            Object.entries(patch).filter(([, v]) => v !== undefined),
          ) as Partial<typeof hubCohorts.$inferInsert>;

          await db.update(hubCohorts).set(definedPatch).where(eq(hubCohorts.id, existing.id));
          updated += 1;
        } else {
          await db.insert(hubCohorts).values({
            tenantId,
            label: row.label,
            cohortNumber: row.cohortNumber,
            cohortYear: row.cohortYear,
            status: row.lifecycleStatus === "alumni" ? "completed" : "in_progress",
            sortOrder: row.cohortYear,
            startedCount: row.startedCount,
            graduatedCount: row.graduatedCount,
            toBeRecruitedCount: row.toBeRecruitedCount,
            maleCount: row.maleCount,
            femaleCount: row.femaleCount,
            pwdCount: row.pwdCount,
            idpCount: row.idpCount,
            scholarCount: row.scholarCount,
            attritionRatePercent: row.attritionRatePercent,
            attritionMale: row.attritionMale,
            attritionFemale: row.attritionFemale,
            attritionPwd: row.attritionPwd,
            attritionIdp: row.attritionIdp,
          });
          created += 1;
        }
      }

      return { created, updated, warnings };
    }),

  /** The Foundation's own reported figures per cohort (MCF_Stats tab). */
  mcfStats: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const rows = await db
        .select({
          id: hubCohortMcfStats.id,
          cohortId: hubCohorts.id,
          label: hubCohorts.label,
          cohortYear: hubCohorts.cohortYear,
          status: hubCohorts.status,
          startedCount: hubCohortMcfStats.startedCount,
          graduatedCount: hubCohortMcfStats.graduatedCount,
          toBeRecruitedCount: hubCohortMcfStats.toBeRecruitedCount,
          maleCount: hubCohortMcfStats.maleCount,
          femaleCount: hubCohortMcfStats.femaleCount,
          pwdCount: hubCohortMcfStats.pwdCount,
          idpCount: hubCohortMcfStats.idpCount,
          scholarCount: hubCohortMcfStats.scholarCount,
          attritionRatePercent: hubCohortMcfStats.attritionRatePercent,
          attritionMale: hubCohortMcfStats.attritionMale,
          attritionFemale: hubCohortMcfStats.attritionFemale,
          attritionPwd: hubCohortMcfStats.attritionPwd,
          attritionIdp: hubCohortMcfStats.attritionIdp,
          // The country-wide figure for the same cohort, so the UI can show
          // where the Foundation's slice differs from the hub's own total.
          hubStartedCount: hubCohorts.startedCount,
        })
        .from(hubCohortMcfStats)
        .innerJoin(hubCohorts, eq(hubCohortMcfStats.cohortId, hubCohorts.id))
        .where(eq(hubCohortMcfStats.tenantId, tenantId))
        .orderBy(desc(hubCohorts.cohortYear));

      return { items: rows };
    }),

  // Imports the workbook's "MCF_Stats" tab. Structurally identical to the
  // All Stats sheet but scoped to the Foundation-funded slice, so it lands
  // in its own table instead of overwriting the country-wide numbers. Only
  // cohorts that already exist for this hub are matched — this sheet is a
  // reporting overlay, not a source of new cohorts.
  importMcfStats: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), csv: z.string().min(1).max(2_000_000) }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hub not found" });
      }

      if (detectStatsSheetKind(input.csv) === "all") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This is the All Stats sheet, not the MCF one. Import it from the All Stats tab.",
        });
      }

      const { cohorts: parsedRows, warnings } = parseCountryStatsSheet(input.csv, tenant.name);
      if (parsedRows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            warnings[0] ??
            `No Mastercard Foundation cohorts found for "${tenant.name}" in this file.`,
        });
      }

      const existingCohorts = await db.query.hubCohorts.findMany({ where: eq(hubCohorts.tenantId, tenantId) });
      const byYear = new Map(existingCohorts.filter((c) => c.cohortYear != null).map((c) => [c.cohortYear!, c]));
      const existingMcf = await db.query.hubCohortMcfStats.findMany({
        where: eq(hubCohortMcfStats.tenantId, tenantId),
      });
      const mcfByCohortId = new Map(existingMcf.map((row) => [row.cohortId, row]));

      const skipped: string[] = [];
      let created = 0;
      let updated = 0;

      for (const row of parsedRows) {
        const cohort = byYear.get(row.cohortYear);
        if (!cohort) {
          skipped.push(`${row.label} (${row.cohortYear})`);
          continue;
        }

        const values = {
          startedCount: row.startedCount,
          graduatedCount: row.graduatedCount,
          toBeRecruitedCount: row.toBeRecruitedCount,
          maleCount: row.maleCount,
          femaleCount: row.femaleCount,
          pwdCount: row.pwdCount,
          idpCount: row.idpCount,
          scholarCount: row.scholarCount,
          attritionRatePercent: row.attritionRatePercent,
          attritionMale: row.attritionMale,
          attritionFemale: row.attritionFemale,
          attritionPwd: row.attritionPwd,
          attritionIdp: row.attritionIdp,
        };

        const existing = mcfByCohortId.get(cohort.id);
        if (existing) {
          await db
            .update(hubCohortMcfStats)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(hubCohortMcfStats.id, existing.id));
          updated += 1;
        } else {
          await db.insert(hubCohortMcfStats).values({ tenantId, cohortId: cohort.id, ...values });
          created += 1;
        }

        // Appearing in this sheet is itself the signal that the cohort is
        // Foundation-funded, so keep the hub cohort's flag in step.
        if (!cohort.isMcf) {
          await db.update(hubCohorts).set({ isMcf: true }).where(eq(hubCohorts.id, cohort.id));
        }
      }

      if (skipped.length > 0) {
        warnings.push(
          `No matching cohort in this hub for: ${skipped.join(", ")}. Add the cohort first, then re-import.`,
        );
      }

      return { created, updated, warnings };
    }),

  // Hand-entered MCF figures for one cohort — the same row the MCF_Stats
  // import writes, so either path can create it and the other can update it.
  saveMcfStats: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        cohortId: z.string().uuid(),
        startedCount: mcfCount,
        graduatedCount: mcfCount,
        toBeRecruitedCount: mcfCount,
        maleCount: mcfCount,
        femaleCount: mcfCount,
        pwdCount: mcfCount,
        idpCount: mcfCount,
        scholarCount: mcfCount,
        attritionRatePercent: mcfPercent,
        attritionMale: mcfPercent,
        attritionFemale: mcfPercent,
        attritionPwd: mcfPercent,
        attritionIdp: mcfPercent,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const cohort = await loadCohort(tenantId, input.cohortId);

      const { tenantId: _tenantId, cohortId: _cohortId, ...values } = input;
      const existing = await db.query.hubCohortMcfStats.findFirst({
        where: and(eq(hubCohortMcfStats.tenantId, tenantId), eq(hubCohortMcfStats.cohortId, cohort.id)),
      });
      if (existing) {
        await db
          .update(hubCohortMcfStats)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(hubCohortMcfStats.id, existing.id));
      } else {
        await db.insert(hubCohortMcfStats).values({ tenantId, cohortId: cohort.id, ...values });
      }

      // Same rule as the import: having MCF figures marks the cohort as MCF-funded.
      if (!cohort.isMcf) {
        await db.update(hubCohorts).set({ isMcf: true }).where(eq(hubCohorts.id, cohort.id));
      }

      return { created: !existing };
    }),

  // Fills MCF Stats from the Network roster's MCF-funded fellows, for hubs
  // whose MCF_Stats sheet doesn't exist or doesn't fit the import. Rows can
  // still be hand-edited afterwards; "to be recruited" is never touched.
  calculateMcfFromRoster: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const hubCohortRows = await db.query.hubCohorts.findMany({ where: eq(hubCohorts.tenantId, tenantId) });
      const cohortByYear = new Map(hubCohortRows.filter((c) => c.cohortYear != null).map((c) => [c.cohortYear!, c]));
      // Funding is often recorded per cohort rather than per person, so a
      // fellow counts as MCF if marked so, or if their whole cohort is.
      const mcfCohortYears = new Set(hubCohortRows.filter((c) => c.isMcf && c.cohortYear != null).map((c) => c.cohortYear!));

      const roster = await db
        .select({
          cohortYear: fellows.cohortYear,
          status: fellows.status,
          gender: fellows.gender,
          isMcf: fellows.isMcf,
          customFields: fellows.customFields,
        })
        .from(fellows)
        .where(eq(fellows.tenantId, tenantId));
      const mcfRoster = roster
        .map((row) => ({
          ...row,
          isMcf: Boolean(row.isMcf) || (row.cohortYear != null && mcfCohortYears.has(row.cohortYear)),
          customFields: (row.customFields ?? {}) as Record<string, unknown>,
        }))
        .filter((row) => row.isMcf);
      const statsByYear = mcfStatsFromRoster(mcfRoster);
      if (statsByYear.size === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Nothing on the Network roster says who is MCF-funded. Either switch on 'Mastercard Foundation funded' for the MCF cohorts " +
            "(All Stats → Edit), or import the roster with an 'MCF' Yes/No column, then calculate again.",
        });
      }
      const existingMcf = await db.query.hubCohortMcfStats.findMany({ where: eq(hubCohortMcfStats.tenantId, tenantId) });
      const mcfByCohortId = new Map(existingMcf.map((row) => [row.cohortId, row]));

      let created = 0;
      let updated = 0;
      const skippedYears: number[] = [];
      for (const [year, values] of [...statsByYear].sort(([a], [b]) => a - b)) {
        const cohort = cohortByYear.get(year);
        if (!cohort) {
          skippedYears.push(year);
          continue;
        }
        const existing = mcfByCohortId.get(cohort.id);
        if (existing) {
          await db.update(hubCohortMcfStats).set({ ...values, updatedAt: new Date() }).where(eq(hubCohortMcfStats.id, existing.id));
          updated += 1;
        } else {
          await db.insert(hubCohortMcfStats).values({ tenantId, cohortId: cohort.id, ...values });
          created += 1;
        }
        if (!cohort.isMcf) {
          await db.update(hubCohorts).set({ isMcf: true }).where(eq(hubCohorts.id, cohort.id));
        }
      }

      const warnings =
        skippedYears.length > 0
          ? [`No cohort for ${skippedYears.join(", ")} under All Stats, so those MCF fellows weren't counted. Add the cohort, then calculate again.`]
          : [];
      return { created, updated, fellowsCounted: mcfRoster.filter((row) => row.cohortYear != null).length, warnings };
    }),

  deleteMcfStats: protectedProcedure
    .input(z.object({ tenantId: z.string().uuid(), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertNetworkManager(ctx);
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);

      const deleted = await db
        .delete(hubCohortMcfStats)
        .where(and(eq(hubCohortMcfStats.id, input.id), eq(hubCohortMcfStats.tenantId, tenantId)))
        .returning();
      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "MCF stats not found" });
      }
      return { ok: true };
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
          email: row.email ?? "",
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
