"use client";

import { ReportLayout } from "@/components/epl/report-layout";
import { COUNTRIES, TOTAL_FELLOWS, TOTAL_ALUMNI, TOTAL_PLACED, AVG_CHECKIN } from "@/lib/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid
} from "recharts";
import {
  IconUsers,
  IconBuildingCommunity,
  IconTrendingUp,
  IconCalendarCheck,
  IconDownload,
  IconChartBar,
  IconDeviceAnalytics
} from "@tabler/icons-react";

// Mock data for trends
const monthlyComplianceData = [
  { month: "Jan", rate: 82 },
  { month: "Feb", rate: 85 },
  { month: "Mar", rate: 91 },
  { month: "Apr", rate: 88 },
  { month: "May", rate: 94 },
  { month: "Jun", rate: 92 },
];

export default function ReportsOverviewPage() {
  const countryComparisonData = COUNTRIES.map(c => ({
    name: c.name,
    fellows: c.fellows,
    checkIn: c.checkInRate,
    color: c.color
  }));

  return (
    <ReportLayout activePage="overview" pageTitle="Global Reports Hub">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 60 }}>
        
        {/* Header with Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: "0 0 8px 0", fontFamily: "var(--font)" }}>
              Continental Performance Audit
            </h1>
            <p style={{ margin: 0, fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)" }}>
              Holistic analytics across the Pan-African network footprint.
            </p>
          </div>
          <button className="epl-btn" style={{ 
            display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", 
            fontSize: 13, background: "rgba(59,139,235,0.15)", border: "1px solid rgba(59,139,235,0.3)",
            color: "#3B8BEB", fontWeight: 700, borderRadius: 12
          }}>
            <IconDownload size={18} /> Export System Audit
          </button>
        </div>

        {/* Global KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {[
            { label: "Total Fellows", value: TOTAL_FELLOWS, color: "#3B8BEB", icon: <IconUsers size={24} /> },
            { label: "Alumni Network", value: TOTAL_ALUMNI, color: "#9B59B6", icon: <IconBuildingCommunity size={24} /> },
            { label: "Placement Rate", value: `${Math.round((TOTAL_PLACED / TOTAL_FELLOWS) * 100)}%`, color: "#2EC27E", icon: <IconTrendingUp size={24} /> },
            { label: "Avg Compliance", value: `${AVG_CHECKIN}%`, color: "#E8A020", icon: <IconCalendarCheck size={24} /> },
          ].map((s) => (
            <div key={s.label} className="gc" style={{ padding: "24px", display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${s.color}15`, border: `1px solid ${s.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center", color: s.color,
                boxShadow: `0 8px 20px -6px ${s.color}40`
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
          
          {/* Compliance Trend Line */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <IconDeviceAnalytics size={20} color="#3B8BEB" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Systemic Compliance Trend</h3>
            </div>
            <div style={{ flex: 1, minHeight: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyComplianceData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} domain={[70, 100]} />
                  <Tooltip 
                    contentStyle={{ background: "rgba(4,12,38,0.9)", backdropFilter: "blur(10px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)" }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#E8A020" strokeWidth={3} dot={{ fill: "#E8A020", r: 4, strokeWidth: 2, stroke: "#000" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deployment Split Pie */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Deployment Distribution</h3>
            <div style={{ flex: 1, minHeight: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={countryComparisonData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="fellows"
                    stroke="none"
                  >
                    {countryComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: "rgba(4,12,38,0.9)", backdropFilter: "blur(10px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)" }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Global Leaderboard Table */}
        <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IconChartBar size={20} color="#2EC27E" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Country Performance Audit</h3>
            </div>
            <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 600 }}>RANKED BY COHORT COMPLIANCE</div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.5fr 1fr",
              gap: 12, padding: "0 16px",
              fontSize: 10, color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800
            }}>
              <span>NATION</span><span>FELLOWS</span><span>ALUMNI</span><span>PLACED</span><span>COMPLIANCE</span><span>PROGRAMS</span>
            </div>
            
            {COUNTRIES.sort((a, b) => b.checkInRate - a.checkInRate).map((c) => (
              <div key={c.id} style={{
                display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.5fr 1fr",
                gap: 12, padding: "16px", alignItems: "center",
                background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)",
                transition: "all 0.2s"
              }} className="row-hover">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{c.flag}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>{c.name}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: c.color }}>{c.fellows}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ewhite)" }}>{c.alumni}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#2EC27E" }}>{c.placed}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{ 
                        width: `${c.checkInRate}%`, height: "100%", background: c.checkInRate >= 90 ? "#2EC27E" : "#E8A020",
                        boxShadow: `0 0 10px ${c.checkInRate >= 90 ? "#2EC27E" : "#E8A020"}50`
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ewhite)", minWidth: 40 }}>{c.checkInRate}%</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>{c.activePrograms}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ReportLayout>
  );
}
