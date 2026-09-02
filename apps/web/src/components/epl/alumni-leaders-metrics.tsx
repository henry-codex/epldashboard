"use client";

import { IconBuildingCommunity, IconStar, IconUsers } from "@tabler/icons-react";

type Props = {
  totalLeaders: number;
  activeLeaders: number;
  representatives: number;
  networkAlumni?: number;
  accent: string;
  readOnly?: boolean;
};

export function AlumniLeadersMetricCards({
  totalLeaders,
  activeLeaders,
  representatives,
  networkAlumni,
  accent,
  readOnly = false,
}: Props) {
  const cards = readOnly
    ? [
        { label: "Active leaders", value: activeLeaders, accent, icon: <IconBuildingCommunity size={20} /> },
        { label: "Representatives", value: representatives, accent: "#F4BD12", icon: <IconStar size={20} /> },
        ...(networkAlumni != null
          ? [{ label: "Network alumni", value: networkAlumni, accent: "#9B59B6", icon: <IconUsers size={20} /> }]
          : []),
      ]
    : [
        { label: "Featured leaders", value: totalLeaders, accent, icon: <IconBuildingCommunity size={20} /> },
        { label: "Representatives", value: representatives, accent: "#F4BD12", icon: <IconStar size={20} /> },
        ...(networkAlumni != null
          ? [{ label: "Network alumni", value: networkAlumni, accent: "#9B59B6", icon: <IconUsers size={20} /> }]
          : []),
      ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(cards.length, 4)}, minmax(0, 1fr))`,
        gap: 14,
      }}
    >
      {cards.map((card) => (
        <div key={card.label} className="gc" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${card.accent}18`,
              border: `1px solid ${card.accent}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: card.accent,
            }}
          >
            {card.icon}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
