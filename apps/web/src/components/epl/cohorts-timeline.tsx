"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  IconUsers,
  IconPencil,
  IconTrash,
  IconLoader2,
  IconPlus,
  IconList,
} from "@tabler/icons-react";

export type CohortTimelineItem = {
  id: string | null;
  label: string;
  cohortNumber: number | null;
  cohortYear: number | null;
  startsOn?: string | null;
  endsOn?: string | null;
  timelineProgress?: number | null;
  daysRemaining?: number | null;
  status: "in_progress" | "completed";
  statusLabel: string;
  totalFellows: number;
  activeFellows: number;
  alumniFellows: number;
  placed: number;
  placementRate: number;
  graduationRate: number;
  inProgress: boolean;
  dataSource: "live" | "manual" | "hybrid";
  isVirtual: boolean;
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
  notes?: string | null;
};

type Props = {
  cohorts: CohortTimelineItem[];
  countryId: string;
  accent: string;
  canManage: boolean;
  onEdit?: (row: CohortTimelineItem) => void;
  onSetup?: (row: CohortTimelineItem) => void;
  onDelete?: (id: string) => void;
  deletingId?: string;
};

function badgeNumber(cohort: CohortTimelineItem) {
  if (cohort.cohortNumber != null) return String(cohort.cohortNumber);
  if (cohort.cohortYear != null) return String(cohort.cohortYear).slice(2);
  return cohort.label.replace(/\D/g, "").slice(0, 2) || "—";
}

function cohortKey(cohort: CohortTimelineItem) {
  return cohort.id ?? `virtual-${cohort.cohortYear ?? cohort.label}`;
}

function cohortSummary(cohort: CohortTimelineItem) {
  if (cohort.isVirtual) {
    return `${cohort.activeFellows} fellow${cohort.activeFellows === 1 ? "" : "s"} in Network — save this as a cohort record first.`;
  }

  const parts: string[] = [];
  if (cohort.startsOn && cohort.endsOn) {
    parts.push(`${cohort.startsOn} → ${cohort.endsOn}`);
  } else if (cohort.cohortYear != null) {
    parts.push(`Cohort year ${cohort.cohortYear}`);
  }
  parts.push(`${cohort.totalFellows} started`);
  if (cohort.activeFellows > 0) parts.push(`${cohort.activeFellows} in fellowship`);
  if (cohort.alumniFellows > 0) parts.push(`${cohort.alumniFellows} alumni`);
  return `${parts.join(" · ")}.`;
}

function timelineLabel(cohort: CohortTimelineItem) {
  if (cohort.timelineProgress == null) return null;
  if (!cohort.inProgress || (cohort.daysRemaining != null && cohort.daysRemaining <= 0)) {
    return `Timeline ${cohort.timelineProgress}% complete`;
  }
  return `${cohort.daysRemaining} day${cohort.daysRemaining === 1 ? "" : "s"} left · ${cohort.timelineProgress}% elapsed`;
}

function cohortHeadlineStat(cohort: CohortTimelineItem, accent: string) {
  if (cohort.activeFellows > 0) {
    return {
      label: "In fellowship",
      value: cohort.activeFellows,
      subtext: `${cohort.alumniFellows} alumni · ${cohort.totalFellows} started`,
      iconColor: accent,
    };
  }
  if (cohort.alumniFellows > 0) {
    return {
      label: "Alumni",
      value: cohort.alumniFellows,
      subtext:
        cohort.alumniFellows >= cohort.totalFellows
          ? `${cohort.totalFellows} started · all graduated`
          : `${cohort.totalFellows} started · ${cohort.alumniFellows} graduated`,
      iconColor: "#3B8BEB",
    };
  }
  return {
    label: "Started",
    value: cohort.totalFellows,
    subtext: cohort.inProgress
      ? "No members yet"
      : cohort.placed > 0
        ? `${cohort.placed} retained`
        : "No members yet",
    iconColor: accent,
  };
}

export function CohortsTimeline({
  cohorts,
  countryId,
  accent,
  canManage,
  onEdit,
  onSetup,
  onDelete,
  deletingId,
}: Props) {
  const showActions = canManage;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {cohorts.map((cohort) => {
        const headline = cohortHeadlineStat(cohort, accent);
        const showOutcomeRates = !cohort.inProgress;
        const columns = [
          "auto",
          "1fr",
          "160px",
          ...(showOutcomeRates ? ["180px"] : []),
          ...(showActions ? ["auto"] : []),
        ].join(" ");
        return (
        <div
          key={cohortKey(cohort)}
          className="gc pm-card"
          style={{
            padding: 22,
            display: "grid",
            gridTemplateColumns: columns,
            gap: 24,
            alignItems: "center",
            ...(cohort.isVirtual
              ? { borderStyle: "dashed", borderColor: `${accent}44`, background: `${accent}08` }
              : {}),
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `${accent}15`,
              border: `1px solid ${accent}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: accent,
              fontFamily: "var(--font)",
            }}
          >
            {badgeNumber(cohort)}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                {cohort.label}
              </h3>
              <span
                className={`nm-status-pill ${
                  cohort.statusLabel === "Incoming" ? "is-incoming" : cohort.inProgress ? "is-active" : "is-alumni"
                }`}
              >
                {cohort.statusLabel}
              </span>
              {cohort.isVirtual ? (
                <span className="nm-status-pill is-inactive">Draft · from Network</span>
              ) : cohort.dataSource === "manual" ? (
                <span className="nm-status-pill is-inactive">Manual record</span>
              ) : cohort.dataSource === "hybrid" ? (
                <span className="nm-status-pill is-inactive">Manual + live</span>
              ) : (
                <span className="nm-status-pill is-inactive">Live from Network</span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.5 }}>
              {cohortSummary(cohort)}
            </p>
            {cohort.timelineProgress != null && (
              <div style={{ marginTop: 12, maxWidth: 360 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase" }}>
                    Cohort timeline
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>
                    {timelineLabel(cohort)}
                  </span>
                </div>
                <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${cohort.timelineProgress}%`,
                      height: "100%",
                      background: accent,
                      borderRadius: 10,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ paddingLeft: 20, borderLeft: "1px solid var(--eborder)" }}>
            <div style={{ fontSize: 11, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              {headline.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 8 }}>
              {headline.value}
              <IconUsers size={18} style={{ color: headline.iconColor }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--emuted)", marginTop: 4 }}>
              {headline.subtext}
            </div>
          </div>

          {showOutcomeRates && (
          <div style={{ paddingLeft: 20, borderLeft: "1px solid var(--eborder)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase" }}>Graduation</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#3B8BEB" }}>{cohort.graduationRate}%</span>
            </div>
            <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ width: `${cohort.graduationRate}%`, height: "100%", background: "#3B8BEB", borderRadius: 10 }} />
            </div>
          </div>
          )}

          {showActions && (
            <div className="nm-row-actions" style={{ flexDirection: "column", alignItems: "stretch", minWidth: 120 }}>
              {cohort.isVirtual && onSetup ? (
                <button type="button" className="rm-primary" style={{ justifyContent: "center" }} onClick={() => onSetup(cohort)}>
                  <IconPlus size={14} /> Create record
                </button>
              ) : cohort.id ? (
                <>
                  <Link
                    href={`/dashboard/countries/${countryId}/cohorts/${cohort.id}` as Route}
                    className="nm-row-action"
                    style={{ textDecoration: "none", justifyContent: "center" }}
                  >
                    <IconList size={14} /> View list
                  </Link>
                  {canManage && onEdit && (
                    <button type="button" className="nm-row-action" onClick={() => onEdit(cohort)}>
                      <IconPencil size={14} /> Edit
                    </button>
                  )}
                  {canManage && onDelete && (
                    <button
                      type="button"
                      className="nm-row-action is-danger"
                      onClick={() => onDelete(cohort.id!)}
                      disabled={deletingId === cohort.id}
                    >
                      {deletingId === cohort.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
                      Delete
                    </button>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
