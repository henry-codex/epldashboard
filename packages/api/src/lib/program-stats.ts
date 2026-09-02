import { and, eq, sql } from "drizzle-orm";
import { db, checkIns, fellows, placements } from "@epl-fellows-platform/db";

export type ProgramFellowCounts = {
  activeFellows: number;
  alumniFellows: number;
  totalFellows: number;
};

export function normalizeProgramKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match fellow.program → hub program title (exact, then case/whitespace-insensitive). */
export function lookupProgramCounts(
  map: Map<string, ProgramFellowCounts>,
  title: string,
): ProgramFellowCounts | null {
  const exact = map.get(title);
  if (exact) return exact;

  const needle = normalizeProgramKey(title);
  for (const [key, value] of map) {
    if (normalizeProgramKey(key) === needle) return value;
  }
  return null;
}

export async function fellowCountsByProgram(tenantId: string) {
  const rows = await db
    .select({
      program: fellows.program,
      status: fellows.status,
      count: sql<number>`count(*)::int`,
    })
    .from(fellows)
    .where(eq(fellows.tenantId, tenantId))
    .groupBy(fellows.program, fellows.status);

  const map = new Map<string, ProgramFellowCounts>();

  for (const row of rows) {
    const current = map.get(row.program) ?? { activeFellows: 0, alumniFellows: 0, totalFellows: 0 };
    if (row.status === "active") current.activeFellows += row.count;
    if (row.status === "alumni") current.alumniFellows += row.count;
    current.totalFellows += row.count;
    map.set(row.program, current);
  }

  return map;
}

export async function checkInRatesByProgram(tenantId: string) {
  const now = new Date();
  const periodMonth = now.getMonth() + 1;
  const periodYear = now.getFullYear();

  const rows = await db
    .select({
      program: fellows.program,
      activeFellows: sql<number>`count(distinct ${fellows.id})::int`,
      submitted: sql<number>`count(distinct case when ${checkIns.status} = 'submitted' or ${checkIns.submittedAt} is not null then ${fellows.id} end)::int`,
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
    .where(and(eq(fellows.tenantId, tenantId), eq(fellows.status, "active")))
    .groupBy(fellows.program);

  const map = new Map<string, { checkInRate: number | null; submitted: number; activeFellows: number }>();

  for (const row of rows) {
    const hasData = row.submitted > 0;
    map.set(row.program, {
      activeFellows: row.activeFellows,
      submitted: row.submitted,
      checkInRate: row.activeFellows > 0 && hasData
        ? Math.round((row.submitted / row.activeFellows) * 100)
        : null,
    });
  }

  return map;
}

export async function placementRatesByProgram(tenantId: string) {
  const rows = await db
    .select({
      program: fellows.program,
      activeFellows: sql<number>`count(distinct ${fellows.id})::int`,
      placed: sql<number>`count(distinct case when ${placements.isCurrent} = true then ${fellows.id} end)::int`,
    })
    .from(fellows)
    .leftJoin(
      placements,
      and(eq(placements.fellowId, fellows.id), eq(placements.tenantId, tenantId)),
    )
    .where(and(eq(fellows.tenantId, tenantId), eq(fellows.status, "active")))
    .groupBy(fellows.program);

  const map = new Map<string, { placementRate: number | null; placed: number; activeFellows: number }>();

  for (const row of rows) {
    const hasData = row.placed > 0;
    map.set(row.program, {
      activeFellows: row.activeFellows,
      placed: row.placed,
      placementRate: row.activeFellows > 0 && hasData
        ? Math.round((row.placed / row.activeFellows) * 100)
        : null,
    });
  }

  return map;
}
