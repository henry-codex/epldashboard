"use client";

import { AppShell } from "@/components/epl/app-shell";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  AreaChart, Area, CartesianGrid, PieChart, Pie, Legend
} from "recharts";
import { 
  IconUsers, IconActivity, IconMapPins, IconBuildingCommunity, IconBriefcase
} from "@tabler/icons-react";

// Aggregated Global Data for the Dashboard
const globalStats = {
  totalFellows: 210,
  activeNow: 87,
  alumni: 123,
  countries: 5,
  institutions: 72,
};

const countryData = [
  { name: "Ghana", fellows: 87, color: "#E8A020" },
  { name: "Kenya", fellows: 44, color: "#2EC27E" },
  { name: "Liberia", fellows: 36, color: "#E05C5C" },
  { name: "Malawi", fellows: 22, color: "#3B8BEB" },
  { name: "Sierra Leone", fellows: 21, color: "#7F77DD" },
];

const genderData = [
  { name: "Female", value: 58, color: "#7F77DD" },
  { name: "Male", value: 42, color: "#3B8BEB" },
];

const statusData = [
  { name: "Active Deployment", value: 87, color: "#2EC27E" },
  { name: "Completed/Alumni", value: 110, color: "#3B8BEB" },
  { name: "Deferment/On-Leave", value: 13, color: "#E8A020" },
];

const cohortGrowthData = [
  { year: "2018", intake: 20 },
  { year: "2019", intake: 25 },
  { year: "2020", intake: 15 }, // Pandemic dip
  { year: "2021", intake: 35 },
  { year: "2022", intake: 45 },
  { year: "2023", intake: 50 },
  { year: "2024", intake: 65 },
  { year: "2025", intake: 80 },
];

const highlights = [
  { country: "Ghana", text: "Cohort 7 deployed to 12 new ministries.", color: "#E8A020" },
  { country: "Kenya", text: "94% partner retention rate over 3 years.", color: "#2EC27E" },
  { country: "Liberia", text: "Alumnus appointed as Deputy Minister of Health.", color: "#E05C5C" },
  { country: "Sierra Leone", text: "Launched exclusive Women-in-Leadership track.", color: "#7F77DD" }
];

export default function GlobalFellowsDashboard() {
  return (
    <AppShell activePage="fellows" pageTitle="Global Fellows Intelligence">
      
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: "0 0 8px 0", fontFamily: "var(--font)" }}>
          Global Fellows Intelligence
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: "var(--emuted)", fontFamily: "var(--font)" }}>
          Aggregating impact, demographics, and deployment metrics across the Pan-African network.
        </p>
      </div>

      {/* Top Value Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginBottom: 32 }}>
         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(59,139,235,0.15)", border: "1px solid rgba(59,139,235,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B8BEB" }}>
               <IconUsers size={24} />
            </div>
            <div>
               <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 700 }}>Total Inducted</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{globalStats.totalFellows}</div>
            </div>
         </div>
         
         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(46,194,126,0.15)", border: "1px solid rgba(46,194,126,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2EC27E" }}>
               <IconActivity size={24} />
            </div>
            <div>
               <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 700 }}>Active in Field</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{globalStats.activeNow}</div>
            </div>
         </div>

         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(232,160,32,0.15)", border: "1px solid rgba(232,160,32,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E8A020" }}>
               <IconMapPins size={24} />
            </div>
            <div>
               <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 700 }}>Active Countries</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{globalStats.countries}</div>
            </div>
         </div>

         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(127,119,221,0.15)", border: "1px solid rgba(127,119,221,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7F77DD" }}>
               <IconBuildingCommunity size={24} />
            </div>
            <div>
               <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, fontWeight: 700 }}>Alumni Network</div>
               <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{globalStats.alumni}</div>
            </div>
         </div>
      </div>

      {/* Main Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
          
          {/* Cohort Growth Area Chart */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
             <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Cohort Intake Growth</h3>
             <div style={{ flex: 1, minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={cohortGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIntake" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B8BEB" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3B8BEB" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="year" stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                         contentStyle={{ background: "rgba(4,12,38,0.8)", backdropFilter: "blur(10px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)", fontFamily: "var(--font)" }}
                         itemStyle={{ color: "#3B8BEB", fontWeight: 700 }}
                      />
                      <Area type="monotone" dataKey="intake" stroke="#3B8BEB" strokeWidth={3} fillOpacity={1} fill="url(#colorIntake)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Gender Demographics Donut */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
             <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Gender Diversity</h3>
             <div style={{ flex: 1, minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="45%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {genderData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 8px ${entry.color}50)` }} />
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 24, paddingBottom: 60 }}>
          
          {/* Status Breakdown Pie */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
             <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Operational Status Matrix</h3>
             <div style={{ flex: 1, minHeight: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 10px ${entry.color}40)` }} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ background: "rgba(4,12,38,0.8)", backdropFilter: "blur(10px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)", fontFamily: "var(--font)" }}
                         itemStyle={{ fontWeight: 700 }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", bottom: 0 }} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Scale: Fellows by Country */}
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
             <h3 style={{ margin: "0 0 24px 0", fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Deployment Scale by Country</h3>
             <div style={{ flex: 1, minHeight: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={countryData} layout="vertical" margin={{ top: 0, right: 30, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="var(--ewhite)" fontSize={13} fontWeight={600} tickLine={false} axisLine={false} width={100} />
                      <Tooltip 
                         cursor={{ fill: "rgba(255,255,255,0.05)" }}
                         contentStyle={{ background: "rgba(4,12,38,0.8)", backdropFilter: "blur(10px)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)", fontFamily: "var(--font)" }}
                      />
                      <Bar dataKey="fellows" radius={[0, 8, 8, 0]} barSize={24}>
                         {countryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0 0 8px ${entry.color}50)` }} />
                         ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>
      
    </AppShell>
  );
}
