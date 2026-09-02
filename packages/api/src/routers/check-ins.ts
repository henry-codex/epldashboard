import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, checkIns, fellows, placements } from "@epl-fellows-platform/db";
import { router, protectedProcedure } from "../index";
import { assertTenantAccess, resolveTenantId } from "../lib/tenant-access.js";
import { assertNetworkManager, isNetworkManager } from "../lib/network-access.js";
import { checkInEligibleCohortYears } from "../lib/cohort-stats.js";
function currentPeriod() {
  const now = new Date();
  return { periodMonth: now.getMonth() + 1, periodYear: now.getFullYear() };
}

function resolvePeriod(input: { periodMonth?: number; periodYear?: number }) {
  if (input.periodMonth !== undefined && input.periodYear !== undefined) {
    return { periodMonth: input.periodMonth, periodYear: input.periodYear };
  }
  return currentPeriod();
}

function mapCheckIn(row: typeof checkIns.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    fellowId: row.fellowId,
    placementId: row.placementId,
    periodMonth: row.periodMonth,
    periodYear: row.periodYear,
    status: row.status as "pending" | "submitted" | "overdue",
    submittedAt: row.submittedAt,
    stillAtPlacement: row.stillAtPlacement,
    locationConfirmed: row.locationConfirmed,
    mainActivities: row.mainActivities,
    highlights: row.highlights,
    challenges: row.challenges,
    supportNeeded: row.supportNeeded,
    careerMilestone: row.careerMilestone ?? false,
    milestoneDescription: row.milestoneDescription,
    daysWorked: row.daysWorked,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const submitInputSchema = z.object({
  tenantId: z.string().uuid(),
  fellowId: z.string().uuid(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2000).max(2100),
  placementId: z.string().uuid().optional(),
  stillAtPlacement: z.boolean().optional(),
  locationConfirmed: z.string().max(200).optional(),
  mainActivities: z.string().max(4000).optional(),
  highlights: z.string().max(4000).optional(),
  challenges: z.string().max(4000).optional(),
  supportNeeded: z.string().max(2000).optional(),
  careerMilestone: z.boolean().optional().default(false),
  milestoneDescription: z.string().max(2000).optional(),
  daysWorked: z.number().int().min(0).max(31).optional(),
});

function activeFellowFilters(tenantId: string, cohortYears: number[]) {
  return and(
    eq(fellows.tenantId, tenantId),
    eq(fellows.status, "active"),
    inArray(fellows.cohortYear, cohortYears),
  )!;
}

export const checkInsRouter = router({
  aggregates: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        periodMonth: z.number().int().min(1).max(12).optional(),
        periodYear: z.number().int().min(2000).max(2100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const { periodMonth, periodYear } = resolvePeriod(input);
      const cohortYears = await checkInEligibleCohortYears(tenantId);

      if (cohortYears.length === 0) {
        return {
          periodMonth,
          periodYear,
          activeFellows: 0,
          submitted: 0,
          pending: 0,
          complianceRate: 0,
        };
      }

      const fellowWhere = activeFellowFilters(tenantId, cohortYears);

      const [activeRow, submittedRow] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(fellows)
          .where(fellowWhere),
        db
          .select({ count: sql<number>`count(distinct ${fellows.id})::int` })
          .from(fellows)
          .innerJoin(
            checkIns,
            and(
              eq(checkIns.fellowId, fellows.id),
              eq(checkIns.tenantId, tenantId),
              eq(checkIns.periodMonth, periodMonth),
              eq(checkIns.periodYear, periodYear),
              or(eq(checkIns.status, "submitted"), sql`${checkIns.submittedAt} is not null`)!,
            ),
          )
          .where(fellowWhere),
      ]);

      const activeFellows = activeRow[0]?.count ?? 0;
      const submitted = submittedRow[0]?.count ?? 0;
      const pending = Math.max(0, activeFellows - submitted);
      const complianceRate = activeFellows > 0 ? Math.round((submitted / activeFellows) * 100) : 0;

      return {
        periodMonth,
        periodYear,
        activeFellows,
        submitted,
        pending,
        complianceRate,
      };
    }),

  roster: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        periodMonth: z.number().int().min(1).max(12).optional(),
        periodYear: z.number().int().min(2000).max(2100).optional(),
        search: z.string().max(120).optional(),
        status: z.enum(["all", "submitted", "pending"]).optional().default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!isNetworkManager(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to view the check-in roster",
        });
      }

      const tenantId = resolveTenantId(ctx, input.tenantId);
      await assertTenantAccess(ctx, tenantId);
      const { periodMonth, periodYear } = resolvePeriod(input);
      const cohortYears = await checkInEligibleCohortYears(tenantId);

      if (cohortYears.length === 0) {
        return { periodMonth, periodYear, items: [] };
      }

      const filters = [activeFellowFilters(tenantId, cohortYears)];
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
        .select({
          fellowId: fellows.id,
          firstName: fellows.firstName,
          lastName: fellows.lastName,
          email: fellows.email,
          program: fellows.program,
          checkInId: checkIns.id,
          checkInStatus: checkIns.status,
          submittedAt: checkIns.submittedAt,
          stillAtPlacement: checkIns.stillAtPlacement,
          locationConfirmed: checkIns.locationConfirmed,
          mainActivities: checkIns.mainActivities,
          highlights: checkIns.highlights,
          challenges: checkIns.challenges,
          supportNeeded: checkIns.supportNeeded,
          careerMilestone: checkIns.careerMilestone,
          milestoneDescription: checkIns.milestoneDescription,
          daysWorked: checkIns.daysWorked,
          placementId: checkIns.placementId,
          periodMonth: checkIns.periodMonth,
          periodYear: checkIns.periodYear,
          customFields: fellows.customFields,
          institution: placements.institution,
          roleTitle: placements.roleTitle,
          city: placements.city,
          currentPlacementId: placements.id,
        })
        .from(fellows)
        .leftJoin(
          checkIns,
          and(
            eq(checkIns.fellowId, fellows.id),
            eq(checkIns.tenantId, tenantId),
            eq(checkIns.periodMonth, periodMonth),
            eq(checkIns.periodYear, periodYear),
          ),
        )
        .leftJoin(
          placements,
          and(
            eq(placements.fellowId, fellows.id),
            eq(placements.tenantId, tenantId),
            eq(placements.isCurrent, true),
          ),
        )
        .where(and(...filters))
        .orderBy(desc(fellows.updatedAt));

      let items = rows.map((row) => {
        const isSubmitted = row.checkInStatus === "submitted" || row.submittedAt !== null;
        const custom = (row.customFields ?? {}) as Record<string, unknown>;
        const serviceOrg =
          typeof custom.service_organization === "string" ? custom.service_organization.trim() : "";
        const serviceCity =
          typeof custom.service_city === "string" ? custom.service_city.trim() : "";
        const serviceRegion =
          typeof custom.service_region === "string" ? custom.service_region.trim() : "";
        const servicePlace = serviceCity || serviceRegion;
        const serviceLocationLabel = serviceOrg
          ? `${serviceOrg}${servicePlace ? ` · ${servicePlace}` : ""}`
          : null;
        const placementLabel = row.institution
          ? `${row.institution}${row.city ? ` · ${row.city}` : ""}`
          : null;
        // Mid-program check-ins use Network "where they serve"; fall back to formal placement.
        const locationLabel = serviceLocationLabel ?? placementLabel;

        return {
          fellowId: row.fellowId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          program: row.program,
          placementLabel: locationLabel,
          serviceLocationLabel,
          formalPlacementLabel: placementLabel,
          currentPlacementId: row.currentPlacementId,
          servicePartnerId:
            typeof custom.service_partner_id === "string" && custom.service_partner_id.trim()
              ? custom.service_partner_id.trim()
              : null,
          checkIn: row.checkInId
            ? {
                id: row.checkInId,
                status: (isSubmitted ? "submitted" : row.checkInStatus ?? "pending") as "pending" | "submitted" | "overdue",
                submittedAt: row.submittedAt,
                stillAtPlacement: row.stillAtPlacement,
                locationConfirmed: row.locationConfirmed,
                mainActivities: row.mainActivities,
                highlights: row.highlights,
                challenges: row.challenges,
                supportNeeded: row.supportNeeded,
                careerMilestone: row.careerMilestone ?? false,
                milestoneDescription: row.milestoneDescription,
                daysWorked: row.daysWorked,
                placementId: row.placementId,
                periodMonth: row.periodMonth!,
                periodYear: row.periodYear!,
              }
            : null,
          isSubmitted,
        };
      });

      if (input.status === "submitted") {
        items = items.filter((item) => item.isSubmitted);
      } else if (input.status === "pending") {
        items = items.filter((item) => !item.isSubmitted);
      }

      return { periodMonth, periodYear, items };
    }),

  submit: protectedProcedure.input(submitInputSchema).mutation(async ({ ctx, input }) => {
    assertNetworkManager(ctx);
    const tenantId = resolveTenantId(ctx, input.tenantId);
    await assertTenantAccess(ctx, tenantId);

    const fellow = await db.query.fellows.findFirst({
      where: and(eq(fellows.id, input.fellowId), eq(fellows.tenantId, tenantId)),
    });
    if (!fellow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Fellow not found" });
    }
    if (fellow.status !== "active") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Check-ins can only be submitted for active fellows" });
    }

    const cohortYears = await checkInEligibleCohortYears(tenantId);
    if (!cohortYears.includes(fellow.cohortYear)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Check-ins only apply to active fellows in in-progress cohorts",
      });
    }

    let placementId = input.placementId;
    if (!placementId) {
      const current = await db.query.placements.findFirst({
        where: and(
          eq(placements.fellowId, input.fellowId),
          eq(placements.tenantId, tenantId),
          eq(placements.isCurrent, true),
        ),
      });
      placementId = current?.id;
    }

    const payload = {
      tenantId,
      fellowId: input.fellowId,
      placementId: placementId ?? null,
      periodMonth: input.periodMonth,
      periodYear: input.periodYear,
      status: "submitted" as const,
      submittedAt: new Date(),
      stillAtPlacement: input.stillAtPlacement ?? null,
      locationConfirmed: input.locationConfirmed?.trim() || null,
      mainActivities: input.mainActivities?.trim() || null,
      highlights: input.highlights?.trim() || null,
      challenges: input.challenges?.trim() || null,
      supportNeeded: input.supportNeeded?.trim() || null,
      careerMilestone: input.careerMilestone ?? false,
      milestoneDescription: input.milestoneDescription?.trim() || null,
      daysWorked: input.daysWorked ?? null,
      updatedAt: new Date(),
    };

    const existing = await db.query.checkIns.findFirst({
      where: and(
        eq(checkIns.tenantId, tenantId),
        eq(checkIns.fellowId, input.fellowId),
        eq(checkIns.periodMonth, input.periodMonth),
        eq(checkIns.periodYear, input.periodYear),
      ),
    });

    if (existing) {
      const [updated] = await db
        .update(checkIns)
        .set(payload)
        .where(eq(checkIns.id, existing.id))
        .returning();
      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update check-in" });
      }
      return mapCheckIn(updated);
    }

    const [created] = await db.insert(checkIns).values(payload).returning();
    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create check-in" });
    }
    return mapCheckIn(created);
  }),
});
