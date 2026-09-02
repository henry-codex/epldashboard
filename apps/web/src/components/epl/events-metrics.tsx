"use client";

import { IconCalendarEvent, IconClock, IconHistory } from "@tabler/icons-react";

type Props = {
  upcoming: number;
  past: number;
  thisMonth: number;
  accent: string;
};

export function EventsMetricCards({ upcoming, past, thisMonth, accent }: Props) {
  const cards = [
    { label: "Upcoming", value: upcoming, accent, icon: <IconCalendarEvent size={20} /> },
    { label: "This month", value: thisMonth, accent: "#3B8BEB", icon: <IconClock size={20} /> },
    { label: "Past events", value: past, accent: "#9B59B6", icon: <IconHistory size={20} /> },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
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
