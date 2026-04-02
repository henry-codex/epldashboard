"use client";

import { useState } from "react";
import { AlumniLayout } from "@/components/epl/alumni-layout";
import { OrgTree } from "@/components/epl/org-tree";
import { IconMail, IconBrandLinkedin, IconBuildingBank, IconLayoutGrid, IconBinaryTree } from "@tabler/icons-react";

const executives = [
  {
    name: "Dr. Ama Serwah",
    role: "President, Global Alumni Board",
    placement: "Director, Ministry of Finance",
    country: "Ghana",
    flag: "🇬🇭",
    cohort: "Cohort 3",
    color: "#E8A020"
  },
  {
    name: "James Otieno",
    role: "VP, East Africa Operations",
    placement: "Principal Sec, Ministry of Agriculture",
    country: "Kenya",
    flag: "🇰🇪",
    cohort: "Cohort 6",
    color: "#2EC27E"
  },
  {
    name: "Mary Kollie",
    role: "VP, West Africa Operations",
    placement: "Director, Ministry of Gender",
    country: "Liberia",
    flag: "🇱🇷",
    cohort: "Cohort 3",
    color: "#E05C5C"
  },
  {
    name: "Chimwemwe Phiri",
    role: "Chair of Policy & Strategy",
    placement: "WASH Coordinator, Lilongwe Council",
    country: "Malawi",
    flag: "🇲🇼",
    cohort: "Cohort 5",
    color: "#3B8BEB"
  },
  {
    name: "Ibrahim Sesay",
    role: "Director of Alumni Engagement",
    placement: "Public Health Lead, Freetown",
    country: "Sierra Leone",
    flag: "🇸🇱",
    cohort: "Cohort 6",
    color: "#7F77DD"
  },
  {
    name: "Abena Osei-Bonsu",
    role: "Secretary & Treasurer",
    placement: "Deputy Head, OHCS",
    country: "Ghana",
    flag: "🇬🇭",
    cohort: "Cohort 5",
    color: "#E8A020"
  }
];

// Tree structure representing the Global Board Hierarchy
const boardTreeData = {
  id: "president",
  name: "President, Global Alumni Board",
  type: "Ministry", // using Ministry type for gold coloring
  label: "Dr. Ama Serwah • 🇬🇭",
  children: [
    {
      id: "vp_east",
      name: "VP, East Africa Operations",
      type: "Department",
      label: "James Otieno • 🇰🇪",
      children: [
        {
          id: "chair_policy",
          name: "Chair of Policy & Strategy",
          type: "Agency",
          label: "Chimwemwe Phiri • 🇲🇼"
        }
      ]
    },
    {
      id: "vp_west",
      name: "VP, West Africa Operations",
      type: "Department",
      label: "Mary Kollie • 🇱🇷",
      children: [
        {
          id: "dir_engage",
          name: "Director of Alumni Engagement",
          type: "Agency",
          label: "Ibrahim Sesay • 🇸🇱"
        },
        {
          id: "sec_treasurer",
          name: "Secretary & Treasurer",
          type: "Agency",
          label: "Abena Osei-Bonsu • 🇬🇭"
        }
      ]
    }
  ]
};

export default function ExecutivesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "tree">("tree");

  return (
    <AlumniLayout activePage="executives" pageTitle="Executive Hub">
      <div style={{ marginBottom: "2.5rem", maxWidth: 800, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: "0 0 12px 0", fontFamily: "var(--font)" }}>
            Alumni Executive Board
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.6 }}>
            The steering committee guiding continental strategy, cross-border partnerships, and ongoing professional development for the EPL Africa alumni network.
          </p>
        </div>
        
        {/* View Toggles */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
           <button 
              onClick={() => setViewMode("tree")}
              style={{ padding: "8px 12px", background: viewMode === "tree" ? "rgba(255,255,255,0.1)" : "transparent", color: viewMode === "tree" ? "var(--ewhite)" : "var(--emuted)", border: "none", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600, fontFamily: "var(--font)", transition: "all 0.2s" }}
           >
              <IconBinaryTree size={16} /> Tree
           </button>
           <button 
              onClick={() => setViewMode("grid")}
              style={{ padding: "8px 12px", background: viewMode === "grid" ? "rgba(255,255,255,0.1)" : "transparent", color: viewMode === "grid" ? "var(--ewhite)" : "var(--emuted)", border: "none", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600, fontFamily: "var(--font)", transition: "all 0.2s" }}
           >
              <IconLayoutGrid size={16} /> Grid
           </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24, paddingBottom: 60 }}>
          {executives.map((exec, idx) => (
            <div key={idx} className="gc" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Header: Avatar + Title */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                 <div style={{
                    width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, ${exec.color}20, ${exec.color}40)`,
                    border: `1px solid ${exec.color}50`, color: exec.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 800, fontFamily: "var(--font)",
                    boxShadow: `0 8px 24px ${exec.color}30`
                 }}>
                    {exec.name.split(" ").map((n) => n[0]).join("")}
                 </div>
                 <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 4 }}>{exec.name}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: exec.color, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--font)" }}>{exec.role}</div>
                 </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, width: "100%", background: "rgba(255,255,255,0.06)" }} />

              {/* Meta Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--emuted)" }}>
                    <IconBuildingBank size={16} />
                    <span style={{ fontSize: 14, fontFamily: "var(--font)" }}>{exec.placement}</span>
                 </div>
                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 6 }}>
                       <span style={{ fontSize: 14 }}>{exec.flag}</span>
                       <span style={{ fontSize: 12, color: "var(--ewhite)", fontWeight: 600, fontFamily: "var(--font)" }}>{exec.country}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 6, fontSize: 12, color: "var(--emuted)", fontWeight: 600, fontFamily: "var(--font)" }}>
                       {exec.cohort}
                    </div>
                 </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto", paddingTop: 8 }}>
                 <button style={{ flex: 1, padding: "10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ewhite)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                    <IconMail size={16} />
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font)" }}>Contact</span>
                 </button>
                 <button style={{ padding: "10px", borderRadius: 8, background: "rgba(59,139,235,0.15)", border: "1px solid rgba(59,139,235,0.3)", color: "#3B8BEB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(59,139,235,0.25)"} onMouseOut={(e) => e.currentTarget.style.background = "rgba(59,139,235,0.15)"}>
                    <IconBrandLinkedin size={18} stroke={2.5} />
                 </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* OrgTree View */
        <div className="gc" style={{ padding: 40, overflowX: "auto", minHeight: 600, display: "flex", justifyContent: "center" }}>
           <OrgTree data={boardTreeData} />
        </div>
      )}
    </AlumniLayout>
  );
}
