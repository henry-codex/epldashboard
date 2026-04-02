"use client";

import { AlumniLayout } from "@/components/epl/alumni-layout";
import { COUNTRIES } from "@/lib/mock-data";

export default function AlumniByCohortPage() {
  // Aggregate alumni per cohort year across countries
  // Note: co.year is a string like "Cohort 7"
  const yearMap = new Map<string, { count: number; countries: { flag: string; name: string; color: string; graduated: number }[] }>();

  for (const c of COUNTRIES) {
    for (const co of c.cohorts) {
      if (co.graduated === 0) continue;
      const existing = yearMap.get(co.year) ?? { count: 0, countries: [] };
      existing.count += co.graduated;
      existing.countries.push({ flag: c.flag, name: c.name, color: c.color, graduated: co.graduated });
      yearMap.set(co.year, existing);
    }
  }

  const cohortYears = Array.from(yearMap.entries())
    .sort((a, b) => {
        const numA = parseInt(a[0].replace(/\D/g, "")) || 0;
        const numB = parseInt(b[0].replace(/\D/g, "")) || 0;
        return numB - numA;
    });

  return (
    <AlumniLayout activePage="cohort" pageTitle="By Cohort">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Alumni by Cohort</div>
          <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            {cohortYears.length} graduated cohort years
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {cohortYears.map(([year, data]) => (
            <div key={year} className="gc" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#2EC27E", fontFamily: "var(--font)" }}>{year}</span>
                  <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>
                    {data.countries.length} countries graduated fellows
                  </div>
                </div>
                <span style={{ fontSize: 28, fontWeight: 900, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{data.count}</span>
              </div>

              {/* Bar */}
              <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
                <div style={{ width: `${Math.min((data.count / 60) * 100, 100)}%`, height: "100%", borderRadius: 99, background: "#2EC27E" }} />
              </div>

              {/* Country breakdown */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data.countries.map((cc, i) => (
                  <div key={i} style={{
                    padding: "6px 12px", borderRadius: 8,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 14 }}>{cc.flag}</span>
                    <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{cc.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cc.color, fontFamily: "var(--font)" }}>{cc.graduated}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AlumniLayout>
  );
}
