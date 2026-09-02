"use client";

import {
  IconUsers,
  IconIdBadge2,
  IconBuildingBank,
} from "@tabler/icons-react";

type Props = {
  activeFellows: number;
  mcfFellows: number;
  activePartners: number;
  accent: string;
};

export function NetworkMetricCards({ activeFellows, mcfFellows, activePartners, accent }: Props) {
  const cards = [
    { label: "Active Fellows", value: activeFellows, accent, icon: <IconUsers size={20} /> },
    { label: "MCF Fellows", value: mcfFellows, accent: "#3B8BEB", icon: <IconIdBadge2 size={20} /> },
    { label: "Institutions", value: activePartners, accent: "#2EC27E", icon: <IconBuildingBank size={20} /> },
  ];

  return (
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
  );
}
