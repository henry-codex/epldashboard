/* ────────────────────────────────────────────────
   Bar Chart — 5-country check-in rates
──────────────────────────────────────────────── */

interface BarRow {
  country: string;
  code: string;
  total: number;
  submitted: number;
  color: string;
}

const BAR_DATA: BarRow[] = [
  { country: "Ghana",          code: "GH", total: 42, submitted: 38, color: "var(--eblue)" },
  { country: "Malawi",         code: "MW", total: 31, submitted: 24, color: "var(--egold)" },
  { country: "Liberia",        code: "LR", total: 28, submitted: 19, color: "var(--ered)" },
  { country: "Sierra Leone",   code: "SL", total: 35, submitted: 32, color: "var(--egreen)" },
  { country: "Kenya",          code: "KE", total: 44, submitted: 40, color: "#9B59B6" },
];

export function CheckInBarChart() {
  const max = Math.max(...BAR_DATA.map((r) => r.total));

  return (
    <div className="gc" style={{ padding: "22px 24px" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)" }}>Check-in Rates</div>
          <div style={{ fontSize: 10, color: "var(--emuted)" }}>per country · current period</div>
        </div>
        <span style={{ fontSize: 10, color: "var(--emuted)", background: "rgba(255,255,255,0.07)", padding: "3px 10px", borderRadius: "var(--rf)" }}>
          All Periods
        </span>
      </div>

      {/* bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {BAR_DATA.map((row) => {
          const pct = Math.round((row.submitted / row.total) * 100);
          const barW = (row.submitted / max) * 100;
          return (
            <div key={row.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* country code */}
              <div style={{ width: 24, fontSize: 9, fontWeight: 700, color: row.color, textAlign: "center", flexShrink: 0 }}>
                {row.code}
              </div>
              {/* track */}
              <div
                style={{
                  flex: 1, height: 8, borderRadius: 4,
                  background: "rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${barW}%`, height: "100%",
                    borderRadius: 4,
                    background: row.color,
                    opacity: 0.8,
                    transition: "width 0.4s",
                  }}
                />
              </div>
              {/* submitted / total */}
              <div style={{ fontSize: 10, color: "var(--emuted)", width: 50, textAlign: "right", flexShrink: 0 }}>
                {row.submitted}/{row.total}
              </div>
              {/* pct */}
              <div style={{ fontSize: 10, fontWeight: 600, color: row.color, width: 30, textAlign: "right", flexShrink: 0 }}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ────────────────────────────────────────────────
   Donut Chart — fellows by country (SVG)
──────────────────────────────────────────────── */

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

const DONUT_DATA: DonutSlice[] = [
  { label: "Ghana",         value: 42, color: "var(--eblue)" },
  { label: "Kenya",         value: 44, color: "#9B59B6" },
  { label: "Sierra Leone",  value: 35, color: "var(--egreen)" },
  { label: "Malawi",        value: 31, color: "var(--egold)" },
  { label: "Liberia",       value: 28, color: "var(--ered)" },
];

function buildDonutPath(
  cx: number, cy: number, r: number, rInner: number,
  startAngle: number, endAngle: number,
): string {
  const polar = (angle: number, rad: number) => ({
    x: cx + rad * Math.cos((angle * Math.PI) / 180),
    y: cy + rad * Math.sin((angle * Math.PI) / 180),
  });
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const s1 = polar(startAngle, r);
  const e1 = polar(endAngle, r);
  const s2 = polar(endAngle, rInner);
  const e2 = polar(startAngle, rInner);
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${e2.x} ${e2.y}`,
    "Z",
  ].join(" ");
}

// CSS var colors are not valid in SVG fill — use hex replacements
const COLOR_MAP: Record<string, string> = {
  "var(--eblue)":  "#4150A3",
  "#9B59B6":       "#9B59B6",
  "var(--egreen)": "#2EC27E",
  "var(--egold)":  "#F4BD12",
  "var(--ered)":   "#E05C5C",
};

export function FellowsDonutChart() {
  const total = DONUT_DATA.reduce((a, b) => a + b.value, 0);
  let angle = -90;

  return (
    <div className="gc" style={{ padding: "16px 18px" }}>
      {/* header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)" }}>Fellows by Country</div>
        <div style={{ fontSize: 10, color: "var(--emuted)" }}>Current cohort distribution</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* SVG */}
        <svg width={110} height={110} viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
          {DONUT_DATA.map((slice) => {
            const sliceAngle = (slice.value / total) * 360;
            const path = buildDonutPath(55, 55, 46, 28, angle, angle + sliceAngle - 1);
            angle += sliceAngle;
            return (
              <path
                key={slice.label}
                d={path}
                fill={COLOR_MAP[slice.color] ?? slice.color}
                opacity={0.85}
              />
            );
          })}
          {/* center text */}
          <text x={55} y={51} textAnchor="middle" fill="rgba(255,255,255,0.94)" fontSize={16} fontWeight={600} fontFamily="DM Sans, sans-serif">
            {total}
          </text>
          <text x={55} y={62} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={8} fontFamily="DM Sans, sans-serif">
            fellows
          </text>
        </svg>

        {/* legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
          {DONUT_DATA.map((slice) => (
            <div key={slice.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                  background: COLOR_MAP[slice.color] ?? slice.color,
                }}
              />
              <span style={{ flex: 1, fontSize: 11, color: "var(--emuted)" }}>{slice.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ewhite)" }}>{slice.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
