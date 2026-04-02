"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId, type Project } from "@/lib/mock-data";
import {
  IconTarget,
  IconChartBar,
  IconUsers,
  IconBuildingBank,
  IconCalendarEvent,
  IconArrowRight,
  IconX,
  IconHeartHandshake,
  IconChartPie,
  IconTrendingUp,
  IconAward
} from "@tabler/icons-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type ExtendedProject = Project & {
  description: string;
  impactMetrics: { key: string; val: string; icon: any }[];
  cohortData: { name: string; placed: number; target: number }[];
};

export default function CountryProgramsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];
  const [selectedProject, setSelectedProject] = useState<ExtendedProject | null>(null);

  // Handle escape key to close panel
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedProject(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!country) return null;

  // Enrich data
  const getExtendedData = (p: Project): ExtendedProject => {
    if (p.name.includes("Women")) {
      return {
        ...p,
        description: "A transformative initiative addressing systemic barriers that prevent women from leadership in the Public Service. Promotes gender equality and strengthened institutional commitment.",
        impactMetrics: [
          { key: "Women Empowered", val: "45+", icon: IconUsers },
          { key: "Policy Briefs", val: "12", icon: IconTarget },
          { key: "Adoption Rate", val: "85%", icon: IconChartBar },
        ],
        cohortData: [
          { name: "2024", placed: 20, target: 20 },
          { name: "2025", placed: 22, target: 25 },
        ]
      };
    }
    if (p.name.includes("P.E.A.C.E")) {
      return {
        ...p,
        description: "Equipping security service professionals and community leaders with leadership and peacebuilding skills to strengthen civilian-security relations and promote lasting peace.",
        impactMetrics: [
          { key: "Trained Officers", val: "120", icon: IconUsers },
          { key: "Communities", val: "14", icon: IconBuildingBank },
          { key: "Conflict Res.", val: "94%", icon: IconHeartHandshake },
        ],
        cohortData: [
          { name: "2024", placed: 15, target: 15 },
          { name: "2025", placed: 30, target: 40 },
        ]
      };
    }
    return {
      ...p,
      description: "Our flagship one-year journey of growth, innovation, and leadership. Identifies exceptional individuals who exemplify our values of excellence, integrity, leadership, and public service.",
      impactMetrics: [
        { key: "Total Alumni", val: "142", icon: IconUsers },
        { key: "Gov Partners", val: "22", icon: IconBuildingBank },
        { key: "Retention", val: "91%", icon: IconTrendingUp },
      ],
      cohortData: [
        { name: "2022", placed: 18, target: 20 },
        { name: "2023", placed: 20, target: 20 },
        { name: "2024", placed: 22, target: 25 },
      ]
    };
  };

  const extendedProjects = country.projects.map(getExtendedData);
  const totalFellows = extendedProjects.reduce((acc, p) => acc + p.fellows, 0);

  return (
    <CountryLayout activePage="programs" pageTitle="Projects">
      
      {/* Dynamic Hub Header */}
      <div className="gc" style={{ padding: 32, borderRadius: 24, marginBottom: 32, border: "1px solid var(--gborder)", position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ position: "absolute", top: -50, right: 100, width: 200, height: 200, background: `radial-gradient(circle, ${country.color}40 0%, transparent 70%)`, borderRadius: "50%", filter: "blur(40px)" }} />
          
          <div style={{ zIndex: 1 }}>
              <div style={{ fontSize: 13, color: country.color, fontWeight: 800, fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>
                 {country.name} Operations Hub
              </div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                 Project Portfolio
              </h1>
              <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 500, lineHeight: 1.6 }}>
                 Managing {extendedProjects.length} strategic initiatives designed to modernize governance, cultivate equitable leadership, and ensure lasting institutional excellence.
              </p>
          </div>
          
          <div style={{ zIndex: 1, display: "flex", gap: 24 }}>
             <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{totalFellows}</div>
                <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Mission Personnel</div>
             </div>
             <div style={{ width: 1, height: 50, background: "var(--gborder)" }} />
             <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: country.color, fontFamily: "var(--font)" }}>{extendedProjects.length}</div>
                <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Live Deployments</div>
             </div>
          </div>
      </div>

      {/* Modern Horizontal Project List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
         {extendedProjects.map((p) => {
            const progress = p.status === "completed" ? 100 : p.name.includes("P") ? 35 : p.name.includes("Women") ? 55 : 85;
            const PIcon = p.name.includes("Women") ? IconHeartHandshake : p.name.includes("P") ? IconTarget : IconAward;

            return (
               <div 
                  key={p.name}
                  onClick={() => setSelectedProject(p)}
                  className="gc"
                  style={{
                     padding: 24, borderRadius: 20, border: "1px solid var(--gborder)", 
                     display: "grid", gridTemplateColumns: "auto 1fr 200px 200px", gap: 30, alignItems: "center",
                     cursor: "pointer", transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                     e.currentTarget.style.transform = "translateX(5px)";
                     e.currentTarget.style.borderColor = country.color;
                     e.currentTarget.style.background = "var(--gbs)";
                  }}
                  onMouseLeave={(e) => {
                     e.currentTarget.style.transform = "none";
                     e.currentTarget.style.borderColor = "var(--gborder)";
                     e.currentTarget.style.background = "var(--gb)";
                  }}
               >
                  {/* Icon */}
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: `${country.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: country.color }}>
                     <PIcon size={32} />
                  </div>

                  {/* Core Info */}
                  <div>
                     <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                           {p.name}
                        </h2>
                        <span style={{ 
                           fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 12, 
                           background: p.status === "active" ? "#2EC27E20" : "#3B8BEB20", 
                           color: p.status === "active" ? "#2EC27E" : "#3B8BEB",
                           textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)"
                        }}>
                           {p.status}
                        </span>
                     </div>
                     <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description}
                     </p>
                  </div>

                  {/* Mini Stats (Primary Metric) */}
                  <div style={{ paddingLeft: 24, borderLeft: "1px solid var(--gborder)" }}>
                     <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                        {p.impactMetrics[0].key}
                     </div>
                     <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 8 }}>
                        {p.impactMetrics[0].val}
                        <IconTrendingUp size={18} style={{ color: country.color }}/>
                     </div>
                  </div>

                  {/* Deployment Progress ProgressBar */}
                  <div style={{ paddingLeft: 24, borderLeft: "1px solid var(--gborder)" }}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase" }}>Deployment</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: country.color, fontFamily: "var(--font)" }}>{progress}%</span>
                     </div>
                     <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: country.color, borderRadius: 10 }} />
                     </div>
                     <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                        <IconCalendarEvent size={12}/> Est. {p.startDate}
                     </div>
                  </div>

               </div>
            )
         })}
      </div>

      {/* Slide-out Panel Overlay */}
      {selectedProject && (
         <div 
           className="slider-overlay"
           onClick={() => setSelectedProject(null)}
           style={{
             position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
             background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
             zIndex: 9998, display: "flex", justifyContent: "flex-end"
           }}
         >
            <div 
               className="sidebar-panel"
               onClick={(e) => e.stopPropagation()}
               style={{
                  width: "500px", height: "100%", background: "var(--gbs)", borderLeft: "1px solid var(--gborder)",
                  boxShadow: "-20px 0 50px rgba(0,0,0,0.15)", zIndex: 9999,
                  overflowY: "auto", display: "flex", flexDirection: "column",
                  backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)"
               }}
            >
               {/* Panel Header */}
               <div style={{ 
                   padding: "30px 24px", borderBottom: "1px solid var(--gborder)", 
                   background: `linear-gradient(180deg, ${country.color}20 0%, transparent 100%)`,
                   display: "flex", flexDirection: "column", gap: 20, position: "relative"
               }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{
                         width: 64, height: 64, borderRadius: 16, background: `${country.color}20`,
                         border: `1px solid ${country.color}40`,
                         display: "flex", alignItems: "center", justifyContent: "center", color: country.color
                      }}>
                         {selectedProject.name.includes("Women") ? <IconHeartHandshake size={32} /> : selectedProject.name.includes("P.E.A") ? <IconTarget size={32}/> : <IconUsers size={32}/>}
                      </div>
                      <button 
                         onClick={() => setSelectedProject(null)}
                         style={{ 
                            background: "var(--gborder)", border: "none", width: 32, height: 32, borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ewhite)"
                         }}
                      >
                         <IconX size={18} />
                      </button>
                  </div>
                  <div>
                      <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                         {selectedProject.name}
                      </h2>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                         <span style={{ 
                            fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 12, 
                            background: selectedProject.status === "active" ? "#2EC27E20" : "#3B8BEB20", 
                            color: selectedProject.status === "active" ? "#2EC27E" : "#3B8BEB",
                            textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)"
                         }}>
                            {selectedProject.status}
                         </span>
                         <span style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 4 }}>
                            <IconCalendarEvent size={16}/> Launched {selectedProject.startDate}
                         </span>
                      </div>
                  </div>
               </div>

               {/* Panel Body */}
               <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
                  
                  {/* Synopsis */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                     <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                        Project Synopsis
                     </h3>
                     <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.6 }}>
                        {selectedProject.description}
                     </p>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--gborder)", margin: 0 }} />

                  {/* Impact Highlight Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                     {selectedProject.impactMetrics.map((metric, i) => (
                        <div key={i} className="gc" style={{ padding: 16, borderRadius: 12, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center", border: "1px solid var(--gborder)" }}>
                           <metric.icon size={24} style={{ color: country.color }} />
                           <div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{metric.val}</div>
                              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{metric.key}</div>
                           </div>
                        </div>
                     ))}
                  </div>

                  {/* Placement Analytics */}
                  <div className="gc" style={{ padding: "24px 20px", borderRadius: 16, border: "1px solid var(--gborder)", background: "rgba(0,0,0,0.1)" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <IconChartPie size={18} style={{ color: country.color }} />
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                           Placement Trajectory vs Target
                        </h3>
                     </div>
                     <div style={{ height: 200, width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={selectedProject.cohortData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--gborder)" vertical={false} />
                              <XAxis dataKey="name" tick={{ fill: "var(--emuted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "var(--emuted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                              <Tooltip 
                                 cursor={{ fill: "rgba(255,255,255,0.05)" }}
                                 contentStyle={{ background: "var(--gbs)", border: "1px solid var(--gborder)", borderRadius: 8, fontSize: 12, color: "var(--ewhite)" }}
                                 itemStyle={{ color: "var(--ewhite)", fontWeight: 700 }}
                              />
                              <Bar dataKey="placed" name="Placed Fellows" fill={country.color} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="target" name="Target Cap" fill={`${country.color}40`} radius={[4, 4, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

               </div>
               
               {/* Panel Actions */}
               <div style={{ marginTop: "auto", padding: 24, borderTop: "1px solid var(--gborder)", display: "flex", gap: 12 }}>
                  <button 
                     style={{ 
                        flex: 1, padding: "12px", borderRadius: 10, background: country.color, color: "#fff", 
                        border: "none", fontSize: 13, fontWeight: 700, fontFamily: "var(--font)", cursor: "pointer",
                        boxShadow: `0 4px 12px ${country.color}40`
                     }}
                  >
                     View Active Fellows
                  </button>
                  <button 
                     onClick={() => router.push(`/dashboard/countries/${id}/programs/${selectedProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)}
                     style={{ 
                        padding: "12px 20px", borderRadius: 10, background: "transparent", color: "var(--ewhite)", 
                        border: "1px solid var(--gborder)", fontSize: 13, fontWeight: 700, fontFamily: "var(--font)", cursor: "pointer"
                     }}
                  >
                     More Details
                  </button>
               </div>
            </div>
         </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .sidebar-panel {
          animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </CountryLayout>
  );
}
