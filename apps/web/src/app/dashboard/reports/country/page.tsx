"use client";

import { ReportLayout } from "@/components/epl/report-layout";
import { COUNTRIES } from "@/lib/mock-data";
import { 
  IconUsers, IconBuildingBank, IconTrendingUp, IconAward, IconChecklist,
  IconArrowRight
} from "@tabler/icons-react";

export default function ReportsByCountryPage() {
  return (
    <ReportLayout activePage="country" pageTitle="Continental Network Dossiers">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        
        {/* Page Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>
             Regional Performance Dossiers
          </h1>
          <p style={{ fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 700 }}>
             A deep-dive comparative audit across each country's fellowship footprint, alumni retention, and institutional health metrics.
          </p>
        </div>

        {/* Responsive Grid of Country Dossiers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 24 }}>
          {COUNTRIES.map((c) => {
            const placementRate = c.fellows > 0 ? Math.round((c.placed / c.fellows) * 100) : 0;
            return (
              <div key={c.id} className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 24, position: "relative", overflow: "hidden" }}>
                {/* Accent Corner Glow */}
                <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: c.color, opacity: 0.15, filter: "blur(40px)", borderRadius: "50%" }} />
                
                {/* Header: Flag + Name + Badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ fontSize: 32, width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)" }}>{c.flag}</div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{c.name}</div>
                            <div style={{ fontSize: 13, color: "var(--emuted)", fontWeight: 600, fontFamily: "var(--font)" }}>{c.activePrograms} ACTIVE PROGRAMS</div>
                        </div>
                    </div>
                    <div style={{ padding: "6px 12px", borderRadius: 20, background: `${c.color}20`, color: c.color, fontSize: 11, fontWeight: 800, border: `1px solid ${c.color}30` }}>
                        COHORT {c.cohorts.length} ACTIVE
                    </div>
                </div>

                {/* Performance Metrics Block */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, zIndex: 1 }}>
                     <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)", marginBottom: 12 }}>
                            <IconUsers size={16} /> 
                            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.5px" }}>HUMAN CAPITAL</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)" }}>{c.fellows}</span>
                            <span style={{ fontSize: 12, color: "var(--emuted)" }}>Fellows</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--emuted)", marginTop: 4 }}>+ {c.alumni} graduated alumni</div>
                     </div>

                     <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)", marginBottom: 12 }}>
                            <IconBuildingBank size={16} /> 
                            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.5px" }}>INSTITUTIONS</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)" }}>{c.institutions}</span>
                            <span style={{ fontSize: 12, color: "var(--emuted)" }}>Partners</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--emuted)", marginTop: 4 }}>Across {c.activePrograms} Sectors</div>
                     </div>
                </div>

                {/* Progress Bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, zIndex: 1 }}>
                    {/* Placement */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                         <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)" }}>
                                <IconTrendingUp size={14} /> Placement Saturation
                            </div>
                            <span style={{ color: "#2EC27E" }}>{placementRate}%</span>
                         </div>
                         <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                            <div style={{ width: `${placementRate}%`, height: "100%", background: "#2EC27E", boxShadow: "0 0 10px rgba(46,194,126,0.3)" }} />
                         </div>
                    </div>

                    {/* Compliance */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                         <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)" }}>
                                <IconChecklist size={14} /> Reporting Health
                            </div>
                            <span style={{ color: c.checkInRate >= 90 ? "#3B8BEB" : "#E8A020" }}>{c.checkInRate}%</span>
                         </div>
                         <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                            <div style={{ width: `${c.checkInRate}%`, height: "100%", background: "#3B8BEB", boxShadow: "0 0 10px rgba(59,139,235,0.3)" }} />
                         </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                         <IconAward size={18} color={c.color} />
                         <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)" }}>Top Performance Indicator</span>
                    </div>
                    <button style={{ 
                        background: "none", border: "none", color: c.color, fontSize: 13, fontWeight: 800, 
                        display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "all 0.2s" 
                    }}>
                        Country Dashboard <IconArrowRight size={16} />
                    </button>
                </div>

              </div>
            );
          })}
        </div>
        
      </div>
    </ReportLayout>
  );
}
