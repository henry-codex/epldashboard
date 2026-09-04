"use client";

import {
  IconUsers,
  IconAward,
  IconGlobe,
  IconUserPlus,
  IconCoin,
  IconGenderBigender,
  IconAccessible,
} from "@tabler/icons-react";

type Props = {
  activeFellows: number;
  alumniLeaders: number;
  totalNetwork: number;
  accent: string;
};

// The three numbers required everywhere per the dashboard spec — Overview,
// Map, Fellows/Network, and Country pages must all agree. Keep this the
// single place that renders them so no page drifts to a one-off metric set.
export function NetworkMetricCards({ activeFellows, alumniLeaders, totalNetwork, accent }: Props) {
  const cards = [
    { label: "Active Fellows", value: activeFellows, accent, icon: <IconUsers size={20} /> },
    { label: "Alumni", value: alumniLeaders, accent: "#3B8BEB", icon: <IconAward size={20} /> },
    { label: "Total Recruited", value: totalNetwork, accent: "#2EC27E", icon: <IconGlobe size={20} /> },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {cards.map((k) => (
        <MetricTile key={k.label} label={k.label} value={k.value} accent={k.accent} icon={k.icon} />
      ))}
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="gc" style={{ padding: 18, display: "flex", gap: 12, alignItems: "center" }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", opacity: 0.75, marginTop: 1 }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

type InsightProps = {
  incomingFellows: number;
  mcfFellows: number;
  totalCurrent: number;
  femaleCount: number | null;
  maleCount: number | null;
  pwdCount: number | null;
  accent: string;
};

// A second row, distinct from the fixed 3-card spec above — these are the
// numbers worth watching week to week (pipeline, funding mix, inclusion),
// not the identity metrics that must match across every page.
export function NetworkInsightStats({
  incomingFellows,
  mcfFellows,
  totalCurrent,
  femaleCount,
  maleCount,
  pwdCount,
  accent,
}: InsightProps) {
  const dash = "—";
  const mcfPct = totalCurrent > 0 ? Math.round((mcfFellows / totalCurrent) * 100) : null;
  const femalePct =
    femaleCount != null && maleCount != null && femaleCount + maleCount > 0
      ? Math.round((femaleCount / (femaleCount + maleCount)) * 100)
      : null;

  const tiles = [
    { label: "Incoming", value: incomingFellows, accent, icon: <IconUserPlus size={20} /> },
    {
      label: "MCF Scholars",
      value: mcfFellows,
      hint: mcfPct != null ? `${mcfPct}% of current roster` : undefined,
      accent: "#3B8BEB",
      icon: <IconCoin size={20} />,
    },
    {
      label: "% Female",
      value: femalePct != null ? `${femalePct}%` : dash,
      accent: "#9B59B6",
      icon: <IconGenderBigender size={20} />,
    },
    {
      label: "PWDs",
      value: pwdCount ?? dash,
      accent: "#E8A020",
      icon: <IconAccessible size={20} />,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {tiles.map((t) => (
        <MetricTile key={t.label} label={t.label} value={t.value} hint={t.hint} accent={t.accent} icon={t.icon} />
      ))}
    </div>
  );
}
