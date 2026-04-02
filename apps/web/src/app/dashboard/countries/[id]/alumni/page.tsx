"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import { OrgTree } from "@/components/epl/org-tree";
import {
  IconSearch,
  IconBriefcase,
  IconBuildingCommunity,
  IconMail,
  IconPhoneCall,
  IconX,
  IconSchool,
  IconAward,
  IconArrowRight,
  IconArrowLeft
} from "@tabler/icons-react";

// Massive Mock Data for Alumni Table
const ALUMNI_DIRECTORY = Array.from({ length: 42 }).map((_, i) => {
  const isC3 = i % 3 === 0;
  const isC4 = i % 4 === 0;
  return {
    id: `alum_${i}`,
    name: `Alumni Member ${i + 1}`,
    cohort: isC3 ? 3 : isC4 ? 4 : 5,
    gender: i % 2 === 0 ? "Female" : "Male",
    employer: isC3 ? "Ministry of Finance" : isC4 ? "World Bank" : "Ministry of Education",
    role: isC3 ? "Senior Director" : isC4 ? "Policy Analyst" : "Program Manager",
    email: `alum${i}@example.com`,
    phone: `+233 24 000 ${1000 + i}`,
    description: "An accomplished leader actively shaping national policy frameworks within their respective ministries, embodying the core values of the Emerging Public Leaders programme.",
    impact: "Led the digital transformation strategy resulting in 30% efficiency gains across 5 departments."
  };
});

// Mock Data for the Heritage/Org Tree
const ALUMNI_TREE = {
   id: "t_1", name: "Ministry of Finance", role: "National Hub", tier: 0, 
   children: [
      {
         id: "t_2", name: "Ama Serwah", role: "Director of Budgeting", country: "3", tier: 1, fellows: 2,
         children: [
            { id: "t_3", name: "Kofi Mensah", role: "Financial Analyst", country: "4", tier: 2, fellows: 0 },
            { id: "t_4", name: "Sarah Osei", role: "Tax Policy Lead", country: "4", tier: 2, fellows: 0 }
         ]
      },
      {
         id: "t_5", name: "David Tetteh", role: "Head of Macroeconomics", country: "2", tier: 1, fellows: 1,
         children: [
            { id: "t_6", name: "Grace B.", role: "Research Officer", country: "5", tier: 2, fellows: 0 }
         ]
      }
   ]
};

export default function AlumniPage() {
  const params = useParams();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];
  
  const [activeTab, setActiveTab] = useState<"directory" | "heritage">("directory");
  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState<number | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAlum, setSelectedAlum] = useState<any>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAlum(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!country) return null;

  const filteredData = ALUMNI_DIRECTORY.filter(a => {
     if (cohortFilter !== "all" && a.cohort !== cohortFilter) return false;
     if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
     return true;
  });

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <CountryLayout activePage="alumni" pageTitle="Alumni Network">
       
       {/* Hub Header */}
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 8 }}>
              Alumni Network
            </div>
            <div style={{ fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)" }}>
              A powerful network of graduated fellows shaping policy globally.
            </div>
          </div>
          
          {/* Custom Tabs */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 6, border: "1px solid var(--gborder)" }}>
             <button 
                onClick={() => setActiveTab("directory")}
                style={{ 
                   padding: "10px 20px", borderRadius: 8, cursor: "pointer", border: "none",
                   background: activeTab === "directory" ? "var(--gbs)" : "transparent",
                   color: activeTab === "directory" ? "var(--ewhite)" : "var(--emuted)",
                   fontWeight: 700, fontSize: 13, fontFamily: "var(--font)",
                   boxShadow: activeTab === "directory" ? "var(--shadow)" : "none", transition: "all 0.2s"
                }}
             >Directory List</button>
             <button 
                onClick={() => setActiveTab("heritage")}
                style={{ 
                   padding: "10px 20px", borderRadius: 8, cursor: "pointer", border: "none",
                   background: activeTab === "heritage" ? "var(--gbs)" : "transparent",
                   color: activeTab === "heritage" ? "var(--ewhite)" : "var(--emuted)",
                   fontWeight: 700, fontSize: 13, fontFamily: "var(--font)",
                   boxShadow: activeTab === "heritage" ? "var(--shadow)" : "none", transition: "all 0.2s"
                }}
             >Heritage Tree</button>
          </div>
      </div>

      {activeTab === "directory" && (
         <div className="gc" style={{ padding: 24, borderRadius: 20, border: "1px solid var(--gborder)", background: "var(--gb)", display: "flex", flexDirection: "column", gap: 24 }}>
             
             {/* Toolbar */}
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.1)", border: "1px solid var(--gborder)", padding: "10px 16px", borderRadius: 12 }}>
                         <IconSearch size={16} style={{ color: "var(--emuted)" }}/>
                         <input 
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search alumni network..."
                            style={{ background: "transparent", border: "none", outline: "none", color: "var(--ewhite)", width: 250, fontSize: 13, fontFamily: "var(--font)" }}
                         />
                     </div>
                     <select 
                        value={cohortFilter} onChange={e => { setCohortFilter(e.target.value === "all" ? "all" : Number(e.target.value)); setCurrentPage(1); }}
                        style={{ padding: "12px 16px", background: "rgba(0,0,0,0.1)", border: "1px solid var(--gborder)", borderRadius: 12, color: "var(--ewhite)", fontSize: 13, fontFamily: "var(--font)", outline: "none", cursor: "pointer" }}
                     >
                        <option value="all">All Cohorts</option>
                        <option value="3">Cohort 3</option>
                        <option value="4">Cohort 4</option>
                        <option value="5">Cohort 5</option>
                     </select>
                 </div>
                 <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 600 }}>
                     {filteredData.length} active matching records
                 </div>
             </div>

             {/* Table */}
             <div style={{ overflowX: "auto" }}>
                 <table style={{ width: "100%", borderCollapse: "collapse" }}>
                     <thead>
                         <tr>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: 11, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid var(--gborder)" }}>Alumni Member</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: 11, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid var(--gborder)" }}>Graduated Cohort</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: 11, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid var(--gborder)" }}>Current Institution</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: 11, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid var(--gborder)" }}>Current Designation</th>
                         </tr>
                     </thead>
                     <tbody>
                         {paginatedData.map(a => (
                            <tr key={a.id} onClick={() => setSelectedAlum(a)} style={{ cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                               <td style={{ padding: "16px", borderBottom: "1px solid var(--gborder)", display: "flex", alignItems: "center", gap: 12 }}>
                                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${country.color}20`, color: country.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                                     {a.name.split(" ").map(w => w[0]).join("")}
                                  </div>
                                  <div>
                                     <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 2 }}>{a.name}</div>
                                     <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{a.gender}</div>
                                  </div>
                               </td>
                               <td style={{ padding: "16px", borderBottom: "1px solid var(--gborder)" }}>
                                   <span style={{ padding: "4px 10px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid var(--gborder)", color: "var(--ewhite)", fontSize: 11, fontWeight: 700, fontFamily: "var(--font)" }}>
                                      Cohort {a.cohort}
                                   </span>
                               </td>
                               <td style={{ padding: "16px", borderBottom: "1px solid var(--gborder)", fontSize: 13, color: "var(--ewhite)", fontFamily: "var(--font)", fontWeight: 500 }}>
                                   {a.employer}
                               </td>
                               <td style={{ padding: "16px", borderBottom: "1px solid var(--gborder)", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                                   {a.role}
                               </td>
                            </tr>
                         ))}
                     </tbody>
                 </table>
                 {paginatedData.length === 0 && (
                     <div style={{ padding: 40, textAlign: "center", color: "var(--emuted)", fontSize: 14, fontFamily: "var(--font)" }}>No alumni found matching existing filters.</div>
                 )}
             </div>

             {/* Pagination */}
             {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 8 }}>
                   <button 
                      disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                      style={{ padding: "8px", borderRadius: 8, background: "var(--gborder)", border: "none", color: "var(--ewhite)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.3 : 1 }}
                   ><IconArrowLeft size={16}/></button>
                   <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 600 }}>Page {currentPage} of {totalPages}</div>
                   <button 
                      disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                      style={{ padding: "8px", borderRadius: 8, background: "var(--gborder)", border: "none", color: "var(--ewhite)", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.3 : 1 }}
                   ><IconArrowRight size={16}/></button>
                </div>
             )}
         </div>
      )}

      {activeTab === "heritage" && (
         <div className="gc" style={{ padding: "40px 24px", borderRadius: 20, border: "1px solid var(--gborder)", background: "var(--gb)" }}>
             <OrgTree 
                 data={ALUMNI_TREE} 
                 mode="org" 
                 defaultExpanded={3} 
                 onNodeClick={(node) => setSelectedAlum({ ...node, employer: node.name, cohort: node.country })}
             />
         </div>
      )}

      {/* Alumni Profile Slide Panel */}
      {selectedAlum && (
         <div 
           className="slider-overlay"
           onClick={() => setSelectedAlum(null)}
           style={{
             position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
             background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
             zIndex: 9998, display: "flex", justifyContent: "flex-end"
           }}
         >
            <div 
               className="sidebar-panel"
               onClick={(e) => e.stopPropagation()}
               style={{
                  width: "480px", height: "100%", background: "var(--gbs)", borderLeft: "1px solid var(--gborder)",
                  boxShadow: "-30px 0 60px rgba(0,0,0,0.25)", zIndex: 9999,
                  overflowY: "auto", display: "flex", flexDirection: "column",
                  backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)"
               }}
            >
               {/* Header Hero */}
               <div style={{ 
                   padding: "40px 30px", borderBottom: "1px solid var(--gborder)", 
                   background: `linear-gradient(180deg, ${country.color}20 0%, transparent 100%)`,
                   position: "relative"
               }}>
                   <button 
                      onClick={() => setSelectedAlum(null)}
                      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--gborder)", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ewhite)", position: "absolute", top: 24, right: 24 }}
                   >
                      <IconX size={18} />
                   </button>
                   
                   <div style={{ width: 80, height: 80, borderRadius: 24, background: `${country.color}20`, border: `1px solid ${country.color}40`, display: "flex", alignItems: "center", justifyContent: "center", color: country.color, marginBottom: 20, fontSize: 24, fontWeight: 800, fontFamily: "var(--font)" }}>
                      {selectedAlum.name.split(" ").map((w: string) => w[0]).join("")}
                   </div>
                   <h2 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.2 }}>
                      {selectedAlum.name}
                   </h2>
                   <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: "6px 14px", borderRadius: 20, background: country.color, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)" }}>
                         Cohort {selectedAlum.cohort}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>{selectedAlum.gender || "Alumni"}</span>
                   </div>
               </div>

               {/* Profile Info */}
               <div style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 32 }}>
                   
                   {/* Placement block */}
                   <div>
                       <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, fontWeight: 700 }}>
                          Current Placement Designation
                       </div>
                       <div className="gc" style={{ padding: 20, borderRadius: 16, border: "1px solid var(--gborder)", background: "rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: 16 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                             <IconBuildingCommunity size={24} style={{ color: country.color, marginTop: 4 }}/>
                             <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 4 }}>{selectedAlum.employer}</div>
                                <div style={{ fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)" }}>{selectedAlum.role}</div>
                             </div>
                          </div>
                       </div>
                   </div>

                   {/* Description */}
                   <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Network Bio</h3>
                      <p style={{ margin: 0, fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.7 }}>
                         {selectedAlum.description || "An accomplished leader actively shaping national policy frameworks within their respective ministries."}
                      </p>
                   </div>

                   {/* Impact Highlight */}
                   <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 8 }}>
                         <IconAward size={20} style={{ color: "#E8A020" }}/> Strategic Impact
                      </h3>
                      <div className="gc" style={{ padding: 20, borderRadius: 16, border: "1px dashed var(--gborder)", background: "transparent", fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.6 }}>
                         {selectedAlum.impact || "Led transformation strategies resulting in significant efficiency gains across departments."}
                      </div>
                   </div>

                   {/* Contact block */}
                   <div>
                      <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Contact Information</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                             <IconMail size={18} style={{ color: "var(--emuted)" }}/>
                             <a href={`mailto:${selectedAlum.email}`} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textDecoration: "none" }}>{selectedAlum.email || "alum@example.com"}</a>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                             <IconPhoneCall size={18} style={{ color: "var(--emuted)" }}/>
                             <a href={`tel:${selectedAlum.phone}`} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textDecoration: "none" }}>{selectedAlum.phone || "+233 24 000 000"}</a>
                          </div>
                      </div>
                   </div>
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
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

    </CountryLayout>
  );
}
