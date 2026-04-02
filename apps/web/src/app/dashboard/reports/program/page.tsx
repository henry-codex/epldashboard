"use client";

import { ReportLayout } from "@/components/epl/report-layout";
import { COUNTRIES } from "@/lib/mock-data";
import { 
  IconSchool, IconActivity, IconPlayerPlay, IconArchive, IconClock
} from "@tabler/icons-react";

export default function ReportsByProgramPage() {
  // Aggregate all programs across countries
  const allPrograms = COUNTRIES.flatMap((c) =>
    c.projects.map((p) => ({ ...p, country: c.name, flag: c.flag, color: c.color }))
  );

  const active = allPrograms.filter(p => p.status === "active");
  const planning = allPrograms.filter(p => p.status === "planning");
  const completed = allPrograms.filter(p => p.status === "completed");

  return (
    <ReportLayout activePage="program" pageTitle="Continental Program Audit">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        
        {/* Page Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: "0 0 8px 0", fontFamily: "var(--font)" }}>
              Global Program Portfolio
            </h1>
            <p style={{ margin: 0, fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)" }}>
              Monitoring cross-border deployment tracks and program lifecycles across Africa.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ padding: "8px 16px", borderRadius: 12, background: "rgba(46,194,126,0.1)", border: "1px solid rgba(46,194,126,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
               <IconActivity size={16} color="#2EC27E" />
               <span style={{ fontSize: 13, fontWeight: 800, color: "#2EC27E" }}>{active.length} ACTIVE</span>
            </div>
            <div style={{ padding: "8px 16px", borderRadius: 12, background: "rgba(59,139,235,0.1)", border: "1px solid rgba(59,139,235,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
               <IconArchive size={16} color="#3B8BEB" />
               <span style={{ fontSize: 13, fontWeight: 800, color: "#3B8BEB" }}>{completed.length} FINISHED</span>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <IconSchool size={20} color="#E8A020" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Program Performance Audit</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 1fr",
              gap: 16, padding: "0 20px",
              fontSize: 10, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800
            }}>
              <span>PROGRAM TRACK</span><span>NATION</span><span>INTAKE</span><span>COMMENCEMENT</span><span>STATUS</span>
            </div>

            {allPrograms.map((p, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 1fr",
                gap: 16, padding: "20px", alignItems: "center",
                background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)",
                transition: "all 0.2s"
              }} className="row-hover">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${p.color}15`, border: `1px solid ${p.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: p.color }}>
                     <IconSchool size={20} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>{p.name}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{p.flag}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--emuted)" }}>{p.country}</span>
                </div>

                <span style={{ fontSize: 16, fontWeight: 800, color: p.color }}>{p.fellows || "—"}</span>
                
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)" }}>
                   <IconClock size={14} />
                   <span style={{ fontSize: 13, fontWeight: 600 }}>{p.startDate}</span>
                </div>

                <div style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px",
                  background: p.status === "active" ? "rgba(46,194,126,0.12)" : p.status === "completed" ? "rgba(59,139,235,0.12)" : "rgba(255,255,255,0.05)",
                  color: p.status === "active" ? "#2EC27E" : p.status === "completed" ? "#3B8BEB" : "rgba(255,255,255,0.4)",
                  border: `1px solid ${p.status === "active" ? "rgba(46,194,126,0.25)" : p.status === "completed" ? "rgba(59,139,235,0.25)" : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", gap: 6, justifyContent: "center"
                }}>
                   <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 6px currentColor" }} />
                   {p.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ReportLayout>
  );
}
