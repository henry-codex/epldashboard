"use client";

import { useState } from "react";
import {
  IconGenderBigender,
  IconAccessible,
  IconAward,
  IconTarget,
} from "@tabler/icons-react";
import type { InsightCohort } from "@/components/epl/country-insights";

export type McfStatRow = {
  label: string;
  cohortYear: number | null;
  startedCount: number | null;
  graduatedCount: number | null;
  toBeRecruitedCount: number | null;
  maleCount: number | null;
  femaleCount: number | null;
  pwdCount: number | null;
  idpCount: number | null;
  scholarCount: number | null;
};

type Row = {
  label: string;
  cohortYear: number | null;
  startedCount: number | null;
  graduatedCount: number | null;
  toBeRecruitedCount: number | null;
  maleCount: number | null;
  femaleCount: number | null;
  pwdCount: number | null;
  idpCount: number | null;
  scholarCount: number | null;
};

function cohortRangeLabel(rows: Row[]): string {
  const sorted = [...rows]
    .filter((r) => r.cohortYear != null)
    .sort((a, b) => a.cohortYear! - b.cohortYear!);
  if (sorted.length === 0) return "—";
  const first = sorted[0]!.label;
  const last = sorted[sorted.length - 1]!.label;
  return first === last ? first : `${first} – ${last}`;
}

function sumField(rows: Row[], key: keyof Row): { total: number; coverage: number } | null {
  const reporting = rows.filter((r) => r[key] != null);
  if (reporting.length === 0) return null;
  return { total: reporting.reduce((sum, r) => sum + (r[key] as number), 0), coverage: reporting.length };
}

function Stat({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "var(--eglass)",
        border: "1px solid var(--eborder)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flex: "1 1 190px",
        maxWidth: 240,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: accent,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 3 }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)", opacity: 0.75, marginTop: 1 }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ rows, accent }: { rows: Row[]; accent: string }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: "20px 4px", fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        No cohort data recorded for this sheet yet.
      </div>
    );
  }

  const toBeRecruited = sumField(rows, "toBeRecruitedCount");
  // "Recruited so far" must come from the same cohort(s) that reported a
  // to-be-recruited number — summing startedCount across every cohort ever
  // run would blend in fully-closed past cohorts and inflate this figure.
  const recruitedForPipeline = sumField(
    rows.filter((r) => r.toBeRecruitedCount != null && r.toBeRecruitedCount > 0),
    "startedCount",
  );
  const male = sumField(rows, "maleCount");
  const female = sumField(rows, "femaleCount");
  const pwd = sumField(rows, "pwdCount");
  const scholar = sumField(rows, "scholarCount");

  const femalePct =
    male && female && male.total + female.total > 0
      ? Math.round((female.total / (male.total + female.total)) * 100)
      : null;

  const dash = "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent, fontFamily: "var(--font)" }}>
        {cohortRangeLabel(rows)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
        <Stat
          label="% Female"
          value={femalePct != null ? `${femalePct}%` : dash}
          hint={rows.length > 1 ? "Blended across all cohorts" : undefined}
          accent="#9B59B6"
          icon={<IconGenderBigender size={18} />}
        />
        <Stat
          label="PWDs"
          value={pwd ? String(pwd.total) : dash}
          hint={pwd && pwd.coverage < rows.length ? `${pwd.coverage} of ${rows.length} cohorts` : undefined}
          accent="#E8A020"
          icon={<IconAccessible size={18} />}
        />
        <Stat
          label="Foundation Scholars"
          value={scholar ? String(scholar.total) : dash}
          hint={scholar && scholar.coverage < rows.length ? `${scholar.coverage} of ${rows.length} cohorts` : undefined}
          accent="#2EC27E"
          icon={<IconAward size={18} />}
        />
        {toBeRecruited && toBeRecruited.total > 0 && (
          <Stat
            label="To be recruited"
            value={String(toBeRecruited.total)}
            hint={recruitedForPipeline ? `${recruitedForPipeline.total} recruited so far` : undefined}
            accent={accent}
            icon={<IconTarget size={18} />}
          />
        )}
      </div>
    </div>
  );
}

export function CountrySummaryPanel({
  cohorts,
  mcfRows,
  accent,
}: {
  cohorts: InsightCohort[];
  mcfRows: McfStatRow[];
  accent: string;
}) {
  const [tab, setTab] = useState<"all" | "mcf">("all");
  const allRows: Row[] = cohorts
    .filter((c) => !c.isVirtual)
    .map((c) => ({
      label: c.label,
      cohortYear: c.cohortYear,
      startedCount: c.totalFellows,
      graduatedCount: c.graduatedCount,
      toBeRecruitedCount: c.toBeRecruitedCount,
      maleCount: c.maleCount,
      femaleCount: c.femaleCount,
      pwdCount: c.pwdCount,
      idpCount: c.idpCount,
      scholarCount: c.scholarCount,
    }));

  if (allRows.length === 0 && mcfRows.length === 0) return null;

  return (
    <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          Summary
        </div>
        <div className="cs-tabs" style={{ "--tab-accent": accent } as React.CSSProperties}>
          <button type="button" className={`cs-tab${tab === "all" ? " is-active" : ""}`} onClick={() => setTab("all")}>
            All Stats
          </button>
          <button type="button" className={`cs-tab${tab === "mcf" ? " is-active" : ""}`} onClick={() => setTab("mcf")}>
            MCF Stats
          </button>
        </div>
      </div>
      <SummaryRow rows={tab === "all" ? allRows : mcfRows} accent={accent} />
    </div>
  );
}
