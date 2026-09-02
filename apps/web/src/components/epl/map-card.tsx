"use client";

import AfricaMap from "./AfricaMap";
import type { FellowCountry } from "./AfricaMap";

type MapCountry = {
  id: string;
  name: string;
  color: string;
  activeFellows: number;
  alumniLeaders: number;
  institutions: number;
  numericId: number | null;
};

type Props = {
  countries: MapCountry[];
  totalNetwork: number;
  onCountryClick?: (id: string) => void;
};

export function MapCard({ countries, totalNetwork, onCountryClick }: Props) {
  const networkData: FellowCountry[] = countries
    .filter((c) => c.numericId != null)
    .map((c) => ({
      countryId: c.numericId!,
      name: c.name,
      fellows: c.activeFellows,
      alumni: c.alumniLeaders,
      institutions: c.institutions,
      cohort: "",
      color: c.color,
    }));

  const idByNumeric = new Map(
    countries.filter((c) => c.numericId != null).map((c) => [c.numericId!, c.id]),
  );

  return (
    <div
      className="gc"
      style={{
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", fontFamily: "var(--font)" }}>
            Network Map
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.60)" }}>
            {totalNetwork} total network · {countries.length} {countries.length === 1 ? "country" : "countries"}
          </div>
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#2EC27E",
            background: "rgba(46,194,126,0.15)",
            border: "1px solid rgba(46,194,126,0.30)",
            padding: "3px 10px",
            borderRadius: "var(--rf)",
          }}
        >
          ● LIVE
        </span>
      </div>

      <AfricaMap
        data={networkData}
        height={260}
        onCountryClick={(country) => {
          const id = idByNumeric.get(country.countryId);
          if (id) onCountryClick?.(id);
        }}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 18px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: 12,
        }}
      >
        {countries.length === 0 ? (
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font)" }}>
            No active country hubs yet
          </span>
        ) : (
          countries.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCountryClick?.(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "var(--font)",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: c.color,
                  boxShadow: `0 0 6px ${c.color}`,
                }}
              />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.60)" }}>{c.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF" }}>
                {c.activeFellows + c.alumniLeaders}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
