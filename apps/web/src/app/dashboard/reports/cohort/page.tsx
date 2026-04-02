"use client";

import { ReportLayout } from "@/components/epl/report-layout";
import { COUNTRIES } from "@/lib/mock-data";
import { 
  IconStack2, IconAward, IconUsers, IconTrendingUp, IconActivity,
  IconCalendarEvent
} from "@tabler/icons-react";

export default function ReportsByCohortPage() {
  // Aggregate cohorts across all countries
  // Note: co.year is a string like "Cohort 7"
  const yearMap = new Map<string, { fellows: number; placed: number; graduated: number }>();

  for (const c of COUNTRIES) {
    for (const co of c.cohorts) {
      const existing = yearMap.get(co.year) ?? { fellows: 0, placed: 0, graduated: 0 };
      existing.fellows += co.fellows;
      existing.placed += co.placed;
      existing.graduated += co.graduated;
      yearMap.set(co.year, existing);
    }
  }

  const allCohorts = Array.from(yearMap.entries())
    .sort((a, b) => {
        // Extract numbers for numeric sort: "Cohort 7" -> 7
        const numA = parseInt(a[0].replace(/\D/g, "")) || 0;
        const numB = parseInt(b[0].replace(/\D/g, "")) || 0;
        return numB - numA;
    })
    .map(([year, data]) => ({ year, ...data }));

  return (
    <ReportLayout activePage="cohort" pageTitle="Continental Cohort Audit">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        
        {/* Page Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>
             Cohort Lifecycle Audits
          </h1>
          <p style={{ fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 700 }}>
             Tracking the generational evolution of the fellowship network, from recruitment intake to graduation and post-fellowship placement.
          </p>
        </div>

        {/* Global Cohort Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {allCohorts.map((co) => {
            const placementRate = co.fellows > 0 ? Math.round((co.placed / co.fellows) * 100) : 0;
            const isGraduated = co.graduated > 0;
            
            return (
              <div key={co.year} className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
                 {/* Year Label Float */}
                 <div style={{ position: "absolute", top: 30, right: 30, fontSize: 48, fontWeight: 900, color: "rgba(255,255,255,0.03)", fontFamily: "var(--font)", userSelect: "none" }}>
                    {co.year.split(" ")[1]}
                 </div>

                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                       <div style={{ 
                          width: 52, height: 52, borderRadius: 14, 
                          background: isGraduated ? "rgba(46,194,126,0.12)" : "rgba(59,139,235,0.12)",
                          border: `1px solid ${isGraduated ? "#2EC27E44" : "#3B8BEB44"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: isGraduated ? "#2EC27E" : "#3B8BEB"
                       }}>
                          <IconStack2 size={24} />
                       </div>
                       <div>
                          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>{co.year}</h2>
                          <div style={{ fontSize: 13, color: "var(--emuted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                             <IconCalendarEvent size={14} /> CONTINENTAL AGGREGATE
                          </div>
                       </div>
                    </div>
                    <div style={{
                       padding: "8px 16px", borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px",
                       background: isGraduated ? "rgba(46,194,126,0.1)" : "rgba(232,160,32,0.1)",
                       color: isGraduated ? "#2EC27E" : "#E8A020",
                       border: `1px solid ${isGraduated ? "rgba(46,194,126,0.2)" : "rgba(232,160,32,0.2)"}`,
                       display: "flex", alignItems: "center", gap: 8
                    }}>
                       <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 6px currentColor" }} />
                       {isGraduated ? "Graduated & Active Alumni" : "In-Field / Active Deployment"}
                    </div>
                 </div>

                 {/* Metric Row */}
                 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, zIndex: 1 }}>
                    {[
                       { label: "Intake", value: co.fellows, icon: <IconUsers size={16} />, color: "#3B8BEB" },
                       { label: "Placed", value: co.placed, icon: <IconActivity size={16} />, color: "#2EC27E" },
                       { label: "Retention", value: `${placementRate}%`, icon: <IconTrendingUp size={16} />, color: "#7F77DD" },
                       { label: "Alumni", value: co.graduated || "—", icon: <IconAward size={16} />, color: "#E8A020" },
                    ].map((m) => (
                       <div key={m.label} style={{ padding: "20px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--emuted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                             {m.icon} {m.label}
                          </div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: m.color, fontFamily: "var(--font)" }}>{m.value}</div>
                       </div>
                    ))}
                 </div>

                 {/* Regional Participation List */}
                 <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>REGIONAL DEPLOYMENT BREAKDOWN</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                       {COUNTRIES.map((c) => {
                          const cc = c.cohorts.find((x) => x.year === co.year);
                          if (!cc) return null;
                          return (
                             <div key={c.id} style={{ 
                                padding: "10px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                                display: "flex", alignItems: "center", gap: 10, transition: "transform 0.2s"
                             }} className="hover-lift">
                                <span style={{ fontSize: 20 }}>{c.flag}</span>
                                <div>
                                   <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ewhite)" }}>{c.name}</div>
                                   <div style={{ fontSize: 10, color: "var(--emuted)", fontWeight: 600 }}>{cc.fellows} DEPLOYED</div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
            );
          })}
        </div>

      </div>
    </ReportLayout>
  );
}
