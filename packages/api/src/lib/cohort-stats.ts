import { and, asc, eq, sql } from "drizzle-orm";
import { db, fellows, hubCohorts, placements } from "@epl-fellows-platform/db";

export type LiveCohortYearStats = {
  year: number;
  totalFellows: number;
  activeFellows: number;
  alumniFellows: number;
  inactiveFellows: number;
  placed: number;
};

export type MergedCohortStats = {
  id: string | null;
  label: string;
  cohortNumber: number | null;
  cohortYear: number | null;
  startsOn: string | null;
  endsOn: string | null;
  timelineProgress: number | null;
  daysRemaining: number | null;
  status: "in_progress" | "completed";
  statusLabel: string;
  startedCount: number | null;
  graduatedCount: number | null;
  placedCount: number | null;
  toBeRecruitedCount: number | null;
  maleCount: number | null;
  femaleCount: number | null;
  pwdCount: number | null;
  idpCount: number | null;
  scholarCount: number | null;
  attritionRatePercent: number | null;
  attritionMale: number | null;
  attritionFemale: number | null;
  attritionPwd: number | null;
  attritionIdp: number | null;
  isMcf: boolean;
  totalFellows: number;
  activeFellows: number;
  alumniFellows: number;
  inactiveFellows: number;
  placed: number;
  placementRate: number;
  graduationRate: number;
  inProgress: boolean;
  dataSource: "live" | "manual" | "hybrid";
  isVirtual: boolean;
  notes: string | null;
  sortOrder: number;
};

function toDateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function computeTimeline(startsOn: string | null, endsOn: string | null) {
  if (!startsOn || !endsOn) {
    return { timelineProgress: null as number | null, daysRemaining: null as number | null };
  }
  const start = new Date(`${startsOn}T00:00:00Z`).getTime();
  const end = new Date(`${endsOn}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { timelineProgress: null, daysRemaining: null };
  }
  const now = Date.now();
  const total = end - start;
  const elapsed = Math.min(total, Math.max(0, now - start));
  const timelineProgress = Math.round((elapsed / total) * 100);
  const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  return { timelineProgress, daysRemaining };
}

export function parseCohortNumber(label: string): number | null {
  const match = label.match(/(\d+)/);
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 10);
  return Number.isNaN(value) ? null : value;
}

export async function liveCohortStatsByYear(tenantId: string): Promise<Map<number, LiveCohortYearStats>> {
  const rows = await db
    .select({
      year: fellows.cohortYear,
      totalFellows: sql<number>`count(distinct ${fellows.id})::int`,
      activeFellows: sql<number>`count(distinct case when ${fellows.status} = 'active' then ${fellows.id} end)::int`,
      alumniFellows: sql<number>`count(distinct case when ${fellows.status} = 'alumni' then ${fellows.id} end)::int`,
      inactiveFellows: sql<number>`count(distinct case when ${fellows.status} = 'inactive' then ${fellows.id} end)::int`,
      placed: sql<number>`count(distinct case when ${placements.isCurrent} = true then ${fellows.id} end)::int`,
    })
    .from(fellows)
    .leftJoin(
      placements,
      and(eq(placements.fellowId, fellows.id), eq(placements.tenantId, tenantId)),
    )
    .where(eq(fellows.tenantId, tenantId))
    .groupBy(fellows.cohortYear);

  const map = new Map<number, LiveCohortYearStats>();
  for (const row of rows) {
    // Fellows with no cohortYear on file (e.g. imported without one) can't
    // be attributed to a year-based cohort bucket; they still count in the
    // overall status aggregates, just not here.
    if (row.year == null) continue;
    map.set(row.year, {
      year: row.year,
      totalFellows: row.totalFellows,
      activeFellows: row.activeFellows,
      alumniFellows: row.alumniFellows,
      inactiveFellows: row.inactiveFellows,
      placed: row.placed,
    });
  }
  return map;
}

function mergeCohortRow(
  row: {
    id: string;
    label: string;
    cohortNumber: number | null;
    cohortYear: number | null;
    startsOn: string | Date | null;
    endsOn: string | Date | null;
    status: string;
    startedCount: number | null;
    graduatedCount: number | null;
    placedCount: number | null;
    toBeRecruitedCount: number | null;
    maleCount: number | null;
    femaleCount: number | null;
    pwdCount: number | null;
    idpCount: number | null;
    scholarCount: number | null;
    attritionRatePercent: number | null;
    attritionMale: number | null;
    attritionFemale: number | null;
    attritionPwd: number | null;
    attritionIdp: number | null;
    isMcf: boolean | null;
    notes: string | null;
    sortOrder: number | null;
  },
  live?: LiveCohortYearStats,
): MergedCohortStats {
  const liveTotal = live?.totalFellows ?? 0;
  const liveActive = live?.activeFellows ?? 0;
  const liveAlumni = live?.alumniFellows ?? 0;
  const liveInactive = live?.inactiveFellows ?? 0;
  const livePlaced = live?.placed ?? 0;

  const hasManual = row.startedCount != null || row.graduatedCount != null || row.placedCount != null;
  const hasLive = liveTotal > 0;

  const totalFellows = row.startedCount != null ? row.startedCount : liveTotal;
  const alumniFellows = row.graduatedCount != null ? row.graduatedCount : liveAlumni;
  const placed = row.placedCount != null ? row.placedCount : livePlaced;
  const activeFellows = liveActive;
  const inactiveFellows = liveInactive;

  const status = (row.status === "completed" ? "completed" : "in_progress") as "in_progress" | "completed";
  const inProgress = status === "in_progress" || activeFellows > 0;
  const startsOn = toDateOnly(row.startsOn);
  const endsOn = toDateOnly(row.endsOn);
  const timeline = computeTimeline(startsOn, endsOn);

  let dataSource: MergedCohortStats["dataSource"] = "manual";
  if (hasLive && hasManual) dataSource = "hybrid";
  else if (hasLive) dataSource = "live";

  return {
    id: row.id,
    label: row.label,
    cohortNumber: row.cohortNumber,
    cohortYear: row.cohortYear,
    startsOn,
    endsOn,
    timelineProgress: timeline.timelineProgress,
    daysRemaining: timeline.daysRemaining,
    status,
    // A cohort with a planned headcount but nobody enrolled yet (no active
    // or alumni fellows) hasn't actually started — "In progress" overstates
    // it. Once anyone is active or has graduated, it's genuinely underway.
    statusLabel: inProgress
      ? activeFellows === 0 && alumniFellows === 0 && totalFellows > 0
        ? "Incoming"
        : "In progress"
      : "Completed",
    startedCount: row.startedCount,
    graduatedCount: row.graduatedCount,
    placedCount: row.placedCount,
    // These have no "live" equivalent to fall back to — always manual entry.
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
    totalFellows,
    activeFellows,
    alumniFellows,
    inactiveFellows,
    placed,
    placementRate: totalFellows > 0 ? Math.round((placed / totalFellows) * 100) : 0,
    graduationRate: totalFellows > 0 ? Math.round((alumniFellows / totalFellows) * 100) : 0,
    inProgress,
    dataSource,
    isVirtual: false,
    notes: row.notes,
    sortOrder: row.sortOrder ?? 0,
  };
}

export async function mergedCohortStats(tenantId: string): Promise<MergedCohortStats[]> {
  const [hubRows, liveMap] = await Promise.all([
    db
      .select()
      .from(hubCohorts)
      .where(eq(hubCohorts.tenantId, tenantId))
      .orderBy(asc(hubCohorts.sortOrder), sql`${hubCohorts.cohortNumber} desc nulls last`),
    liveCohortStatsByYear(tenantId),
  ]);

  const linkedYears = new Set<number>();
  const items: MergedCohortStats[] = hubRows.map((row) => {
    if (row.cohortYear != null) linkedYears.add(row.cohortYear);
    return mergeCohortRow(row, row.cohortYear != null ? liveMap.get(row.cohortYear) : undefined);
  });

  for (const [year, live] of liveMap) {
    if (linkedYears.has(year)) continue;
    items.push({
      id: null,
      label: `Cohort ${year}`,
      cohortNumber: null,
      cohortYear: year,
      startsOn: null,
      endsOn: null,
      timelineProgress: null,
      daysRemaining: null,
      status: live.activeFellows > 0 ? "in_progress" : "completed",
      statusLabel: live.activeFellows > 0 ? "In progress" : "Completed",
      startedCount: null,
      graduatedCount: null,
      placedCount: null,
      toBeRecruitedCount: null,
      maleCount: null,
      femaleCount: null,
      pwdCount: null,
      idpCount: null,
      scholarCount: null,
      attritionRatePercent: null,
      attritionMale: null,
      attritionFemale: null,
      attritionPwd: null,
      attritionIdp: null,
      isMcf: false,
      totalFellows: live.totalFellows,
      activeFellows: live.activeFellows,
      alumniFellows: live.alumniFellows,
      inactiveFellows: live.inactiveFellows,
      placed: live.placed,
      placementRate: live.totalFellows > 0 ? Math.round((live.placed / live.totalFellows) * 100) : 0,
      graduationRate: live.totalFellows > 0 ? Math.round((live.alumniFellows / live.totalFellows) * 100) : 0,
      inProgress: live.activeFellows > 0,
      dataSource: "live",
      isVirtual: true,
      notes: null,
      sortOrder: year,
    });
  }

  items.sort((a, b) => {
    // Active / in-progress cohorts stay at the top.
    if (a.inProgress !== b.inProgress) return a.inProgress ? -1 : 1;
    // Then highest cohort number first (Cohort 7 above Cohort 1).
    const numA = a.cohortNumber ?? a.cohortYear ?? a.sortOrder;
    const numB = b.cohortNumber ?? b.cohortYear ?? b.sortOrder;
    return numB - numA;
  });

  return items;
}

/** Cohort years where fellows still owe monthly check-ins (in-progress cohorts only). */
export async function checkInEligibleCohortYears(tenantId: string): Promise<number[]> {
  const items = await mergedCohortStats(tenantId);
  return items
    .filter((item) => item.cohortYear != null && item.status === "in_progress")
    .map((item) => item.cohortYear!);
}

/** @deprecated use mergedCohortStats */
export async function cohortStatsByYear(tenantId: string) {
  const liveMap = await liveCohortStatsByYear(tenantId);
  return [...liveMap.values()]
    .sort((a, b) => b.year - a.year)
    .map((row) => ({
      year: row.year,
      totalFellows: row.totalFellows,
      activeFellows: row.activeFellows,
      alumniFellows: row.alumniFellows,
      inactiveFellows: row.inactiveFellows,
      placed: row.placed,
      placementRate: row.totalFellows > 0 ? Math.round((row.placed / row.totalFellows) * 100) : 0,
      graduationRate: row.totalFellows > 0 ? Math.round((row.alumniFellows / row.totalFellows) * 100) : 0,
      inProgress: row.activeFellows > 0,
    }));
}
