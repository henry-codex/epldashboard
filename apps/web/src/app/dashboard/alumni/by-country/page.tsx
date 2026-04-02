"use client";

import { AlumniLayout } from "@/components/epl/alumni-layout";
import { COUNTRIES } from "@/lib/mock-data";

export default function AlumniByCountryPage() {
  return (
    <AlumniLayout activePage="country" pageTitle="By Country">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Alumni by Country</div>
          <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Country-level alumni distribution and highlights
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {COUNTRIES.map((c) => {
            const totalGrad = c.cohorts.reduce((s, co) => s + co.graduated, 0);
            return (
              <div key={c.id} className="gc" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{c.flag}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                        {c.alumni} alumni · {totalGrad} graduated · {c.institutions} institutions
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 24, fontWeight: 900, color: c.color, fontFamily: "var(--font)" }}>{c.alumni}</span>
                </div>

                {/* Alumni bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ width: `${(c.alumni / 150) * 100}%`, height: "100%", borderRadius: 99, background: c.color }} />
                  </div>
                </div>

                {/* Featured alumni */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {c.alumniHighlights.map((a, i) => (
                    <div key={i} style={{
                      padding: "8px 14px", borderRadius: 8,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: `${c.color}22`, color: c.color, fontSize: 10, fontWeight: 700, fontFamily: "var(--font)",
                      }}>
                        {a.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{a.name}</div>
                        <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>{a.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AlumniLayout>
  );
}
