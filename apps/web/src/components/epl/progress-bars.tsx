interface ProgressRow {
  country: string;
  code: string;
  pct: number;
}

const COUNTRIES: ProgressRow[] = [
  { country: "Ghana",        code: "GH", pct: 90 },
  { country: "Kenya",        code: "KE", pct: 91 },
  { country: "Sierra Leone", code: "SL", pct: 91 },
  { country: "Malawi",       code: "MW", pct: 77 },
  { country: "Liberia",      code: "LR", pct: 68 },
];

function barColor(pct: number): string {
  if (pct >= 85) return "var(--eblue)";
  if (pct >= 75) return "var(--egold)";
  return "var(--ered)";
}

export function CheckInProgress() {
  return (
    <div className="gc" style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ewhite)", marginBottom: 12 }}>
        Check-in Completion
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {COUNTRIES.map((row) => (
          <div key={row.code}>
            {/* label row */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--emuted)" }}>{row.country}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: barColor(row.pct) }}>{row.pct}%</span>
            </div>
            {/* track */}
            <div
              style={{
                height: 5, borderRadius: 3,
                background: "rgba(255,255,255,0.07)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${row.pct}%`, height: "100%",
                  borderRadius: 3,
                  background: barColor(row.pct),
                  opacity: 0.8,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
