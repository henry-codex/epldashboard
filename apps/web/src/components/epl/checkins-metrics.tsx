"use client";

import { IconChecklist, IconClock, IconShieldCheck, IconUsers } from "@tabler/icons-react";

type Props = {
  activeFellows: number;
  submitted: number;
  pending: number;
  complianceRate: number;
  accent: string;
  periodLabel: string;
};

export function CheckInsMetricCards({
  activeFellows,
  submitted,
  pending,
  complianceRate,
  accent,
  periodLabel,
}: Props) {
  const cards = [
    { label: "Compliance", value: `${complianceRate}%`, accent: complianceRate >= 85 ? "#2EC27E" : complianceRate >= 60 ? "#E8A020" : "#E05C5C", icon: <IconShieldCheck size={20} /> },
    { label: "Submitted", value: submitted, accent, icon: <IconChecklist size={20} /> },
    { label: "Pending", value: pending, accent: "#E8A020", icon: <IconClock size={20} /> },
    { label: "Due for check-in", value: activeFellows, accent: "#9B59B6", icon: <IconUsers size={20} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        Reporting period: <strong style={{ color: "var(--ewhite)" }}>{periodLabel}</strong>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
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
    </div>
  );
}

function formatPeriodLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export { formatPeriodLabel };
