"use client";

import { AlumniLayout } from "@/components/epl/alumni-layout";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area, CartesianGrid, PieChart, Pie, Legend
} from "recharts";
import { 
  IconUsers, IconBriefcase, IconMapPins, IconAward
} from "@tabler/icons-react";

// Massive Aggregated Alumni Data
const globalStats = {
  totalAlumni: 344,
  countries: 5,
  executives: 12,
  retentionRate: 88,
};

const sectorData = [
  { name: "Public Health", value: 85, color: "#2EC27E" },
  { name: "Finance & Econ", value: 64, color: "#E8A020" },
  { name: "Education", value: 72, color: "#3B8BEB" },
  { name: "Technology", value: 45, color: "#7F77DD" },
  { name: "Environment", value: 38, color: "#9B59B6" },
  { name: "Defense / Security", value: 40, color: "#E05C5C" },
];

const impactGrowthData = [
  { year: "2019", alumni: 20 },
  { year: "2020", alumni: 45 },
  { year: "2021", alumni: 80 },
  { year: "2022", alumni: 125 },
  { year: "2023", alumni: 175 },
  { year: "2024", alumni: 240 },
  { year: "2025", alumni: 300 },
  { year: "2026", alumni: 344 },
];

const placementStatusData = [
  { name: "Retained in Govt", value: 65, color: "#2EC27E" },
  { name: "Private Sector", value: 20, color: "#3B8BEB" },
  { name: "Further Education", value: 10, color: "#7F77DD" },
  { name: "Unassigned", value: 5, color: "#E05C5C" },
];

export default function ContinentalAlumniDashboard() {
  return (
    <AlumniLayout activePage="dashboard" pageTitle="Continental Dashboard">
      
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: "0 0 8px 0", fontFamily: "var(--font)" }}>
          Continental Alumni Network
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: "var(--emuted)", fontFamily: "var(--font)" }}>
          Aggregating post-fellowship placement, retention, and impact metrics across Africa.
        </p>
      </div>

      {/* Top Value Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(46,194,126,0.15)", border: "1px solid rgba(46,194,126,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2EC27E" }}>
               <IconUsers size={24} />
            </div>
            <div>
               <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 700 }}>Total Alumni</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{globalStats.totalAlumni}</div>
            </div>
         </div>
         
         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(59,139,235,0.15)", border: "1px solid rgba(59,139,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B8BEB" }}>
               <IconMapPins size={24} />
            </div>
            <div>
               <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 700 }}>Country Networks</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{globalStats.countries}</div>
            </div>
         </div>

         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(232,160,32,0.15)", border: "1px solid rgba(232,160,32,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E8A020" }}>
               <IconAward size={24} />
            </div>
            <div>
               <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 700 }}>Executive Board</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{globalStats.executives}</div>
            </div>
         </div>

         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(127,119,221,0.15)", border: "1px solid rgba(127,119,221,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7F77DD" }}>
               <IconBriefcase size={24} />
            </div>
            <div>
               <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 700 }}>Govt Retention</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{globalStats.retentionRate}%</div>
            </div>
         </div>
      </div>

      {/* Main Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
          
          {/* Alumni Growth Over Time */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
             <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Cumulative Network Growth</h3>
             <div style={{ flex: 1, minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={impactGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAlumni" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2EC27E" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#2EC27E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="year" stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                         contentStyle={{ background: "rgba(4,12,38,0.8)", backdropFilter: "blur(10px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)", fontFamily: "var(--font)" }}
                         itemStyle={{ color: "#2EC27E", fontWeight: 700 }}
                      />
                      <Area type="monotone" dataKey="alumni" stroke="#2EC27E" strokeWidth={3} fillOpacity={1} fill="url(#colorAlumni)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Placement Status */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
             <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Post-Fellowship Retention</h3>
             <div style={{ flex: 1, minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={placementStatusData}
                        cx="50%"
                        cy="45%"
                        innerRadius={90}
                        outerRadius={120}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {placementStatusData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 8px ${entry.color}40)` }} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ background: "rgba(4,12,38,0.8)", backdropFilter: "blur(10px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)", fontFamily: "var(--font)" }}
                         formatter={(val) => [`${val}%`, "Population"]}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", bottom: 0 }} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, paddingBottom: 60 }}>
          
          {/* Sector Placements Bar Chart */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
             <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Cross-Sector Deployment Strategy</h3>
             <div style={{ flex: 1, minHeight: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={sectorData} layout="vertical" margin={{ top: 0, right: 30, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="var(--ewhite)" fontSize={13} fontWeight={600} tickLine={false} axisLine={false} width={130} />
                      <Tooltip 
                         cursor={{ fill: "rgba(255,255,255,0.05)" }}
                         contentStyle={{ background: "rgba(4,12,38,0.8)", backdropFilter: "blur(10px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)", fontFamily: "var(--font)" }}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                         {sectorData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 8px ${entry.color}50)` }} />
                         ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>
      
    </AlumniLayout>
  );
}
