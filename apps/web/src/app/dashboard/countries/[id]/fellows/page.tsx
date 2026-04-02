"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, ALL_FELLOWS, type CountryId, type Fellow } from "@/lib/mock-data";
import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconUsers,
  IconGenderMale,
  IconGenderFemale,
  IconX,
  IconMail,
  IconPhone,
  IconSchool,
  IconMapPin,
  IconBriefcase,
  IconCircleCheck,
  IconAward,
  IconCheck
} from "@tabler/icons-react";

const ITEMS_PER_PAGE = 8;

export default function CountryFellowsPage() {
  const params = useParams();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFellow, setSelectedFellow] = useState<Fellow | null>(null);

  // Handle escape key to close panel
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedFellow(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!country) return null;

  const allCountryFellows = ALL_FELLOWS.filter((f) => f.country === id);
  
  // Filter by search query
  const filteredFellows = allCountryFellows.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.institution.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredFellows.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentFellows = filteredFellows.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Gender Stats Calculate
  const malesCount = allCountryFellows.filter((f) => f.gender === "Male").length;
  const femalesCount = allCountryFellows.filter((f) => f.gender === "Female").length;

  const getStatusColor = (s: string) => {
     if (s === "active" || s === "on-track") return "#2EC27E";
     if (s === "on-leave" || s === "late" || s === "completed") return "#E8A020";
     return "#E05C5C";
  };

  return (
    <CountryLayout activePage="fellows" pageTitle="Fellows">
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
        
        {/* Header & Stats Widget */}
         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 12 }}>
                {country.name} Fellows
              </div>
              
              {/* Gender and Summary Stats */}
              <div style={{ display: "flex", gap: 10 }}>
                <div className="gc" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 6, borderRadius: 6, background: "rgba(46,194,126,0.15)", color: "#2EC27E" }}>
                      <IconUsers size={16} />
                    </div>
                    <div>
                       <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ewhite)" }}>{allCountryFellows.length}</div>
                       <div style={{ fontSize: 10, color: "var(--emuted)" }}>Total Active</div>
                    </div>
                </div>

                <div className="gc" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 6, borderRadius: 6, background: "rgba(59,139,235,0.15)", color: "#3B8BEB" }}>
                      <IconGenderMale size={16} />
                    </div>
                    <div>
                       <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ewhite)" }}>{malesCount}</div>
                       <div style={{ fontSize: 10, color: "var(--emuted)" }}>Male</div>
                    </div>
                </div>

                <div className="gc" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ padding: 6, borderRadius: 6, background: "rgba(155,89,182,0.15)", color: "#9B59B6" }}>
                      <IconGenderFemale size={16} />
                    </div>
                    <div>
                       <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ewhite)" }}>{femalesCount}</div>
                       <div style={{ fontSize: 10, color: "var(--emuted)" }}>Female</div>
                    </div>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="gc" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", width: "240px", border: "1px solid var(--eborder)",
              borderRadius: "8px", background: "var(--eglass)"
            }}>
              <IconSearch size={16} style={{ color: "var(--emuted)" }} />
              <input 
                 type="text" 
                 placeholder="Search fellows…" 
                 value={searchQuery}
                 onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                 style={{ 
                    border: "none", background: "transparent", outline: "none", color: "var(--ewhite)", 
                    fontFamily: "var(--font)", fontSize: 12, width: "100%" 
                 }}
              />
            </div>
         </div>

        {/* Table container */}
        <div className="gc" style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 16 }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 2fr 1fr 2fr 1.5fr 1fr",
            gap: 8, padding: "16px 20px", borderBottom: "1px solid var(--eborder)",
            fontSize: 10, color: "var(--emuted)", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font)",
          }}>
            <span>Avatar</span><span>Name</span><span>Cohort</span><span>Project</span>
            <span>Institution</span><span>Status</span>
          </div>

          {/* Rows */}
          {currentFellows.map((f) => (
            <div 
              key={f.id} 
              onClick={() => setSelectedFellow(f)}
              style={{
                display: "grid", gridTemplateColumns: "1fr 2fr 1fr 2fr 1.5fr 1fr",
                gap: 8, padding: "12px 20px", alignItems: "center", cursor: "pointer",
                borderBottom: "1px solid rgba(150,150,150,0.1)",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--eborder)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: f.gender === "Female" ? "#9B59B620" : "#3B8BEB20", 
                border: `1px solid ${f.gender === "Female" ? "#9B59B650" : "#3B8BEB50"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: f.gender === "Female" ? "#9B59B6" : "#3B8BEB", fontFamily: "var(--font)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                {f.name.split(" ").map(n => n.charAt(0)).join("").substring(0, 2)}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{f.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: country.color, fontFamily: "var(--font)", padding: "2px 8px", background: `${country.color}15`, borderRadius: 12, width: "fit-content" }}>{f.cohort}</span>
              <span style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 500 }}>{f.project}</span>
              <span style={{ fontSize: 12, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{f.institution}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, textTransform: "capitalize", fontFamily: "var(--font)",
                color: f.status === "active" ? "#2EC27E" : f.status === "completed" ? "#3B8BEB" : "#E8A020",
              }}>
                {f.status}
              </span>
            </div>
          ))}

          {currentFellows.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--emuted)", fontSize: 13 }}>
              No fellows matched your search.
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 0", borderTop: "1px solid var(--eborder)" }}>
                <span style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                   Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredFellows.length)} of {filteredFellows.length} fellows
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                   <button 
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={currentPage === 1}
                     style={{ 
                         padding: "6px 12px", background: currentPage === 1 ? "transparent" : "var(--eborder)", 
                         border: "1px solid var(--eborder)", borderRadius: 6, color: currentPage === 1 ? "var(--emuted)" : "var(--ewhite)",
                         display: "flex", alignItems: "center", gap: 4, cursor: currentPage === 1 ? "not-allowed" : "pointer",
                         fontFamily: "var(--font)", fontSize: 12, fontWeight: 600
                     }}
                   >
                     <IconChevronLeft size={14} /> Prev
                   </button>
                   <button 
                     onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                     disabled={currentPage === totalPages}
                     style={{ 
                         padding: "6px 12px", background: currentPage === totalPages ? "transparent" : "var(--eborder)", 
                         border: "1px solid var(--eborder)", borderRadius: 6, color: currentPage === totalPages ? "var(--emuted)" : "var(--ewhite)",
                         display: "flex", alignItems: "center", gap: 4, cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                         fontFamily: "var(--font)", fontSize: 12, fontWeight: 600
                     }}
                   >
                     Next <IconChevronRight size={14} />
                   </button>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Slide-out Panel Overlay */}
      {selectedFellow && (
         <div 
           className="slider-overlay"
           onClick={() => setSelectedFellow(null)}
           style={{
             position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
             background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
             zIndex: 9998, display: "flex", justifyContent: "flex-end"
           }}
         >
            {/* The Panel */}
            <div 
               className="gc sidebar-panel"
               onClick={(e) => e.stopPropagation()}
               style={{
                  width: "450px", height: "100%", background: "var(--gbs)", borderLeft: "1px solid var(--gborder)",
                  boxShadow: "-20px 0 50px rgba(0,0,0,0.15)", zIndex: 9999,
                  overflowY: "auto", display: "flex", flexDirection: "column"
               }}
            >
               {/* Panel Header */}
               <div style={{ 
                   padding: "24px", borderBottom: "1px solid var(--eborder)", 
                   display: "flex", flexDirection: "column", gap: 20, position: "relative"
               }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{
                          width: 80, height: 80, borderRadius: "50%",
                          background: selectedFellow.gender === "Female" ? "#9B59B625" : "#3B8BEB25", 
                          border: `2px solid ${selectedFellow.gender === "Female" ? "#9B59B660" : "#3B8BEB60"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 28, fontWeight: 800, color: selectedFellow.gender === "Female" ? "#9B59B6" : "#3B8BEB", 
                          fontFamily: "var(--font)", boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
                      }}>
                          {selectedFellow.name.split(" ").map(n => n.charAt(0)).join("").substring(0, 2)}
                      </div>
                      <button 
                         onClick={() => setSelectedFellow(null)}
                         style={{ 
                            background: "var(--eborder)", border: "none", width: 32, height: 32, borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--emuted)"
                         }}
                      >
                         <IconX size={18} />
                      </button>
                  </div>
                  <div>
                      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                         {selectedFellow.name}
                      </h2>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                         <span style={{ 
                            fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 12, 
                            background: `${getStatusColor(selectedFellow.status)}20`, color: getStatusColor(selectedFellow.status), 
                            border: `1px solid ${getStatusColor(selectedFellow.status)}40`, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)"
                         }}>
                            {selectedFellow.status}
                         </span>
                         <span style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 500 }}>
                            {selectedFellow.project}
                         </span>
                      </div>
                  </div>
               </div>

               {/* Panel Body */}
               <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
                  
                  {/* Personal Metadata */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                     <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)" }}>
                        Personal Details
                     </h3>
                     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                           <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}><IconMail size={12}/> Email</span>
                           <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)", wordBreak: "break-all" }}>{selectedFellow.email}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                           <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}><IconPhone size={12}/> Phone</span>
                           <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedFellow.phone}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                           <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}><IconGenderMale size={12}/> Gender</span>
                           <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedFellow.gender}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                           <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>Age</span>
                           <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedFellow.age}</span>
                        </div>
                     </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--eborder)", margin: 0 }} />

                  {/* Assignment Metadata */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                     <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)" }}>
                        Assignment
                     </h3>
                     <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                           <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--eborder)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--emuted)" }}>
                              <IconSchool size={16} />
                           </div>
                           <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>Institution</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedFellow.institution}</span>
                           </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                           <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--eborder)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--emuted)" }}>
                              <IconMapPin size={16} />
                           </div>
                           <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>Duty Station</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedFellow.placeOfPosting}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--eborder)", margin: 0 }} />

                  {/* Highlights */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                     <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6 }}>
                        <IconAward size={16} style={{ color: "#E8A020" }}/> Highlights
                     </h3>
                     <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {selectedFellow.highlights.length > 0 ? selectedFellow.highlights.map((h, i) => (
                           <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "var(--eglass)", borderRadius: 8, border: "1px solid var(--eborder)" }}>
                              <IconCheck size={14} style={{ color: "#2EC27E", marginTop: 2, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.5 }}>
                                 {h}
                              </span>
                           </div>
                        )) : (
                           <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                              No highlights recorded yet.
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Compliance */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", background: `${getStatusColor(selectedFellow.checkInStatus)}10`, borderRadius: 12, border: `1px solid ${getStatusColor(selectedFellow.checkInStatus)}30` }}>
                     <div style={{ color: getStatusColor(selectedFellow.checkInStatus) }}>
                         <IconCircleCheck size={28} />
                     </div>
                     <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", textTransform: "capitalize" }}>
                           {selectedFellow.checkInStatus.replace("-", " ")}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>
                           Check-in adherence level indicator.
                        </div>
                     </div>
                  </div>

               </div>
               
               <div style={{ marginTop: "auto", padding: 24, borderTop: "1px solid var(--eborder)" }}>
                  <button 
                     style={{ 
                        width: "100%", padding: "12px", borderRadius: 10, background: country.color, color: "#fff", 
                        border: "none", fontSize: 13, fontWeight: 700, fontFamily: "var(--font)", cursor: "pointer",
                        boxShadow: `0 4px 12px ${country.color}40`
                     }}
                     onClick={() => alert("Full profile export started.")}
                  >
                     Export Full Profile
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
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </CountryLayout>
  );
}
