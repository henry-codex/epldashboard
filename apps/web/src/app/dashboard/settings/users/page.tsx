"use client";

import { useState } from "react";
import { SettingsLayout } from "@/components/epl/settings-layout";
import { 
  IconUsers, IconPlus, IconUserPlus, IconShieldFilled, IconActivity,
  IconDotsVertical, IconCheck, IconShieldLock
} from "@tabler/icons-react";

const mockUsers = [
  { name: "Dr. Ama Serwah", email: "ama@eplafrica.org", role: "Super Admin", status: "active", country: "Ghana" },
  { name: "Kofi Mensah", email: "kofi@eplafrica.org", role: "Country Manager", status: "active", country: "Ghana" },
  { name: "Wanjiku Kamau", email: "wanjiku@eplafrica.org", role: "Program Lead", status: "active", country: "Kenya" },
  { name: "James Otieno", email: "james@eplafrica.org", role: "Super Admin", status: "away", country: "Kenya" },
  { name: "Mary Kollie", email: "mary@eplafrica.org", role: "Country Manager", status: "active", country: "Liberia" },
  { name: "Ibrahim Sesay", email: "ibrahim@eplafrica.org", role: "Regional Auditor", status: "active", country: "Sierra Leone" },
];

export default function UsersSettingsPage() {
  return (
    <SettingsLayout activePage="users" pageTitle="Identity & Access Management">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        
        {/* Page Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
           <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", margin: 0 }}>
                 User Management
              </h2>
              <p style={{ fontSize: 14, color: "var(--emuted)", marginTop: 6 }}>
                 Provision accounts, assign continental roles, and manage access policies for regional administrators.
              </p>
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
               <IconUserPlus size={18} /> Add Administrator
           </button>
        </div>

        {/* Create User Form Section */}
        <div className="gc" style={{ padding: "30px", borderLeft: "4px solid #AF7AC5" }}>
           <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ 
                 width: 44, height: 44, borderRadius: 12, background: "rgba(175,122,197,0.1)", 
                 display: "flex", alignItems: "center", justifyContent: "center", color: "#AF7AC5" 
              }}>
                 <IconUserPlus size={22} />
              </div>
              <div>
                 <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)" }}>Provision New Account</div>
                 <div style={{ fontSize: 12, color: "var(--emuted)" }}>Assign structural permissions and country-level visibility.</div>
              </div>
           </div>

           <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <label style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 800, letterSpacing: "1px" }}>FULL NAME</label>
                 <input 
                    type="text" 
                    placeholder="e.g. John Doe"
                    style={{ 
                       padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", 
                       border: "1px solid rgba(255,255,255,0.05)", color: "var(--ewhite)", fontSize: 14, outline: "none"
                    }}
                 />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <label style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 800, letterSpacing: "1px" }}>EMAIL ADDRESS</label>
                 <input 
                    type="email" 
                    placeholder="john@eplafrica.org"
                    style={{ 
                       padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.02)", 
                       border: "1px solid rgba(255,255,255,0.05)", color: "var(--ewhite)", fontSize: 14, outline: "none"
                    }}
                 />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <label style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 800, letterSpacing: "1px" }}>ACCESS ROLE</label>
                 <select style={{ 
                    padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.05)", 
                    border: "1px solid rgba(255,255,255,0.1)", color: "var(--ewhite)", fontSize: 14, outline: "none", appearance: "none"
                 }}>
                    <option>Country Manager</option>
                    <option>Super Admin</option>
                    <option>Regional Auditor</option>
                    <option>Program Lead</option>
                 </select>
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
              }}>Send Invitation</button>
           </div>
        </div>

        {/* User Directory List */}
        <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconUsers size={20} color="#AF7AC5" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)" }}>Active Administrators</h3>
           </div>
           
           <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mockUsers.map((u, i) => (
                <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 60px",
                    gap: 20, padding: "16px 20px", alignItems: "center",
                    background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.04)",
                    transition: "all 0.2s"
                }} className="row-hover">
                   <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ 
                         width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", 
                         display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--ewhite)"
                      }}>
                         {u.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                         <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>{u.name}</div>
                         <div style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 500 }}>{u.email}</div>
                      </div>
                   </div>

                   <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)" }}>{u.country}</div>

                   <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <IconShieldLock size={14} color="#AF7AC5" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ewhite)" }}>{u.role.toUpperCase()}</span>
                   </div>

                   <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: u.status === "active" ? "#2EC27E" : "#E8A020", boxShadow: `0 0 10px ${u.status === "active" ? "#2EC27E" : "#E8A020"}50` }} />
                      <span style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 700, textTransform: "uppercase" }}>{u.status}</span>
                   </div>

                   <div style={{ textAlign: "right" }}>
                      <IconDotsVertical size={20} color="var(--emuted)" style={{ cursor: "pointer" }} />
                   </div>
                </div>
              ))}
           </div>
        </div>

      </div>
    </SettingsLayout>
  );
}
