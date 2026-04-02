"use client";

import { useParams } from "next/navigation";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";

export default function CountryCohortsPage() {
  const params = useParams();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];
  if (!country) return null;

  const totalFellows = country.cohorts.reduce((s, c) => s + c.fellows, 0);
  const totalPlaced = country.cohorts.reduce((s, c) => s + c.placed, 0);
  const totalGrad = country.cohorts.reduce((s, c) => s + c.graduated, 0);

  return (
    <CountryLayout activePage="cohorts" pageTitle="Cohorts">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Cohort Timeline — {country.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            {country.cohorts.length} cohorts · {totalFellows} total fellows · {totalGrad} graduated
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total Fellows", value: totalFellows, color: country.color },
            { label: "Total Placed", value: totalPlaced, color: "#2EC27E" },
            { label: "Graduated", value: totalGrad, color: "#3B8BEB" },
            { label: "In Progress", value: totalFellows - totalGrad, color: "#E8A020" },
          ].map((s) => (
            <div key={s.label} className="gc" style={{ padding: "16px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "var(--font)" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Cohort cards */}
        {country.cohorts.map((c) => {
          const placePct = Math.round((c.placed / c.fellows) * 100);
          const gradPct = c.graduated > 0 ? Math.round((c.graduated / c.fellows) * 100) : 0;
          return (
            <div key={c.year} className="gc" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: `${country.color}18`, border: `1px solid ${country.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: country.color, fontFamily: "var(--font)",
                  }}>
                    {c.year.toString().slice(2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                      Cohort {c.year}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                      {c.fellows} fellows · {c.graduated > 0 ? "Graduated" : "Active"}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--rf)",
                  background: c.graduated > 0 ? "rgba(59,139,235,0.12)" : "rgba(46,194,126,0.12)",
                  color: c.graduated > 0 ? "#3B8BEB" : "#2EC27E",
                  border: `1px solid ${c.graduated > 0 ? "rgba(59,139,235,0.30)" : "rgba(46,194,126,0.30)"}`,
                }}>
                  {c.graduated > 0 ? "Completed" : "In Progress"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>Placement</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#2EC27E", fontFamily: "var(--font)" }}>{placePct}%</span>
                  </div>
                  <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{ width: `${placePct}%`, height: "100%", borderRadius: 3, background: "#2EC27E" }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>Graduation</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#3B8BEB", fontFamily: "var(--font)" }}>{gradPct}%</span>
                  </div>
                  <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{ width: `${gradPct}%`, height: "100%", borderRadius: 3, background: "#3B8BEB" }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CountryLayout>
  );
}
