import { expect, it } from "vitest";
import { mcfStatsFromRoster, type RosterFellow } from "./mcf-from-roster";

const fellow = (overrides: Partial<RosterFellow>): RosterFellow => ({
  cohortYear: 2023,
  status: "alumni",
  gender: "Female",
  isMcf: true,
  customFields: {},
  ...overrides,
});

it("counts only MCF-funded fellows with a cohort year, per year", () => {
  const stats = mcfStatsFromRoster([
    fellow({}),
    fellow({ gender: "Male", customFields: { is_mcf_scholar: true, has_disability: true } }),
    fellow({ gender: "male", status: "inactive", customFields: { is_idp: true } }),
    fellow({ cohortYear: 2024, status: "active" }),
    fellow({ isMcf: false }),
    fellow({ cohortYear: null }),
  ]);

  expect([...stats.keys()].sort()).toEqual([2023, 2024]);
  expect(stats.get(2023)).toEqual({
    startedCount: 3,
    graduatedCount: 2,
    maleCount: 2,
    femaleCount: 1,
    pwdCount: 1,
    idpCount: 1,
    scholarCount: 1,
    attritionRatePercent: 33,
    attritionMale: 50,
    attritionFemale: 0,
    attritionPwd: 0,
    attritionIdp: 100,
  });
  expect(stats.get(2024)).toMatchObject({ startedCount: 1, graduatedCount: 0, attritionPwd: null, attritionIdp: null });
});
