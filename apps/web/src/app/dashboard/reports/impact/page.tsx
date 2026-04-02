"use client";

import { ReportLayout } from "@/components/epl/report-layout";
import { COUNTRIES, TOTAL_FELLOWS, TOTAL_ALUMNI, TOTAL_PLACED, TOTAL_INST, AVG_CHECKIN } from "@/lib/mock-data";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell
} from "recharts";
import { 
  IconTrophy, IconSchool, IconBuildingBank, IconWorld, IconTrendingUp,
  IconArrowUpRight, IconShieldCheck
} from "@tabler/icons-react";

const impactTimeline = [
  { year: "2020", graduates: 20 },
  { year: "2021", graduates: 55 },
  { year: "2022", graduates: 110 },
  { year: "2023", graduates: 195 },
  { year: "2024", graduates: 280 },
  { year: "2025", graduates: 344 },
];

const sectorImpact = [
  { sector: "Public Policy", impact: 85, color: "#3B8BEB" },
  { sector: "Digital Govt", impact: 72, color: "#2EC27E" },
  { sector: "Health Equity", impact: 91, color: "#E05C5C" },
  { sector: "Education", impact: 64, color: "#F0C419" },
];

export default function ImpactReportPage() {
  const totalGraduated = COUNTRIES.reduce((s, c) => s + c.cohorts.reduce((cs, co) => cs + co.graduated, 0), 0);
  const placementRate = Math.round((TOTAL_PLACED / TOTAL_FELLOWS) * 100);

  return (
    <ReportLayout activePage="impact" pageTitle="Global Impact Tracking">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        
        {/* Header Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>
            Continental Impact Dashboard
          </h1>
          <p style={{ fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 700 }}>
            Visualizing the long-term systemic influence and professional trajectory of the EPL Africa network across the public sector.
          </p>
        </div>

        {/* Hero Impact Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            { label: "Overall Placement", value: `${placementRate}%`, sub: `${TOTAL_PLACED} of ${TOTAL_FELLOWS} placed`, color: "#3B8BEB", icon: <IconBuildingBank size={24} /> },
            { label: "Network Output", value: totalGraduated.toString(), sub: `Total alumni since inception`, color: "#2EC27E", icon: <IconTrophy size={24} /> },
            { label: "Regional Reach", value: COUNTRIES.length.toString(), sub: `Active country integrations`, color: "#7F77DD", icon: <IconWorld size={24} /> },
          ].map((kpi) => (
            <div key={kpi.label} className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: kpi.color, opacity: 0.1, filter: "blur(40px)", borderRadius: "50%" }} />
              <div style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 20,
                background: `${kpi.color}15`, border: `1px solid ${kpi.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center", color: kpi.color,
                boxShadow: `0 8px 24px -10px ${kpi.color}`
              }}>{kpi.icon}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1, marginBottom: 8 }}>{kpi.value}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: kpi.color, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Visual Analytics Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
          
          {/* Alumni Growth Area Chart */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <IconTrendingUp size={20} color="#2EC27E" />
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Cumulative Network Scaling</h3>
                </div>
                <div style={{ fontSize: 11, background: "rgba(46,194,126,0.1)", color: "#2EC27E", padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>+24% YOY</div>
            </div>
            <div style={{ flex: 1, minHeight: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={impactTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="impactArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2EC27E" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2EC27E" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="year" stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                        contentStyle={{ background: "rgba(4,12,38,0.9)", backdropFilter: "blur(12px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)" }}
                    />
                    <Area type="monotone" dataKey="graduates" stroke="#2EC27E" strokeWidth={3} fill="url(#impactArea)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Chart: Comparative Performance */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Sectoral Strategic Influence</h3>
            <div style={{ flex: 1, minHeight: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sectorImpact} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="sector" type="category" stroke="var(--ewhite)" fontSize={13} fontWeight={600} tickLine={false} axisLine={false} width={120} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: "rgba(4,12,38,0.9)", border: "none", borderRadius: 8 }} />
                    <Bar dataKey="impact" radius={[0, 8, 8, 0]} barSize={20}>
                        {sectorImpact.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: 12, marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "var(--emuted)", lineHeight: 1.5 }}>
                    <span style={{ color: "#E05C5C", fontWeight: 800 }}>91% Deployment</span> saturation in Health Equity initiatives globally.
                </div>
            </div>
          </div>

        </div>

        {/* Detailed Leaderboard Ranking */}
        <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Country Impact Matrix</h3>
            <div style={{ display: "flex", gap: 8 }}>
                <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B8BEB" }} /> Placement
                </div>
                <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2EC27E" }} /> Alumni
                </div>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             {COUNTRIES.map((c) => {
               const cGrad = c.cohorts.reduce((s, co) => s + co.graduated, 0);
               const cPlacement = c.fellows > 0 ? Math.round((c.placed / c.fellows) * 100) : 0;
               return (
                <div key={c.id} style={{
                    display: "grid", gridTemplateColumns: "220px 1fr 120px",
                    gap: 24, padding: "20px 24px", alignItems: "center",
                    background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)",
                    transition: "all 0.3s"
                }} className="row-item">
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{c.flag}</div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 600 }}>{c.activePrograms} ACTIVE PROGRAMS</div>
                        </div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--emuted)" }}>
                            <span>PLACEMENT SATURATION</span>
                            <span style={{ color: "var(--ewhite)" }}>{cPlacement}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                            <div style={{ width: `${cPlacement}%`, height: "100%", background: `linear-gradient(90deg, ${c.color}aa, ${c.color})`, boxShadow: `0 0 10px ${c.color}40` }} />
                        </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{cGrad}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase", marginTop: 4 }}>Alumni Base</div>
                    </div>
                </div>
               )
             })}
          </div>
        </div>

        {/* Outcome Strategic Pillars */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              { icon: <IconBuildingBank size={24} />, title: "Governance Presence", desc: "65% of all graduates are currently retained in senior leadership roles within public institutions.", color: "#3B8BEB" },
              { icon: <IconShieldCheck size={24} />, title: "Systemic Integrity", desc: "94% average check-in compliance across 72 mapped institutions ensures continuous accountability.", color: "#2EC27E" },
              { icon: <IconSchool size={24} />, title: "Capacity Building", desc: "Over 344 alumni trained through 12 unique cross-border program tracks in various public sectors.", color: "#E8A020" },
              { icon: <IconArrowUpRight size={24} />, title: "Network Expansion", desc: "Aggressive growth path targets 1,000 active fellows by 2030 through 3 new country partners.", color: "#7F77DD" },
            ].map((pillar, i) => (
                <div key={i} className="gc" style={{ padding: "26px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${pillar.color}15`, border: `1px solid ${pillar.color}30`, display: "flex", alignItems: "center", justifyContent: "center", color: pillar.color }}>{pillar.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{pillar.title}</div>
                    <p style={{ fontSize: 13, color: "var(--emuted)", lineHeight: 1.6, margin: 0, fontFamily: "var(--font)" }}>{pillar.desc}</p>
                </div>
            ))}
        </div>

      </div>
    </ReportLayout>
  );
}
