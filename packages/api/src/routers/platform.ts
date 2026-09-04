import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";
import {
  db,
  fellows,
  hubAlumniLeaders,
  hubCohorts,
  hubCohortMcfStats,
  hubEvents,
  hubPartners,
  hubPrograms,
  placements,
  tenants,
  checkIns,
} from "@epl-fellows-platform/db";
import { protectedProcedure, router } from "../index";
import { checkInEligibleCohortYears, mergedCohortStats } from "../lib/cohort-stats.js";
import { computeProgramHealth } from "../lib/program-health.js";
import { countBreakdown, normalizeGender } from "../lib/demographics.js";
import {
  fellowCountsByProgram,
  lookupProgramCounts,
  normalizeProgramKey,
} from "../lib/program-stats.js";

type TenantMeta = {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  flag: string;
  iso2: string;
  color: string;
  isActive: boolean;
};

function mapTenantMeta(row: {
  id: string;
  name: string;
  slug: string;
  countryCode: string | null;
  settings: unknown;
  isActive: boolean | null;
}): TenantMeta {
  const settings = (row.settings ?? {}) as { flag?: string; color?: string; iso2?: string };
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    countryCode: row.countryCode ?? "",
    flag: settings.flag ?? "",
    iso2: settings.iso2 ?? "",
    color: settings.color ?? "#4150A3",
    isActive: row.isActive ?? true,
  };
}

async function checkInRateForTenant(tenantId: string): Promise<number | null> {
  const now = new Date();
  const periodMonth = now.getMonth() + 1;
  const periodYear = now.getFullYear();
  const cohortYears = await checkInEligibleCohortYears(tenantId);
  if (cohortYears.length === 0) return null;

  const fellowWhere = and(
    eq(fellows.tenantId, tenantId),
    eq(fellows.status, "active"),
    inArray(fellows.cohortYear, cohortYears),
  );

  const [activeRow, submittedRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(fellows).where(fellowWhere),
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
          sql`(${checkIns.status} = 'submitted' or ${checkIns.submittedAt} is not null)`,
        ),
      )
      .where(fellowWhere),
  ]);

  const active = activeRow[0]?.count ?? 0;
  if (active === 0) return null;
  return Math.round(((submittedRow[0]?.count ?? 0) / active) * 100);
}

async function programHealthForTenant(tenantId: string) {
  const [programRows, fellowByProgram] = await Promise.all([
    db.select().from(hubPrograms).where(eq(hubPrograms.tenantId, tenantId)),
    db
      .select({
        program: fellows.program,
        activeFellows: sql<number>`count(*) filter (where ${fellows.status} = 'active')::int`,
        totalFellows: sql<number>`count(*)::int`,
      })
      .from(fellows)
      .where(eq(fellows.tenantId, tenantId))
      .groupBy(fellows.program),
  ]);

  const counts = new Map(
    fellowByProgram.map((row) => [
      row.program,
      {
        activeFellows: row.activeFellows,
        alumniFellows: 0,
        totalFellows: row.totalFellows,
      },
    ]),
  );

  const programKeys = new Set(programRows.map((p) => normalizeProgramKey(p.title)));
  let unmatchedActive = 0;
  let unmatchedTotal = 0;
  for (const row of fellowByProgram) {
    if (!programKeys.has(normalizeProgramKey(row.program))) {
      unmatchedActive += row.activeFellows;
      unmatchedTotal += row.totalFellows;
    }
  }

  let onTrack = 0;
  let needsAttention = 0;
  let atRisk = 0;

  for (const row of programRows) {
    let c = lookupProgramCounts(counts, row.title) ?? {
      activeFellows: 0,
      alumniFellows: 0,
      totalFellows: 0,
    };

    // Single-program hubs: if fellow.program text doesn't match title, still count them.
    if (
      programRows.length === 1 &&
      c.activeFellows === 0 &&
      unmatchedActive > 0
    ) {
      c = {
        activeFellows: unmatchedActive,
        alumniFellows: 0,
        totalFellows: unmatchedTotal,
      };
    }

    const target = row.targetFellows ?? 0;
    const fillRate = target > 0 ? Math.round((c.activeFellows / target) * 100) : null;
    const health = computeProgramHealth({
      programStatus: row.status as "active" | "completed" | "planned",
      activeFellows: c.activeFellows,
      targetFellows: target,
      fillRate,
      checkInRate: null,
      placementRate: null,
      activeFellowsWithCheckIns: 0,
      activeFellowsWithPlacements: 0,
    });

    if (health.health === "on_track" || health.health === "completed" || health.health === "getting_started") {
      onTrack += 1;
    } else if (health.health === "needs_attention") {
      needsAttention += 1;
    } else if (health.health === "at_risk") {
      atRisk += 1;
    }
  }

  return {
    totalPrograms: programRows.length,
    activePrograms: programRows.filter((p) => p.status === "active").length,
    onTrack,
    needsAttention,
    atRisk,
  };
}

export const platformRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform overview is only available to Super Admins",
      });
    }

    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(and(ne(tenants.countryCode, "GLOBAL"), eq(tenants.isActive, true)));

    const metas = tenantRows.map(mapTenantMeta);
    const tenantIds = metas.map((t) => t.id);

    if (tenantIds.length === 0) {
      return {
        countries: [],
        totals: {
          countries: 0,
          activeFellows: 0,
          alumniLeaders: 0,
          totalNetwork: 0,
          placed: 0,
          placementRate: null as number | null,
          institutions: 0,
          avgCheckIn: null as number | null,
          programHealth: { onTrack: 0, needsAttention: 0, atRisk: 0, total: 0 },
        },
      };
    }

    const [fellowRows, partnerRows, placementRows] = await Promise.all([
      db
        .select({
          tenantId: fellows.tenantId,
          status: fellows.status,
          count: sql<number>`count(*)::int`,
        })
        .from(fellows)
        .where(inArray(fellows.tenantId, tenantIds))
        .groupBy(fellows.tenantId, fellows.status),
      db
        .select({
          tenantId: hubPartners.tenantId,
          count: sql<number>`count(*)::int`,
          fellowCount: sql<number>`coalesce(sum(${hubPartners.fellowCount}), 0)::int`,
        })
        .from(hubPartners)
        .where(
          and(
            inArray(hubPartners.tenantId, tenantIds),
            eq(hubPartners.status, "active"),
            eq(hubPartners.kind, "placement"),
          ),
        )
        .groupBy(hubPartners.tenantId),
      db
        .select({
          tenantId: placements.tenantId,
          count: sql<number>`count(distinct ${placements.fellowId})::int`,
        })
        .from(placements)
        .where(and(inArray(placements.tenantId, tenantIds), eq(placements.isCurrent, true)))
        .groupBy(placements.tenantId),
    ]);

    const fellowMap = new Map<string, { active: number; alumni: number }>();
    for (const row of fellowRows) {
      const current = fellowMap.get(row.tenantId) ?? { active: 0, alumni: 0 };
      if (row.status === "active") current.active = row.count;
      if (row.status === "alumni") current.alumni = row.count;
      fellowMap.set(row.tenantId, current);
    }

    const partnerMap = new Map(partnerRows.map((r) => [r.tenantId, { count: r.count, fellowCount: r.fellowCount }]));
    const placementMap = new Map(placementRows.map((r) => [r.tenantId, r.count]));

    const countries = await Promise.all(
      metas.map(async (meta) => {
        const fellowsStats = fellowMap.get(meta.id) ?? { active: 0, alumni: 0 };
        const partners = partnerMap.get(meta.id) ?? { count: 0, fellowCount: 0 };
        const placed = placementMap.get(meta.id) ?? 0;
        const placementDenom = fellowsStats.active > 0 ? fellowsStats.active : fellowsStats.active + fellowsStats.alumni;
        const placementRate =
          placementDenom > 0 ? Math.round((placed / placementDenom) * 100) : null;

        const [checkInRate, programHealth, cohortItems] = await Promise.all([
          checkInRateForTenant(meta.id),
          programHealthForTenant(meta.id),
          mergedCohortStats(meta.id),
        ]);

        const activeCohorts = cohortItems
          .filter((c) => c.inProgress || c.status === "in_progress")
          .map((c) => ({
            id: c.id,
            label: c.label,
            cohortYear: c.cohortYear,
            status: c.status,
            statusLabel: c.statusLabel,
            activeFellows: c.activeFellows,
            totalFellows: c.totalFellows,
            startsOn: c.startsOn,
            endsOn: c.endsOn,
            timelineProgress: c.timelineProgress,
            daysRemaining: c.daysRemaining,
          }));

        // "Alumni" here means graduates from cohort stats, and "Total Network"
        // is total ever recruited across all cohorts — matching the Country
        // Stats Summary panel each hub already sees. Most hubs never enter
        // individual alumni rows in the fellows roster, so the roster-based
        // count (fellowsStats.alumni) reads as a near-permanent false low
        // number here.
        const totalGraduated = cohortItems.reduce((sum, c) => sum + c.alumniFellows, 0);
        const totalRecruited = cohortItems.reduce((sum, c) => sum + c.totalFellows, 0);

        return {
          id: meta.id,
          name: meta.name,
          slug: meta.slug,
          countryCode: meta.countryCode,
          iso2: meta.iso2,
          flag: meta.flag,
          color: meta.color,
          activeFellows: fellowsStats.active,
          alumniLeaders: totalGraduated,
          totalNetwork: totalRecruited,
          placed,
          placementRate,
          institutions: partners.count,
          checkInRate,
          programHealth,
          activeCohorts,
          activeCohortCount: activeCohorts.length,
          cohortCount: cohortItems.length,
        };
      }),
    );

    countries.sort((a, b) => a.name.localeCompare(b.name));

    const totals = countries.reduce(
      (acc, c) => {
        acc.activeFellows += c.activeFellows;
        acc.alumniLeaders += c.alumniLeaders;
        acc.totalNetwork += c.totalNetwork;
        acc.placed += c.placed;
        acc.institutions += c.institutions;
        acc.programHealth.onTrack += c.programHealth.onTrack;
        acc.programHealth.needsAttention += c.programHealth.needsAttention;
        acc.programHealth.atRisk += c.programHealth.atRisk;
        acc.programHealth.total += c.programHealth.totalPrograms;
        if (c.checkInRate != null) {
          acc.checkInSum += c.checkInRate;
          acc.checkInCount += 1;
        }
        return acc;
      },
      {
        countries: countries.length,
        activeFellows: 0,
        alumniLeaders: 0,
        totalNetwork: 0,
        placed: 0,
        institutions: 0,
        checkInSum: 0,
        checkInCount: 0,
        programHealth: { onTrack: 0, needsAttention: 0, atRisk: 0, total: 0 },
      },
    );

    const placementRate =
      totals.activeFellows > 0 ? Math.round((totals.placed / totals.activeFellows) * 100) : null;
    const avgCheckIn =
      totals.checkInCount > 0 ? Math.round(totals.checkInSum / totals.checkInCount) : null;

    return {
      countries,
      totals: {
        countries: totals.countries,
        activeFellows: totals.activeFellows,
        alumniLeaders: totals.alumniLeaders,
        totalNetwork: totals.totalNetwork,
        placed: totals.placed,
        placementRate,
        institutions: totals.institutions,
        avgCheckIn,
        programHealth: totals.programHealth,
      },
    };
  }),

  network: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform network view is only available to Super Admins",
      });
    }

    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(and(ne(tenants.countryCode, "GLOBAL"), eq(tenants.isActive, true)));

    const metas = tenantRows.map(mapTenantMeta);
    const tenantIds = metas.map((t) => t.id);

    if (tenantIds.length === 0) {
      return {
        totals: {
          countries: 0,
          activeFellows: 0,
          alumniLeaders: 0,
          mcfFellows: 0,
          totalNetwork: 0,
        },
        countries: [] as Array<{
          id: string;
          name: string;
          color: string;
          flag: string;
          activeFellows: number;
          alumniLeaders: number;
          mcfFellows: number;
          totalNetwork: number;
        }>,
        gender: [] as Array<{ name: string; count: number }>,
        status: [] as Array<{ name: string; count: number }>,
        cohorts: [] as Array<{ year: string; intake: number }>,
        total: 0,
      };
    }

    const fellowRows = await db
      .select({
        tenantId: fellows.tenantId,
        gender: fellows.gender,
        status: fellows.status,
        cohortYear: fellows.cohortYear,
        customFields: fellows.customFields,
      })
      .from(fellows)
      .where(inArray(fellows.tenantId, tenantIds));

    const byTenant = new Map<string, { active: number; alumni: number; mcf: number }>();
    for (const row of fellowRows) {
      const current = byTenant.get(row.tenantId) ?? { active: 0, alumni: 0, mcf: 0 };
      if (row.status === "active") current.active += 1;
      if (row.status === "alumni") current.alumni += 1;
      // The per-person scholar flag from the sheet's own "Mastercard Scholar"
      // column — not fellows.isMcf, a cohort-wide funding assumption that can
      // mark every fellow in a cohort "Yes" even when only some are
      // individually designated scholars (and can exceed the hub's total).
      if ((row.customFields as Record<string, unknown> | null)?.is_mcf_scholar === true) current.mcf += 1;
      byTenant.set(row.tenantId, current);
    }

    const cohortsByTenant = await Promise.all(metas.map((meta) => mergedCohortStats(meta.id)));
    const cohortStatsByTenant = new Map(
      metas.map((meta, index) => {
        const items = cohortsByTenant[index]!;
        return [
          meta.id,
          {
            totalGraduated: items.reduce((sum, c) => sum + c.alumniFellows, 0),
            totalRecruited: items.reduce((sum, c) => sum + c.totalFellows, 0),
          },
        ] as const;
      }),
    );

    const countries = metas
      .map((meta) => {
        const stats = byTenant.get(meta.id) ?? { active: 0, alumni: 0, mcf: 0 };
        const cohortStats = cohortStatsByTenant.get(meta.id) ?? { totalGraduated: 0, totalRecruited: 0 };
        return {
          id: meta.id,
          name: meta.name,
          color: meta.color,
          flag: meta.flag,
          activeFellows: stats.active,
          alumniLeaders: cohortStats.totalGraduated,
          mcfFellows: stats.mcf,
          totalNetwork: cohortStats.totalRecruited,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const cohortMap = new Map<number | null, number>();
    for (const row of fellowRows) {
      cohortMap.set(row.cohortYear, (cohortMap.get(row.cohortYear) ?? 0) + 1);
    }
    const cohorts = [...cohortMap.entries()]
      .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
      .map(([year, intake]) => ({ year: year != null ? String(year) : "Unspecified", intake }));

    let activeFellows = 0;
    let alumniLeaders = 0;
    let mcfFellows = 0;
    let totalNetwork = 0;
    for (const country of countries) {
      activeFellows += country.activeFellows;
      alumniLeaders += country.alumniLeaders;
      mcfFellows += country.mcfFellows;
      totalNetwork += country.totalNetwork;
    }

    // "Alumni" here must match the cohort-based totalGraduated used for
    // alumniLeaders above, not the roster's status="alumni" row count — most
    // hubs never enter individual alumni rows, so the raw roster count reads
    // as a different (and usually much smaller) number than the "Alumni
    // Leaders" KPI shown elsewhere on the same page.
    const incomingCount = fellowRows.filter((row) => row.status === "incoming").length;
    const inactiveCount = fellowRows.filter((row) => row.status === "inactive").length;
    const status = [
      { name: "Active Fellows", count: activeFellows },
      { name: "Alumni", count: alumniLeaders },
      { name: "Incoming (not yet started)", count: incomingCount },
      ...(inactiveCount > 0 ? [{ name: "Inactive", count: inactiveCount }] : []),
    ].sort((a, b) => b.count - a.count);

    return {
      totals: {
        countries: countries.length,
        activeFellows,
        alumniLeaders,
        mcfFellows,
        totalNetwork,
      },
      countries,
      gender: countBreakdown(fellowRows.map((row) => normalizeGender(row.gender))),
      status,
      cohorts,
      total: fellowRows.length,
    };
  }),

  programPortfolio: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform program portfolio is only available to Super Admins",
      });
    }

    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(and(ne(tenants.countryCode, "GLOBAL"), eq(tenants.isActive, true)));

    const metas = tenantRows.map(mapTenantMeta);

    if (metas.length === 0) {
      return {
        totals: {
          totalTracks: 0,
          activeCycles: 0,
          totalIntake: 0,
          partnerNations: 0,
        },
        programs: [] as Array<{
          id: string;
          tenantId: string;
          title: string;
          status: "active" | "completed" | "planned";
          targetFellows: number;
          activeFellows: number;
          alumniFellows: number;
          totalFellows: number;
          startYear: number | null;
          progress: number;
          description: string | null;
          country: {
            id: string;
            name: string;
            flag: string;
            iso2: string;
            countryCode: string;
            color: string;
          };
        }>,
      };
    }

    const hubProgramsByTenant = await Promise.all(
      metas.map(async (meta) => {
        const [rows, countsMap] = await Promise.all([
          db
            .select()
            .from(hubPrograms)
            .where(eq(hubPrograms.tenantId, meta.id))
            .orderBy(asc(hubPrograms.sortOrder), asc(hubPrograms.title)),
          fellowCountsByProgram(meta.id),
        ]);

        return rows.map((row) => {
          let counts = lookupProgramCounts(countsMap, row.title) ?? {
            activeFellows: 0,
            alumniFellows: 0,
            totalFellows: 0,
          };

          if (rows.length === 1 && counts.activeFellows === 0 && countsMap.size > 0) {
            let activeFellows = 0;
            let alumniFellows = 0;
            let totalFellows = 0;
            for (const value of countsMap.values()) {
              activeFellows += value.activeFellows;
              alumniFellows += value.alumniFellows;
              totalFellows += value.totalFellows;
            }
            counts = { activeFellows, alumniFellows, totalFellows };
          }
          const target = row.targetFellows ?? 0;
          const fillRate =
            target > 0 ? Math.min(100, Math.round((counts.activeFellows / target) * 100)) : null;
          const progress =
            row.status === "completed" ? 100 : row.status === "planned" ? 10 : fillRate ?? 0;

          return {
            id: row.id,
            tenantId: meta.id,
            title: row.title,
            status: row.status as "active" | "completed" | "planned",
            targetFellows: target,
            activeFellows: counts.activeFellows,
            alumniFellows: counts.alumniFellows,
            totalFellows: counts.totalFellows,
            startYear: row.startYear,
            progress,
            description: row.description,
            country: {
              id: meta.id,
              name: meta.name,
              flag: meta.flag,
              iso2: meta.iso2,
              countryCode: meta.countryCode,
              color: meta.color,
            },
          };
        });
      }),
    );

    const programs = hubProgramsByTenant.flat().sort((a, b) => {
      const byCountry = a.country.name.localeCompare(b.country.name);
      if (byCountry !== 0) return byCountry;
      return a.title.localeCompare(b.title);
    });

    const activeCycles = programs.filter((p) => p.status === "active").length;
    const totalIntake = programs.reduce((sum, p) => sum + p.activeFellows, 0);

    return {
      totals: {
        totalTracks: programs.length,
        activeCycles,
        totalIntake,
        partnerNations: metas.length,
      },
      programs,
    };
  }),

  // The continental rollup of the same numbers each hub already sees on its
  // own Country Stats Summary panel — summed straight from hub_cohorts, not
  // a separate import. Nothing here is invented: a country with no cohort
  // data entered just contributes zeros, same as its own Summary panel would.
  countrySummary: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform country summary is only available to Super Admins",
      });
    }

    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(and(ne(tenants.countryCode, "GLOBAL"), eq(tenants.isActive, true)));

    const metas = tenantRows.map(mapTenantMeta);

    if (metas.length === 0) {
      return {
        countries: [] as Array<{
          id: string;
          name: string;
          color: string;
          flag: string;
          iso2: string;
          countryCode: string;
          cohortCount: number;
          totalRecruited: number;
          totalGraduated: number;
          femalePct: number | null;
          pwdTotal: number | null;
          pwdCoverage: number;
          scholarTotal: number | null;
          scholarCoverage: number;
          programs: Array<{ title: string; status: string }>;
        }>,
      };
    }

    const countries = await Promise.all(
      metas.map(async (meta) => {
        const [cohortItems, programRows] = await Promise.all([
          mergedCohortStats(meta.id),
          db
            .select({
              title: hubPrograms.title,
              status: hubPrograms.status,
            })
            .from(hubPrograms)
            .where(eq(hubPrograms.tenantId, meta.id)),
        ]);

        const real = cohortItems.filter((c) => !c.isVirtual);
        const sumField = (key: "totalFellows" | "alumniFellows" | "maleCount" | "femaleCount" | "pwdCount" | "scholarCount") => {
          const reporting = real.filter((c) => (key === "totalFellows" || key === "alumniFellows" ? true : c[key] != null));
          if (reporting.length === 0) return null;
          return {
            total: reporting.reduce((sum, c) => sum + (Number(c[key]) || 0), 0),
            coverage: reporting.length,
          };
        };

        const recruited = sumField("totalFellows");
        const graduated = sumField("alumniFellows");
        const male = sumField("maleCount");
        const female = sumField("femaleCount");
        const pwd = sumField("pwdCount");
        const scholar = sumField("scholarCount");
        const femalePct =
          male && female && male.total + female.total > 0
            ? Math.round((female.total / (male.total + female.total)) * 100)
            : null;

        return {
          id: meta.id,
          name: meta.name,
          color: meta.color,
          flag: meta.flag,
          iso2: meta.iso2,
          countryCode: meta.countryCode,
          cohortCount: real.length,
          totalRecruited: recruited?.total ?? 0,
          totalGraduated: graduated?.total ?? 0,
          femalePct,
          pwdTotal: pwd?.total ?? null,
          pwdCoverage: pwd?.coverage ?? 0,
          scholarTotal: scholar?.total ?? null,
          scholarCoverage: scholar?.coverage ?? 0,
          programs: programRows,
        };
      }),
    );

    countries.sort((a, b) => a.name.localeCompare(b.name));

    return { countries };
  }),

  // Same rollup as countrySummary, but scoped to the Mastercard Foundation's
  // own reported slice (hub_cohort_mcf_stats) — the workbook's "MCF_Stats"
  // sheet, not the country-wide "All Stats" one. There's deliberately no
  // "Target" field: no imported or entered data source has one, so it's
  // left out rather than guessed.
  mcfSummary: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform MCF summary is only available to Super Admins",
      });
    }

    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(and(ne(tenants.countryCode, "GLOBAL"), eq(tenants.isActive, true)));

    const metas = tenantRows.map(mapTenantMeta);

    if (metas.length === 0) {
      return {
        countries: [] as Array<{
          id: string;
          name: string;
          color: string;
          flag: string;
          iso2: string;
          countryCode: string;
          cohortRangeLabel: string;
          cohortCount: number;
          totalRecruited: number;
          totalGraduated: number;
          femalePct: number | null;
          pwdTotal: number | null;
          pwdCoverage: number;
          scholarTotal: number | null;
          scholarCoverage: number;
          toBeRecruited: number;
        }>,
      };
    }

    const countries = await Promise.all(
      metas.map(async (meta) => {
        const rows = await db
          .select({
            label: hubCohorts.label,
            cohortYear: hubCohorts.cohortYear,
            startedCount: hubCohortMcfStats.startedCount,
            graduatedCount: hubCohortMcfStats.graduatedCount,
            toBeRecruitedCount: hubCohortMcfStats.toBeRecruitedCount,
            maleCount: hubCohortMcfStats.maleCount,
            femaleCount: hubCohortMcfStats.femaleCount,
            pwdCount: hubCohortMcfStats.pwdCount,
            scholarCount: hubCohortMcfStats.scholarCount,
          })
          .from(hubCohortMcfStats)
          .innerJoin(hubCohorts, eq(hubCohortMcfStats.cohortId, hubCohorts.id))
          .where(eq(hubCohortMcfStats.tenantId, meta.id))
          .orderBy(asc(hubCohorts.cohortYear));

        const sumField = (key: "startedCount" | "graduatedCount" | "maleCount" | "femaleCount" | "pwdCount" | "scholarCount") => {
          const reporting = rows.filter((r) => r[key] != null);
          if (reporting.length === 0) return null;
          return { total: reporting.reduce((sum, r) => sum + (r[key] ?? 0), 0), coverage: reporting.length };
        };

        const recruited = sumField("startedCount");
        const graduated = sumField("graduatedCount");
        const male = sumField("maleCount");
        const female = sumField("femaleCount");
        const pwd = sumField("pwdCount");
        const scholar = sumField("scholarCount");
        const femalePct =
          male && female && male.total + female.total > 0
            ? Math.round((female.total / (male.total + female.total)) * 100)
            : null;
        const toBeRecruited = rows.reduce((sum, r) => sum + (r.toBeRecruitedCount ?? 0), 0);

        const cohortRangeLabel =
          rows.length === 0
            ? "—"
            : rows[0]!.label === rows[rows.length - 1]!.label
              ? rows[0]!.label
              : `${rows[0]!.label} – ${rows[rows.length - 1]!.label}`;

        return {
          id: meta.id,
          name: meta.name,
          color: meta.color,
          flag: meta.flag,
          iso2: meta.iso2,
          countryCode: meta.countryCode,
          cohortRangeLabel,
          cohortCount: rows.length,
          totalRecruited: recruited?.total ?? 0,
          totalGraduated: graduated?.total ?? 0,
          femalePct,
          pwdTotal: pwd?.total ?? null,
          pwdCoverage: pwd?.coverage ?? 0,
          scholarTotal: scholar?.total ?? null,
          scholarCoverage: scholar?.coverage ?? 0,
          toBeRecruited,
        };
      }),
    );

    countries.sort((a, b) => a.name.localeCompare(b.name));

    return { countries: countries.filter((c) => c.cohortCount > 0) };
  }),

  eventPortfolio: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform events view is only available to Super Admins",
      });
    }

    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(eq(tenants.isActive, true));

    const metas = tenantRows.map(mapTenantMeta);
    const countryMetas = metas.filter((m) => m.countryCode !== "GLOBAL");
    const metaById = new Map(metas.map((m) => [m.id, m]));
    const countryTenantIds = countryMetas.map((t) => t.id);

    const rows = await db
      .select()
      .from(hubEvents)
      .where(
        countryTenantIds.length > 0
          ? or(eq(hubEvents.isGlobal, true), inArray(hubEvents.tenantId, countryTenantIds))
          : eq(hubEvents.isGlobal, true),
      )
      .orderBy(asc(hubEvents.startsAt));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let ongoing = 0;
    let upcoming = 0;
    let past = 0;
    let thisMonth = 0;

    const events = rows
      .map((row) => {
        const meta = metaById.get(row.tenantId);
        const isGlobal = Boolean(row.isGlobal) || meta?.countryCode === "GLOBAL";

        const end = row.endsAt ?? row.startsAt;
        const isPast = end < now;
        const isOngoing = !isPast && row.startsAt <= now;
        const isUpcoming = !isPast && row.startsAt > now;
        const timeframe: "ongoing" | "upcoming" | "past" = isPast
          ? "past"
          : isOngoing
            ? "ongoing"
            : "upcoming";

        if (timeframe === "ongoing") ongoing += 1;
        if (timeframe === "upcoming") upcoming += 1;
        if (timeframe === "past") past += 1;
        if (row.startsAt >= monthStart && row.startsAt < monthEnd) thisMonth += 1;

        const country = isGlobal
          ? {
              id: meta?.id ?? "global",
              name: "EPL Global",
              flag: "",
              iso2: "GLOBAL",
              color: "#3B8BEB",
              isGlobal: true,
            }
          : {
              id: meta?.id ?? row.tenantId,
              name: meta?.name ?? "Country Hub",
              flag: meta?.flag ?? "",
              iso2: meta?.iso2 ?? "",
              color: meta?.color ?? "#3B8BEB",
              isGlobal: false,
            };

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
          isUpcoming: !isPast,
          isOngoing,
          isGlobal,
          timeframe,
          country,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    return {
      totals: {
        ongoing,
        upcoming,
        past,
        thisMonth,
        total: events.length,
        countries: countryMetas.length,
      },
      events,
    };
  }),

  cohortPortfolio: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform cohort portfolio is only available to Super Admins",
      });
    }

    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(and(ne(tenants.countryCode, "GLOBAL"), eq(tenants.isActive, true)));

    const metas = tenantRows.map(mapTenantMeta);

    if (metas.length === 0) {
      return {
        totals: { cohorts: 0, intake: 0, placed: 0, alumni: 0 },
        cohorts: [] as Array<{
          key: string;
          year: number | null;
          cohortNumber: number | null;
          label: string;
          status: "in_progress" | "completed";
          statusLabel: string;
          intake: number;
          active: number;
          alumni: number;
          placed: number;
          placementRate: number | null;
          countries: Array<{
            id: string;
            name: string;
            flag: string;
            iso2: string;
            color: string;
            intake: number;
            placed: number;
            alumni: number;
            label: string;
          }>;
        }>,
      };
    }

    type CountrySlice = {
      id: string;
      name: string;
      flag: string;
      iso2: string;
      color: string;
      intake: number;
      placed: number;
      alumni: number;
      label: string;
    };

    type CohortAgg = {
      key: string;
      year: number | null;
      cohortNumber: number | null;
      label: string;
      status: "in_progress" | "completed";
      intake: number;
      active: number;
      alumni: number;
      placed: number;
      countries: Map<string, CountrySlice>;
    };

    function cohortGroupKey(item: {
      cohortNumber: number | null;
      cohortYear: number | null;
      label: string;
    }) {
      if (item.cohortNumber != null) return `n:${item.cohortNumber}`;
      if (item.cohortYear != null) return `y:${item.cohortYear}`;
      return `l:${item.label.trim().toLowerCase()}`;
    }

    function preferLabel(current: string, next: string, cohortNumber: number | null, year: number | null) {
      // Prefer real hub labels like "Cohort 7" over virtual "Cohort 2026"
      const nextLooksVirtual = year != null && next.trim().toLowerCase() === `cohort ${year}`;
      const currentLooksVirtual = year != null && current.trim().toLowerCase() === `cohort ${year}`;
      if (currentLooksVirtual && !nextLooksVirtual) return next;
      if (!current && next) return next;
      if (cohortNumber != null && next.toLowerCase().includes(String(cohortNumber))) return next;
      return current || next;
    }

    const cohortMap = new Map<string, CohortAgg>();

    await Promise.all(
      metas.map(async (meta) => {
        const items = await mergedCohortStats(meta.id);
        for (const item of items) {
          if (item.totalFellows === 0 && item.activeFellows === 0 && !item.id) continue;

          const key = cohortGroupKey(item);
          const existing = cohortMap.get(key);
          if (!existing) {
            cohortMap.set(key, {
              key,
              year: item.cohortYear,
              cohortNumber: item.cohortNumber,
              label:
                item.label ||
                (item.cohortNumber != null
                  ? `Cohort ${item.cohortNumber}`
                  : item.cohortYear != null
                    ? `Cohort ${item.cohortYear}`
                    : "Cohort"),
              status: item.inProgress || item.status === "in_progress" ? "in_progress" : "completed",
              intake: item.totalFellows,
              active: item.activeFellows,
              alumni: item.alumniFellows,
              placed: item.placed,
              countries: new Map([
                [
                  meta.id,
                  {
                    id: meta.id,
                    name: meta.name,
                    flag: meta.flag,
                    iso2: meta.iso2,
                    color: meta.color,
                    intake: item.totalFellows,
                    placed: item.placed,
                    alumni: item.alumniFellows,
                    label: item.label,
                  },
                ],
              ]),
            });
            continue;
          }

          existing.intake += item.totalFellows;
          existing.active += item.activeFellows;
          existing.alumni += item.alumniFellows;
          existing.placed += item.placed;
          if (item.cohortYear != null && existing.year == null) existing.year = item.cohortYear;
          if (item.cohortNumber != null && existing.cohortNumber == null) {
            existing.cohortNumber = item.cohortNumber;
          }
          existing.label = preferLabel(
            existing.label,
            item.label,
            item.cohortNumber ?? existing.cohortNumber,
            item.cohortYear ?? existing.year,
          );
          if (item.inProgress || item.status === "in_progress") {
            existing.status = "in_progress";
          }

          const country = existing.countries.get(meta.id);
          if (country) {
            country.intake += item.totalFellows;
            country.placed += item.placed;
            country.alumni += item.alumniFellows;
          } else {
            existing.countries.set(meta.id, {
              id: meta.id,
              name: meta.name,
              flag: meta.flag,
              iso2: meta.iso2,
              color: meta.color,
              intake: item.totalFellows,
              placed: item.placed,
              alumni: item.alumniFellows,
              label: item.label,
            });
          }
        }
      }),
    );

    const cohorts = [...cohortMap.values()]
      .map((slice) => {
        const placementDenom = slice.active > 0 ? slice.active : slice.intake;
        const placementRate =
          placementDenom > 0 ? Math.round((slice.placed / placementDenom) * 100) : null;

        return {
          key: slice.key,
          year: slice.year,
          cohortNumber: slice.cohortNumber,
          label: slice.label,
          status: slice.status,
          statusLabel: slice.status === "in_progress" ? "In progress" : "Completed",
          intake: slice.intake,
          active: slice.active,
          alumni: slice.alumni,
          placed: slice.placed,
          placementRate,
          countries: [...slice.countries.values()].sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
      .sort((a, b) => {
        const numA = a.cohortNumber ?? a.year ?? 0;
        const numB = b.cohortNumber ?? b.year ?? 0;
        return numB - numA;
      });

    const totals = cohorts.reduce(
      (acc, c) => {
        acc.intake += c.intake;
        acc.placed += c.placed;
        acc.alumni += c.alumni;
        return acc;
      },
      { cohorts: cohorts.length, intake: 0, placed: 0, alumni: 0 },
    );

    return { totals, cohorts };
  }),

  alumniDashboard: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Continental alumni dashboard is only available to Super Admins",
      });
    }

    const tenantRows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        countryCode: tenants.countryCode,
        settings: tenants.settings,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(and(ne(tenants.countryCode, "GLOBAL"), eq(tenants.isActive, true)));

    const metas = tenantRows.map(mapTenantMeta);
    const tenantIds = metas.map((t) => t.id);

    const empty = {
      totals: {
        alumni: 0,
        liveAlumni: 0,
        countries: 0,
        fellowships: 0,
        leaders: 0,
        retained: 0,
        unassigned: 0,
        retentionRate: null as number | null,
      },
      countries: [] as Array<{
        id: string;
        name: string;
        flag: string;
        iso2: string;
        countryCode: string;
        color: string;
        alumni: number;
        liveAlumni: number;
        retained: number;
      }>,
      programs: [] as Array<{ name: string; alumni: number }>,
      growth: [] as Array<{ year: string; alumni: number; cumulative: number }>,
      retention: [] as Array<{ name: string; value: number; color: string }>,
    };

    if (tenantIds.length === 0) return empty;

    const [alumniRows, leaderRows, retainedRows] = await Promise.all([
      db
        .select({
          tenantId: fellows.tenantId,
          program: fellows.program,
          cohortYear: fellows.cohortYear,
          count: sql<number>`count(*)::int`,
        })
        .from(fellows)
        .where(and(inArray(fellows.tenantId, tenantIds), eq(fellows.status, "alumni")))
        .groupBy(fellows.tenantId, fellows.program, fellows.cohortYear),
      db
        .select({
          tenantId: hubAlumniLeaders.tenantId,
          count: sql<number>`count(*)::int`,
        })
        .from(hubAlumniLeaders)
        .where(and(inArray(hubAlumniLeaders.tenantId, tenantIds), eq(hubAlumniLeaders.status, "active")))
        .groupBy(hubAlumniLeaders.tenantId),
      db
        .select({
          tenantId: fellows.tenantId,
          count: sql<number>`count(distinct ${fellows.id})::int`,
        })
        .from(fellows)
        .innerJoin(
          placements,
          and(eq(placements.fellowId, fellows.id), eq(placements.isCurrent, true)),
        )
        .where(and(inArray(fellows.tenantId, tenantIds), eq(fellows.status, "alumni")))
        .groupBy(fellows.tenantId),
    ]);

    const cohortByTenant = await Promise.all(metas.map((meta) => mergedCohortStats(meta.id)));

    const liveByTenant = new Map<string, number>();
    const liveByTenantYear = new Map<string, number>();
    const retainedByTenant = new Map<string, number>();
    const programMap = new Map<string, number>();
    const yearMap = new Map<number, number>();

    for (const row of alumniRows) {
      liveByTenant.set(row.tenantId, (liveByTenant.get(row.tenantId) ?? 0) + row.count);
      const programName = row.program?.trim() || "Unassigned";
      programMap.set(programName, (programMap.get(programName) ?? 0) + row.count);
      if (row.cohortYear != null) {
        yearMap.set(row.cohortYear, (yearMap.get(row.cohortYear) ?? 0) + row.count);
        const key = `${row.tenantId}:${row.cohortYear}`;
        liveByTenantYear.set(key, (liveByTenantYear.get(key) ?? 0) + row.count);
      }
    }

    for (const row of retainedRows) {
      retainedByTenant.set(row.tenantId, row.count);
    }

    const countries = metas.map((meta, index) => {
      const liveAlumni = liveByTenant.get(meta.id) ?? 0;
      const cohortAlumni = cohortByTenant[index]!.reduce((sum, cohort) => sum + cohort.alumniFellows, 0);
      const alumni = Math.max(liveAlumni, cohortAlumni);
      const retained = retainedByTenant.get(meta.id) ?? 0;

      for (const cohort of cohortByTenant[index]!) {
        if (cohort.cohortYear == null || cohort.alumniFellows <= 0) continue;
        const liveForYear = liveByTenantYear.get(`${meta.id}:${cohort.cohortYear}`) ?? 0;
        const gap = Math.max(0, cohort.alumniFellows - liveForYear);
        if (gap > 0) {
          yearMap.set(cohort.cohortYear, (yearMap.get(cohort.cohortYear) ?? 0) + gap);
        }
      }

      return {
        id: meta.id,
        name: meta.name,
        flag: meta.flag,
        iso2: meta.iso2,
        countryCode: meta.countryCode,
        color: meta.color,
        alumni,
        liveAlumni,
        retained,
      };
    });

    countries.sort((a, b) => b.alumni - a.alumni || a.name.localeCompare(b.name));

    const programs = [...programMap.entries()]
      .map(([name, alumni]) => ({ name, alumni }))
      .sort((a, b) => b.alumni - a.alumni || a.name.localeCompare(b.name));

    const growthYears = [...yearMap.keys()].sort((a, b) => a - b);
    let running = 0;
    const growth = growthYears.map((year) => {
      running += yearMap.get(year) ?? 0;
      return { year: String(year), alumni: yearMap.get(year) ?? 0, cumulative: running };
    });

    const alumni = countries.reduce((sum, c) => sum + c.alumni, 0);
    const liveAlumni = countries.reduce((sum, c) => sum + c.liveAlumni, 0);
    const retained = countries.reduce((sum, c) => sum + c.retained, 0);
    const unassigned = Math.max(0, liveAlumni - retained);
    const retentionDenom = liveAlumni > 0 ? liveAlumni : alumni;
    const retentionRate =
      retentionDenom > 0 && liveAlumni > 0 ? Math.round((retained / liveAlumni) * 100) : null;
    const leaders = leaderRows.reduce((sum, row) => sum + row.count, 0);
    const countryNetworks = countries.filter((c) => c.alumni > 0).length;

    const retention = [
      { name: "Retained", value: retained, color: "#2EC27E" },
      { name: "Unassigned", value: unassigned, color: "rgba(255,255,255,0.25)" },
    ].filter((slice) => slice.value > 0);

    return {
      totals: {
        alumni,
        liveAlumni,
        countries: countryNetworks,
        fellowships: programs.length,
        leaders,
        retained,
        unassigned,
        retentionRate,
      },
      countries,
      programs,
      growth,
      retention,
    };
  }),
});
