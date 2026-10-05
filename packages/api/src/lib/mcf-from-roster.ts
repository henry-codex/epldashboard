/**
 * Derives MCF Stats from the Network roster: the MCF-funded fellows (isMcf)
 * of each cohort year, counted with the same rules the roster import uses
 * for cohort records. "To be recruited" is a planning target, not something
 * a roster can tell us, so it is not produced here.
 */

export type RosterFellow = {
  cohortYear: number | null;
  status: string;
  gender: string | null;
  isMcf: boolean | null;
  customFields: Record<string, unknown>;
};

export type RosterMcfStats = {
  startedCount: number;
  graduatedCount: number;
  maleCount: number;
  femaleCount: number;
  pwdCount: number;
  idpCount: number;
  scholarCount: number;
  attritionRatePercent: number;
  attritionMale: number | null;
  attritionFemale: number | null;
  attritionPwd: number | null;
  attritionIdp: number | null;
};

type Group = { total: number; left: number };

function rate(group: Group) {
  return group.total > 0 ? Math.round((group.left / group.total) * 100) : null;
}

export function mcfStatsFromRoster(fellows: RosterFellow[]): Map<number, RosterMcfStats> {
  const byYear = new Map<number, { all: Group; male: Group; female: Group; pwd: Group; idp: Group; graduated: number; scholars: number }>();

  for (const fellow of fellows) {
    if (!fellow.isMcf || fellow.cohortYear == null) continue;
    const acc = byYear.get(fellow.cohortYear) ?? {
      all: { total: 0, left: 0 },
      male: { total: 0, left: 0 },
      female: { total: 0, left: 0 },
      pwd: { total: 0, left: 0 },
      idp: { total: 0, left: 0 },
      graduated: 0,
      scholars: 0,
    };
    // "inactive" = left the fellowship before finishing.
    const left = fellow.status === "inactive" ? 1 : 0;
    const gender = fellow.gender?.trim().toLowerCase();
    const groups = [acc.all];
    if (gender?.startsWith("m")) groups.push(acc.male);
    if (gender?.startsWith("f")) groups.push(acc.female);
    if (fellow.customFields.has_disability === true) groups.push(acc.pwd);
    if (fellow.customFields.is_idp === true) groups.push(acc.idp);
    for (const group of groups) {
      group.total += 1;
      group.left += left;
    }
    if (fellow.status === "alumni") acc.graduated += 1;
    if (fellow.customFields.is_mcf_scholar === true) acc.scholars += 1;
    byYear.set(fellow.cohortYear, acc);
  }

  return new Map(
    [...byYear].map(([year, acc]) => [
      year,
      {
        startedCount: acc.all.total,
        graduatedCount: acc.graduated,
        maleCount: acc.male.total,
        femaleCount: acc.female.total,
        pwdCount: acc.pwd.total,
        idpCount: acc.idp.total,
        scholarCount: acc.scholars,
        attritionRatePercent: rate(acc.all) ?? 0,
        attritionMale: rate(acc.male),
        attritionFemale: rate(acc.female),
        attritionPwd: rate(acc.pwd),
        attritionIdp: rate(acc.idp),
      },
    ]),
  );
}
