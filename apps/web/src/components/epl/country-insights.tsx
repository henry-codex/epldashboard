"use client";

import {
  IconTarget,
  IconTrendingDown,
  IconTrendingUp,
  IconMapPin,
  IconGenderBigender,
  IconHeartHandshake,
  IconCoin,
} from "@tabler/icons-react";

export type InsightCohort = {
  label: string;
  cohortYear: number | null;
  status: "in_progress" | "completed";
  isVirtual: boolean;
  isMcf: boolean;
  totalFellows: number;
  placed: number;
  placedCount: number | null;
  graduatedCount: number | null;
  toBeRecruitedCount: number | null;
  maleCount: number | null;
  femaleCount: number | null;
  pwdCount: number | null;
  idpCount: number | null;
  scholarCount: number | null;
  attritionRatePercent: number | null;
};

type Insight = {
  key: string;
  icon: React.ReactNode;
  accent: string;
  /** Muted, gray treatment for "not yet known" states — never dressed up as a real metric. */
  neutral?: boolean;
  stat: string;
  headline: string;
  detail: string;
};

function byYear(cohorts: InsightCohort[]) {
  return cohorts
    .filter((c) => !c.isVirtual && c.cohortYear != null)
    .sort((a, b) => a.cohortYear! - b.cohortYear!);
}

function pipelineInsight(cohorts: InsightCohort[], accent: string): Insight | null {
  const sorted = byYear(cohorts);
  const newest = [...sorted].reverse().find((c) => c.toBeRecruitedCount != null && c.toBeRecruitedCount > 0);
  if (!newest) return null;

  const target = newest.totalFellows + newest.toBeRecruitedCount!;
  const percent = Math.round((newest.totalFellows / target) * 100);
  const behind = 100 - percent;
  return {
    key: "pipeline",
    icon: <IconTarget size={18} />,
    accent,
    stat: `${behind}%`,
    headline: `${newest.label} is behind its recruitment target`,
    detail: `${newest.totalFellows} recruited of a ${target} target — ${newest.toBeRecruitedCount} still to go.`,
  };
}

function attritionInsight(cohorts: InsightCohort[]): Insight | null {
  const withRate = byYear(cohorts).filter((c) => c.attritionRatePercent != null);
  if (withRate.length === 0) return null;

  if (withRate.length === 1) {
    const c = withRate[0]!;
    return {
      key: "attrition",
      icon: <IconTrendingDown size={18} />,
      accent: "#E8A020",
      stat: `${c.attritionRatePercent}%`,
      headline: `${c.label} reported attrition`,
      detail: "Not enough completed cohorts yet to show a trend.",
    };
  }

  const first = withRate[0]!;
  const last = withRate[withRate.length - 1]!;
  const direction =
    last.attritionRatePercent === first.attritionRatePercent
      ? "Held steady"
      : last.attritionRatePercent! < first.attritionRatePercent!
        ? `Down from ${first.attritionRatePercent}%`
        : `Up from ${first.attritionRatePercent}%`;
  return {
    key: "attrition",
    icon:
      last.attritionRatePercent! <= first.attritionRatePercent! ? (
        <IconTrendingDown size={18} />
      ) : (
        <IconTrendingUp size={18} />
      ),
    accent: "#E8A020",
    stat: `${last.attritionRatePercent}%`,
    headline: `${direction} attrition`,
    detail: `Across the last ${withRate.length} cohorts reporting attrition.`,
  };
}

function retentionInsight(cohorts: InsightCohort[]): Insight | null {
  const completed = byYear(cohorts).filter((c) => c.status === "completed");
  // A cohort's retention is only "known" once a manager has actually entered
  // a retained count — placements default to unconfirmed (null) for alumni,
  // so treating that absence as a real 0% would manufacture a false stat.
  // No hub has this data yet, so — like every other insight here — this
  // stays silent rather than filling the panel with an empty placeholder.
  const measured = completed.filter((c) => c.placedCount != null);
  if (measured.length === 0) return null;

  const totalGraduated = measured.reduce((sum, c) => sum + (c.graduatedCount ?? c.totalFellows), 0);
  const totalPlaced = measured.reduce((sum, c) => sum + c.placed, 0);
  if (totalGraduated === 0) return null;

  const rate = Math.round((totalPlaced / totalGraduated) * 100);
  return {
    key: "retention",
    icon: <IconMapPin size={18} />,
    accent: "#2EC27E",
    stat: `${rate}%`,
    headline: "of graduates remain in placement",
    detail: `${totalPlaced} of ${totalGraduated} graduates across ${measured.length} confirmed cohort${measured.length === 1 ? "" : "s"}.`,
  };
}

function genderInsight(cohorts: InsightCohort[]): Insight | null {
  const withGender = byYear(cohorts).filter(
    (c) => c.maleCount != null && c.femaleCount != null && c.maleCount + c.femaleCount > 0,
  );
  if (withGender.length === 0) return null;

  const femalePct = (c: InsightCohort) => Math.round((c.femaleCount! / (c.maleCount! + c.femaleCount!)) * 100);
  const earliest = withGender[0]!;
  const latest = withGender[withGender.length - 1]!;

  if (withGender.length === 1 || earliest === latest) {
    return {
      key: "gender",
      icon: <IconGenderBigender size={18} />,
      accent: "#9B59B6",
      stat: `${femalePct(earliest)}%`,
      headline: `of ${earliest.label} is female`,
      detail: "Only one cohort has gender data recorded so far.",
    };
  }

  // Each cohort's OWN percentage, not a blended network figure — the
  // Summary panel's "% Female" is the blend across cohorts, and showing
  // the same word for a different calculation here would look like two
  // conflicting numbers rather than two different questions.
  const earliestPct = femalePct(earliest);
  const latestPct = femalePct(latest);
  const diff = latestPct - earliestPct;
  if (Math.abs(diff) < 3) {
    return {
      key: "gender",
      icon: <IconGenderBigender size={18} />,
      accent: "#9B59B6",
      stat: `~${latestPct}%`,
      headline: `female in each cohort, ${earliest.label} through ${latest.label}`,
      detail: "Each cohort's own gender split has stayed about the same.",
    };
  }
  return {
    key: "gender",
    icon: <IconGenderBigender size={18} />,
    accent: "#9B59B6",
    stat: `${latestPct}%`,
    headline: `female in ${latest.label}, vs ${earliestPct}% in ${earliest.label}`,
    detail: "Each cohort's own gender split — not a network-wide average.",
  };
}

function inclusionInsight(cohorts: InsightCohort[], accent: string): Insight | null {
  const relevant = byYear(cohorts);
  if (relevant.length === 0) return null;

  const sumWithCoverage = (key: "pwdCount" | "idpCount" | "scholarCount") => {
    const reporting = relevant.filter((c) => c[key] != null);
    if (reporting.length === 0) return null;
    return { total: reporting.reduce((sum, c) => sum + (c[key] ?? 0), 0), coverage: reporting.length };
  };

  const pwd = sumWithCoverage("pwdCount");
  const idp = sumWithCoverage("idpCount");
  const scholar = sumWithCoverage("scholarCount");
  if (!pwd && !idp && !scholar) return null;

  const parts = [
    pwd ? `${pwd.total} PWD${pwd.total === 1 ? "" : "s"}` : null,
    idp ? `${idp.total} IDP${idp.total === 1 ? "" : "s"}` : null,
    scholar ? `${scholar.total} Scholar${scholar.total === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  const maxCoverage = Math.max(pwd?.coverage ?? 0, idp?.coverage ?? 0, scholar?.coverage ?? 0);
  const totalCohorts = relevant.length;

  return {
    key: "inclusion",
    icon: <IconHeartHandshake size={18} />,
    accent,
    stat: parts[0] ?? "—",
    headline: parts.slice(1).length > 0 ? `+ ${parts.slice(1).join(", ")}` : "supported network-wide",
    detail:
      maxCoverage < totalCohorts
        ? `Based on the ${maxCoverage} of ${totalCohorts} cohorts that recorded this.`
        : `Across all ${totalCohorts} cohorts to date.`,
  };
}

function mcfShareInsight(cohorts: InsightCohort[]): Insight | null {
  const relevant = byYear(cohorts).filter((c) => c.totalFellows > 0);
  const total = relevant.reduce((sum, c) => sum + c.totalFellows, 0);
  if (total === 0) return null;

  const mcfTotal = relevant.filter((c) => c.isMcf).reduce((sum, c) => sum + c.totalFellows, 0);
  const pct = Math.round((mcfTotal / total) * 100);
  return {
    key: "mcf",
    icon: <IconCoin size={18} />,
    accent: "#3B8BEB",
    stat: `${pct}%`,
    headline: "of the network is Mastercard Foundation-funded",
    detail: `${mcfTotal} of ${total} fellows across all cohorts.`,
  };
}

export function CountryInsights({ cohorts, accent }: { cohorts: InsightCohort[]; accent: string }) {
  const insights = [
    pipelineInsight(cohorts, accent),
    attritionInsight(cohorts),
    retentionInsight(cohorts),
    genderInsight(cohorts),
    inclusionInsight(cohorts, accent),
    mcfShareInsight(cohorts),
  ].filter((i): i is Insight => i !== null);

  if (insights.length === 0) return null;

  return (
    <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
        Insights
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
        {insights.map((insight) => {
          const tone = insight.neutral ? "var(--emuted)" : insight.accent;
          return (
            <div
              key={insight.key}
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--eglass)",
                border: "1px solid var(--eborder)",
                display: "flex",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: insight.neutral ? "rgba(255,255,255,0.06)" : `${insight.accent}18`,
                  border: `1px solid ${insight.neutral ? "var(--eborder)" : `${insight.accent}30`}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tone,
                  flexShrink: 0,
                }}
              >
                {insight.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: insight.neutral ? "var(--emuted)" : "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>
                    {insight.stat}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.3 }}>
                    {insight.headline}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.4 }}>
                  {insight.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
