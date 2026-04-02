"use client";

/* Map Card — real D3 + TopoJSON Africa map */
import AfricaMap from "./AfricaMap";
import type { FellowCountry } from "./AfricaMap";

const FELLOWS_DATA: FellowCountry[] = [
  { countryId: 288, name: "Ghana",        fellows: 87, institutions: 22, cohort: "2024" },
  { countryId: 430, name: "Liberia",      fellows: 42, institutions: 10, cohort: "2023" },
  { countryId: 454, name: "Malawi",       fellows: 35, institutions:  9, cohort: "2023" },
  { countryId: 694, name: "Sierra Leone", fellows: 28, institutions:  7, cohort: "2022" },
  { countryId: 404, name: "Kenya",        fellows: 18, institutions:  5, cohort: "2024" },
];

const COUNTRY_COLOR: Record<number, string> = {
  288: "#3B8BEB",
  430: "#E05C5C",
  454: "#E8A020",
  694: "#2EC27E",
  404: "#9B59B6",
};


export function MapCard() {
  const total = FELLOWS_DATA.reduce((s, d) => s + d.fellows, 0);

  return (
    <div
      className="gc"
      style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, background: "rgba(10, 16, 45, 0.72)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font)" }}>
            Placement Map
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.60)" }}>
            {total} fellows · 5 countries
          </div>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
          color: "#2EC27E",
          background: "rgba(46,194,126,0.15)",
          border: "1px solid rgba(46,194,126,0.30)",
          padding: "3px 10px", borderRadius: "var(--rf)",
        }}>
          ● LIVE
        </span>
      </div>

      {/* Real D3 Africa map */}
      <AfricaMap
        data={FELLOWS_DATA}
        height={260}
        onCountryClick={(country) => console.log("Selected:", country)}
      />

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
        {FELLOWS_DATA.map((d) => (
          <div key={d.countryId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: COUNTRY_COLOR[d.countryId],
              boxShadow: `0 0 6px ${COUNTRY_COLOR[d.countryId]}`,
            }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", fontFamily: "var(--font)" }}>
              {d.name}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF", fontFamily: "var(--font)" }}>
              {d.fellows}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

