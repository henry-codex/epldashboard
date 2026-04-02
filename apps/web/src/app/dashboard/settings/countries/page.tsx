"use client";

import { useState } from "react";
import { SettingsLayout } from "@/components/epl/settings-layout";
import { COUNTRIES } from "@/lib/mock-data";
import { 
  IconFlag, IconPlus, IconBuildingBank, IconMapPin, IconSearch,
  IconDotsVertical, IconChecklist, IconUsers
} from "@tabler/icons-react";

export default function CountriesSettingsPage() {
  const [search, setSearch] = useState("");

  return (
    <SettingsLayout activePage="countries" pageTitle="Regional Management">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        
        {/* Header with Search & Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
           <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", margin: 0 }}>
                 Partner Nations
              </h2>
              <p style={{ fontSize: 14, color: "var(--emuted)", marginTop: 6 }}>
                 Add and manage participating countries and their respective program boundaries.
              </p>
           </div>
           
           <div style={{ display: "flex", gap: 12 }}>
              <div style={{ position: "relative" }}>
                 <IconSearch size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--emuted)" }} />
                 <input 
                    type="text" 
                    placeholder="Search countries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ 
                       padding: "12px 16px 12px 42px", borderRadius: 12, background: "rgba(255,255,255,0.02)", 
                       border: "1px solid rgba(255,255,255,0.08)", color: "var(--ewhite)", 
                       fontSize: 14, width: 280, outline: "none", transition: "all 0.3s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--ewhite)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                 />
              </div>
              <button 
                className="epl-btn"
                style={{
                   display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", 
                   background: "linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)",
                   borderRadius: 12, color: "white", border: "none", fontWeight: 800, 
                   fontSize: 13, cursor: "pointer", boxShadow: "0 8px 20px rgba(155,89,182,0.3)"
                }}
              >
                  <IconPlus size={18} /> New Country
              </button>
           </div>
        </div>

        {/* Create Country Form Card */}
        <div className="gc" style={{ padding: "30px", borderLeft: "4px solid #9B59B6" }}>
           <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ 
                 width: 44, height: 44, borderRadius: 12, background: "rgba(155,89,182,0.1)", 
                 display: "flex", alignItems: "center", justifyContent: "center", color: "#9B59B6" 
              }}>
                 <IconFlag size={22} />
              </div>
              <div>
                 <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)" }}>Establish New Country Hub</div>
                 <div style={{ fontSize: 12, color: "var(--emuted)" }}>Provision institutional space for a new regional partnership.</div>
              </div>
           </div>

           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <label style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 800, letterSpacing: "1px" }}>COUNTRY NAME</label>
                 <input 
                    type="text" 
                    placeholder="e.g. Rwanda"
                    style={{ 
                       padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", 
                       border: "1px solid rgba(255,255,255,0.05)", color: "var(--ewhite)", fontSize: 14, outline: "none"
                    }}
                 />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <label style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 800, letterSpacing: "1px" }}>ISO CODE / FLAG</label>
                 <div style={{ display: "flex", gap: 8 }}>
                    <input 
                       type="text" 
                       placeholder="🇷🇼"
                       style={{ 
                          width: 60, padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", 
                          border: "1px solid rgba(255,255,255,0.05)", color: "var(--ewhite)", fontSize: 18, textAlign: "center", outline: "none"
                       }}
                    />
                    <input 
                       type="text" 
                       placeholder="RWA"
                       style={{ 
                          flex: 1, padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", 
                          border: "1px solid rgba(255,255,255,0.05)", color: "var(--ewhite)", fontSize: 14, outline: "none"
                       }}
                    />
                 </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <label style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 800, letterSpacing: "1px" }}>PRIMARY ACCENT COLOR</label>
                 <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "#8E44AD", cursor: "pointer" }} />
                    <input 
                       type="text" 
                       placeholder="#8E44AD"
                       style={{ 
                          flex: 1, padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", 
                          border: "1px solid rgba(255,255,255,0.05)", color: "var(--ewhite)", fontSize: 14, outline: "none"
                       }}
                    />
                 </div>
              </div>
           </div>

           <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 12 }}>
              <button style={{ 
                 background: "none", border: "1px solid rgba(255,255,255,0.1)", 
                 padding: "10px 20px", borderRadius: 10, color: "var(--emuted)", 
                 fontSize: 13, fontWeight: 700, cursor: "pointer" 
              }}>Cancel</button>
              <button style={{ 
                 background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", 
                 padding: "10px 24px", borderRadius: 10, color: "var(--ewhite)", 
                 fontSize: 13, fontWeight: 800, cursor: "pointer" 
              }}>Create Country Hub</button>
           </div>
        </div>

        {/* Existing Countries Hub List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
           <div style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 800, letterSpacing: "1px" }}>ACTIVE REGIONAL HUBS</div>
           
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 20 }}>
             {COUNTRIES.map((c) => (
                <div key={c.id} className="gc hover-lift" style={{ padding: "24px", position: "relative" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                         <div style={{ fontSize: 24, width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.05)" }}>{c.flag}</div>
                         <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ewhite)" }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 600 }}>{c.id.toUpperCase()} • {c.institutions} Partners</div>
                         </div>
                      </div>
                      <IconDotsVertical size={20} color="var(--emuted)" style={{ cursor: "pointer" }} />
                   </div>

                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                       <div style={{ padding: "10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 8 }}>
                          <IconChecklist size={14} color={c.color} />
                          <span style={{ fontSize: 12, color: "var(--ewhite)", fontWeight: 600 }}>{c.checkInRate}% Healthy</span>
                       </div>
                       <div style={{ padding: "10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 8 }}>
                          <IconUsers size={14} color="#3B8BEB" />
                          <span style={{ fontSize: 12, color: "var(--ewhite)", fontWeight: 600 }}>{c.fellows} Active</span>
                       </div>
                   </div>
                </div>
             ))}
           </div>
        </div>

      </div>
    </SettingsLayout>
  );
}
