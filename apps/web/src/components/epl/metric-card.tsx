import type { ReactNode } from "react";

type AccentType = "blue" | "green" | "gold" | "red" | string;

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  badge?: { text: string; type: "up" | "down" | "neutral" | "gold" };
  accent?: AccentType;
  icon?: ReactNode;
}

const ACCENT_MAP: Record<string, { color: string; glow: string; iconBg: string }> = {
  blue:  { color: "#7EC4FF", glow: "rgba(59,139,235,0.28)",  iconBg: "rgba(59,139,235,0.20)"  },
  green: { color: "#6EE3AA", glow: "rgba(46,194,126,0.28)",  iconBg: "rgba(46,194,126,0.20)"  },
  gold:  { color: "#FAC775", glow: "rgba(232,160,32,0.28)",  iconBg: "rgba(232,160,32,0.20)"  },
  red:   { color: "#FFAAAA", glow: "rgba(224,92,92,0.28)",   iconBg: "rgba(224,92,92,0.20)"   },
};

export function MetricCard({ label, value, sub, badge, accent = "blue", icon }: MetricCardProps) {
  const a = ACCENT_MAP[accent] ?? ACCENT_MAP.blue;

  const badgeColors: Record<string, { bg: string; color: string }> = {
    up:      { bg: "rgba(46,194,126,0.18)",  color: "#2EC27E" },
    down:    { bg: "rgba(224,92,92,0.18)",   color: "#E05C5C" },
    neutral: { bg: "rgba(255,255,255,0.10)", color: "var(--emuted)" },
    gold:    { bg: "rgba(232,160,32,0.18)",  color: "#E8A020" },
  };

  return (
    <div
      className="gc"
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "box-shadow 0.18s ease, transform 0.18s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `var(--shadow), 0 0 0 1px ${a.glow}`;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* top row: icon + label + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {icon && (
            <span style={{
              width: 28, height: 28,
              borderRadius: 8,
              background: a.iconBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: a.color,
              flexShrink: 0,
            }}>
              {icon}
            </span>
          )}
          <span style={{ fontSize: 10, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {label}
          </span>
        </div>
        {badge && (
          <span style={{
            padding: "1px 7px", borderRadius: "var(--rf)", fontSize: 9, fontWeight: 600,
            background: badgeColors[badge.type].bg,
            color: badgeColors[badge.type].color,
            flexShrink: 0,
          }}>
            {badge.text}
          </span>
        )}
      </div>

      {/* value */}
      <div style={{
        fontSize: 26, fontWeight: 700,
        color: a.color,
        lineHeight: 1,
        textShadow: `0 0 20px ${a.glow}`,
        fontFamily: "var(--font)",
      }}>
        {value}
      </div>

      {/* sub */}
      {sub && (
        <div style={{ fontSize: 10, color: "var(--emuted)" }}>{sub}</div>
      )}
    </div>
  );
}
