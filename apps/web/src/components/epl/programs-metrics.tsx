"use client";

import { IconBriefcase, IconTarget, IconUsers, IconCircleCheck, IconAlertTriangle, IconClock } from "@tabler/icons-react";

type Props = {
  totalPrograms: number;
  activePrograms: number;
  activeFellows: number;
  accent: string;
  healthSummary?: {
    onTrack: number;
    needsAttention: number;
    atRisk: number;
  };
};

export function ProgramsMetricCards({
  totalPrograms,
  activePrograms,
  activeFellows,
  accent,
  healthSummary,
}: Props) {
  const cards = [
    { label: "Live Programs", value: activePrograms, accent, icon: <IconBriefcase size={20} /> },
    { label: "Total Programs", value: totalPrograms, accent: "#9B59B6", icon: <IconTarget size={20} /> },
    { label: "Active Fellows", value: activeFellows, accent: "#2EC27E", icon: <IconUsers size={20} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
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
            </div>
          </div>
        ))}
      </div>

      {healthSummary && totalPrograms > 0 && (
        <div className="gc pm-health-summary">
          <div className="pm-health-summary-title">Program health</div>
          <div className="pm-health-summary-grid">
            {[
              { label: "On track", count: healthSummary.onTrack, tone: "is-on-track", icon: <IconCircleCheck size={14} /> },
              { label: "Needs attention", count: healthSummary.needsAttention, tone: "is-needs-attention", icon: <IconClock size={14} /> },
              { label: "At risk", count: healthSummary.atRisk, tone: "is-at-risk", icon: <IconAlertTriangle size={14} /> },
            ].map((item) => (
              <div key={item.label} className={`pm-health-summary-item ${item.tone}`}>
                <div className="pm-health-summary-head">
                  <span className="pm-health-summary-label">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="pm-health-summary-count">{item.count}</span>
                </div>
                <div className="pm-health-summary-bar">
                  <span
                    style={{
                      width: totalPrograms > 0 ? `${Math.round((item.count / totalPrograms) * 100)}%` : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
