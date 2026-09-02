"use client";

import { IconStack2, IconUsers, IconMapPin, IconSchool, IconClock } from "@tabler/icons-react";
import type { CohortTimelineItem } from "@/components/epl/cohorts-timeline";

type CardsProps = {
  cohortCount: number;
  totalAlumni: number;
  totalPlaced: number;
  totalFellows?: number;
  inProgressCohorts?: number;
  fellowsInProgress?: number;
  accent: string;
  showPipeline?: boolean;
};

export function CohortsMetricCards({
  cohortCount,
  totalAlumni,
  totalPlaced,
  totalFellows = 0,
  inProgressCohorts = 0,
  fellowsInProgress = 0,
  accent,
  showPipeline = false,
}: CardsProps) {
  const cards = showPipeline
    ? [
        { label: "Cohorts", value: cohortCount, hint: `${inProgressCohorts} in progress`, accent, icon: <IconStack2 size={20} /> },
        { label: "In progress", value: inProgressCohorts, hint: "Current classes", accent: "#E8A020", icon: <IconClock size={20} /> },
        { label: "Started", value: totalFellows, hint: "All cohorts", accent: "#3B8BEB", icon: <IconSchool size={20} /> },
        { label: "In fellowship", value: fellowsInProgress, hint: "Active now", accent, icon: <IconUsers size={20} /> },
        { label: "Alumni", value: totalAlumni, hint: "Graduated", accent: "#9B59B6", icon: <IconUsers size={20} /> },
        { label: "Retained", value: totalPlaced, hint: "After graduation", accent: "#2EC27E", icon: <IconMapPin size={20} /> },
      ]
    : [
        { label: "Cohorts", value: cohortCount, hint: undefined, accent, icon: <IconStack2 size={20} /> },
        { label: "Started", value: totalFellows, hint: undefined, accent: "#3B8BEB", icon: <IconSchool size={20} /> },
        { label: "Alumni", value: totalAlumni, hint: undefined, accent: "#9B59B6", icon: <IconUsers size={20} /> },
        { label: "Retained", value: totalPlaced, hint: undefined, accent: "#2EC27E", icon: <IconMapPin size={20} /> },
      ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: showPipeline ? "repeat(3, 1fr)" : "repeat(4, 1fr)",
        gap: 14,
      }}
    >
      {cards.map((k) => (
        <div key={k.label} className="gc" style={{ padding: 18, display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: `${k.accent}18`,
              border: `1px solid ${k.accent}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: k.accent,
            }}
          >
            {k.icon}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              {k.value}
            </div>
            <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{k.label}</div>
            {k.hint ? (
              <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>
                {k.hint}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function periodLabel(cohort: CohortTimelineItem) {
  if (cohort.startsOn && cohort.endsOn) return `${cohort.startsOn} → ${cohort.endsOn}`;
  if (cohort.cohortYear != null) return `Year ${cohort.cohortYear}`;
  return "—";
}

function dash(value: number | string, show: boolean) {
  return show ? value : "—";
}

export function CohortsBreakdownTable({
  cohorts,
  accent,
}: {
  cohorts: CohortTimelineItem[];
  accent: string;
}) {
  if (cohorts.length === 0) return null;

  const columns = "1.2fr 0.9fr 1.4fr 0.7fr 0.9fr 0.7fr 0.7fr 0.8fr 0.8fr";

  return (
    <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, overflowX: "auto" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          Cohort breakdown
        </div>
        <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 4 }}>
          Retention and graduation are shown after a cohort completes.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          gap: 8,
          padding: "0 10px",
          fontSize: 9,
          color: "var(--emuted)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontFamily: "var(--font)",
          minWidth: 860,
        }}
      >
        <span>Cohort</span>
        <span>Status</span>
        <span>Period</span>
        <span>Started</span>
        <span>In fellowship</span>
        <span>Alumni</span>
        <span>Retained</span>
        <span>Graduation</span>
        <span>Retention</span>
      </div>

      {cohorts.map((cohort) => {
        const completed = !cohort.inProgress;
        return (
          <div
            key={cohort.id ?? cohort.label}
            style={{
              display: "grid",
              gridTemplateColumns: columns,
              gap: 8,
              padding: "12px 10px",
              background: "var(--eglass)",
              borderRadius: 10,
              border: "1px solid var(--eborder)",
              alignItems: "center",
              minWidth: 860,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: accent, fontFamily: "var(--font)" }}>
              {cohort.label}
            </span>
            <span>
              <span className={cohort.inProgress ? "nm-status-pill is-active" : "nm-status-pill is-alumni"}>
                {cohort.statusLabel}
              </span>
            </span>
            <span style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
              {periodLabel(cohort)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              {cohort.totalFellows}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              {cohort.inProgress ? cohort.activeFellows : "—"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              {dash(cohort.alumniFellows, completed || cohort.alumniFellows > 0)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              {dash(cohort.placed, completed)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: completed ? "#3B8BEB" : "var(--emuted)", fontFamily: "var(--font)" }}>
              {dash(`${cohort.graduationRate}%`, completed)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: completed ? "#2EC27E" : "var(--emuted)", fontFamily: "var(--font)" }}>
              {dash(`${cohort.placementRate}%`, completed)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
