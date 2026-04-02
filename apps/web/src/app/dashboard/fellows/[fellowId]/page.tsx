"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ALL_FELLOWS, COUNTRIES_MAP } from "@/lib/mock-data";
import {
  IconArrowLeft,
  IconMapPin,
  IconMail,
  IconPhone,
  IconSchool,
  IconBriefcase,
  IconCircleCheck,
  IconCalendarEvent,
  IconCheck,
  IconAward
} from "@tabler/icons-react";

export default function FellowProfilePage() {
  const params = useParams();
  const router = useRouter();
  const fellowId = params?.fellowId as string;
  const [activeTab, setActiveTab] = useState("Overview");

  const fellow = ALL_FELLOWS.find(f => f.id === fellowId);
  if (!fellow) {
    return (
      <div style={{ padding: 40, color: "var(--emuted)", textAlign: "center", fontFamily: "var(--font)" }}>
        Fellow not found.
        <button onClick={() => router.back()} style={{ display: "block", margin: "20px auto", color: "var(--ewhite)", background: "var(--eborder)", padding: "10px 20px", borderRadius: 8, border: "none" }}>
          Go Back
        </button>
      </div>
    );
  }

  const country = COUNTRIES_MAP[fellow.country];
  const TABS = ["Overview", "Check-ins", "Performance", "Documents"];

  const getStatusColor = (s: string) => {
     if (s === "active" || s === "on-track") return "#2EC27E";
     if (s === "on-leave" || s === "late") return "#E8A020";
     return "#E05C5C";
  };

  return (
    <div style={{ padding: "40px", maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* Top Breadcrumb / Back Navigation */}
      <div 
        onClick={() => router.back()} 
        style={{ 
           display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)", cursor: "pointer", 
           fontSize: 13, fontWeight: 600, fontFamily: "var(--font)", width: "fit-content" 
        }}
      >
        <IconArrowLeft size={16} /> Back to Directory
      </div>

      {/* Hero Card */}
      <div className="gc" style={{ 
          padding: 30, display: "flex", alignItems: "center", gap: 24, borderRadius: 20, 
          background: `var(--eglass)`,
          border: "1px solid var(--eborder)", position: "relative", overflow: "hidden"
      }}>
         {/* Decorative colored glow based on country brand color */}
         <div style={{ 
            position: "absolute", top: -50, right: -50, width: 250, height: 250, 
            background: `radial-gradient(circle, ${country?.color || "#3B8BEB"}30 0%, transparent 60%)`, 
            borderRadius: "50%", pointerEvents: "none", zIndex: 0
         }} />

         {/* Avatar Initials */}
         <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: fellow.gender === "Female" ? "#9B59B625" : "#3B8BEB25", 
            border: `2px solid ${fellow.gender === "Female" ? "#9B59B660" : "#3B8BEB60"}`,
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
            fontSize: 34, fontWeight: 800, color: fellow.gender === "Female" ? "#9B59B6" : "#3B8BEB", 
            fontFamily: "var(--font)", boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
         }}>
            {fellow.name.split(" ").map(n => n.charAt(0)).join("").substring(0, 2)}
         </div>

         {/* Info */}
         <div style={{ flex: 1, zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
               <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", margin: 0 }}>
                  {fellow.name}
               </h1>
               <span style={{ 
                  fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 12, 
                  background: `${getStatusColor(fellow.status)}20`, color: getStatusColor(fellow.status), 
                  border: `1px solid ${getStatusColor(fellow.status)}40`, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)"
               }}>
                  {fellow.status}
               </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
               <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{country?.flag}</span> <span style={{ color: "var(--ewhite)", fontWeight: 500 }}>{country?.name || "Unknown"}</span>
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <IconBriefcase size={16} /> <span style={{ color: "var(--ewhite)", fontWeight: 500 }}>{fellow.project}</span>
               </div>
               <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <IconCalendarEvent size={16} /> <span style={{ color: "var(--ewhite)", fontWeight: 500 }}>{fellow.cohort}</span>
               </div>
            </div>
         </div>
         
         <div style={{ textAlign: "right", zIndex: 1 }}>
             <button style={{ 
                background: country?.color || "var(--ebring)", color: "#fff", border: "none", 
                padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "var(--font)", 
                cursor: "pointer", boxShadow: `0 4px 12px ${country?.color || "#fff"}40`
             }}>
                Export Profile
             </button>
         </div>
      </div>

      {/* Tabs Layout */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--eborder)" }}>
        {TABS.map(tab => (
           <div 
             key={tab} 
             onClick={() => setActiveTab(tab)}
             style={{
                padding: "12px 20px", fontSize: 13, fontWeight: 600, fontFamily: "var(--font)", cursor: "pointer",
                color: activeTab === tab ? "var(--ewhite)" : "var(--emuted)",
                borderBottom: activeTab === tab ? `3px solid ${country?.color || "var(--ewhite)"}` : "3px solid transparent",
                transition: "all 0.2s ease"
             }}
           >
              {tab}
           </div>
        ))}
      </div>

      {/* Tab Panel Content: Overview */}
      {activeTab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
           
           {/* Section 1: Detailed Bio & Assignment */}
           <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="gc" style={{ padding: 24, borderRadius: 16, border: "1px solid var(--eborder)", background: "var(--eglass)" }}>
                 <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                   Contact & Personal Details
                 </h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", fontSize: 13, fontFamily: "var(--font)" }}>
                       <span style={{ color: "var(--emuted)" }}>Email</span>
                       <span style={{ color: "var(--ewhite)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                          <IconMail size={16} style={{ color: "var(--emuted)" }} /> {fellow.email}
                       </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", fontSize: 13, fontFamily: "var(--font)" }}>
                       <span style={{ color: "var(--emuted)" }}>Phone</span>
                       <span style={{ color: "var(--ewhite)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                          <IconPhone size={16} style={{ color: "var(--emuted)" }} /> {fellow.phone}
                       </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", fontSize: 13, fontFamily: "var(--font)" }}>
                       <span style={{ color: "var(--emuted)" }}>Gender</span>
                       <span style={{ color: "var(--ewhite)", fontWeight: 500 }}>{fellow.gender}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", fontSize: 13, fontFamily: "var(--font)" }}>
                       <span style={{ color: "var(--emuted)" }}>Age</span>
                       <span style={{ color: "var(--ewhite)", fontWeight: 500 }}>{fellow.age} years old</span>
                    </div>
                 </div>
              </div>

              <div className="gc" style={{ padding: 24, borderRadius: 16, border: "1px solid var(--eborder)", background: "var(--eglass)" }}>
                 <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                   Assignment Overview
                 </h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", fontSize: 13, fontFamily: "var(--font)" }}>
                       <span style={{ color: "var(--emuted)" }}>Institution</span>
                       <span style={{ color: "var(--ewhite)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                          <IconSchool size={16} style={{ color: country?.color || "var(--emuted)" }} /> {fellow.institution}
                       </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", fontSize: 13, fontFamily: "var(--font)" }}>
                       <span style={{ color: "var(--emuted)" }}>Location</span>
                       <span style={{ color: "var(--ewhite)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                          <IconMapPin size={16} style={{ color: country?.color || "var(--emuted)" }} /> {fellow.placeOfPosting}
                       </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", fontSize: 13, fontFamily: "var(--font)" }}>
                       <span style={{ color: "var(--emuted)" }}>Project</span>
                       <span style={{ color: "var(--ewhite)", fontWeight: 500 }}>{fellow.project}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Section 2: Highlights and Compliance */}
           <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="gc" style={{ padding: 24, borderRadius: 16, border: "1px solid var(--eborder)", background: "var(--eglass)" }}>
                 <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 8 }}>
                   <IconAward size={18} style={{ color: "#E8A020" }} /> Fellowship Highlights
                 </h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {fellow.highlights.length > 0 ? fellow.highlights.map((h, i) => (
                       <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "var(--eglass)", borderRadius: 10, border: "1px solid var(--eborder)" }}>
                          <IconCheck size={16} style={{ color: "#2EC27E", marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.5 }}>
                             {h}
                          </span>
                       </div>
                    )) : (
                       <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", padding: "10px 0" }}>
                          No highlights recorded yet for this fellow.
                       </div>
                    )}
                 </div>
              </div>

              <div className="gc" style={{ padding: 24, borderRadius: 16, border: "1px solid var(--eborder)", background: "var(--eglass)" }}>
                 <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                   Compliance & Check-ins
                 </h3>
                 <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${getStatusColor(fellow.checkInStatus)}15`, color: getStatusColor(fellow.checkInStatus), display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconCircleCheck size={30} />
                    </div>
                    <div>
                       <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", textTransform: "capitalize" }}>
                          {fellow.checkInStatus.replace("-", " ")}
                       </div>
                       <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 4 }}>
                          Check-in adherence level indicator.
                       </div>
                    </div>
                 </div>
              </div>
           </div>

        </div>
      )}

      {/* Empty Tab State for unbuilt tabs */}
      {activeTab !== "Overview" && (
         <div className="gc" style={{ padding: 60, borderRadius: 16, border: "1px solid var(--eborder)", background: "var(--eglass)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <IconBriefcase size={40} style={{ color: "var(--emuted)", opacity: 0.5 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{activeTab} Module</div>
            <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 300 }}>
               This section is under construction. It will feature detailed logs and files for {fellow.name}.
            </div>
         </div>
      )}

    </div>
  );
}
