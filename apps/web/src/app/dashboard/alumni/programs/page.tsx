"use client";

import { AlumniLayout } from "@/components/epl/alumni-layout";
import { IconRocket, IconUsersGroup, IconBulb, IconTrendingUp, IconArrowRight } from "@tabler/icons-react";

const programs = [
  {
    title: "Women in Public Leadership Initiative",
    description: "An exclusive accelerator track equipping highly-placed female alumni with executive coaching, international policy fellowships, and pan-African mentoring networks.",
    stats: "45 Active Members • 3 Countries",
    icon: <IconUsersGroup size={28} />,
    color: "#7F77DD",
    status: "Active"
  },
  {
    title: "Pan-African Policy Innovation Lab",
    description: "A collaborative sandbox where cross-border alumni can propose, fund, and test modern civil service reforms across health and education sectors.",
    stats: "12 Ongoing Pilot Projects",
    icon: <IconBulb size={28} />,
    color: "#E8A020",
    status: "Accepting Proposals"
  },
  {
    title: "EPL Startup & GovTech Incubator",
    description: "Bridging the gap between government and tech, supporting alumni who have transitioned into GovTech startups with seed funding and networking.",
    stats: "$2.5M Seed Deployed",
    icon: <IconRocket size={28} />,
    color: "#3B8BEB",
    status: "Active"
  },
  {
    title: "Senior Executive Mentorship",
    description: "Pairing mid-level alumni with retired Ministers, Principal Secretaries, and Heads of Civil Service for long-term career scaffolding.",
    stats: "82 Active Pairings",
    icon: <IconTrendingUp size={28} />,
    color: "#2EC27E",
    status: "Rolling Admission"
  }
];

export default function ProgramsPage() {
  return (
    <AlumniLayout activePage="programs" pageTitle="Alumni Programs">
      <div style={{ marginBottom: "2.5rem", maxWidth: 800 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: "0 0 12px 0", fontFamily: "var(--font)" }}>
          Strategic Alumni Programs
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.6 }}>
          Explore cross-continental initiatives driving continuous impact, executive training, and collaborative policy innovation for our post-fellowship network.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, paddingBottom: 60 }}>
        {programs.map((prog, idx) => (
          <div key={idx} className="gc" style={{ padding: 30, display: "flex", alignItems: "center", gap: 32, position: "relative", overflow: "hidden" }}>
            {/* Background Glow */}
            <div style={{ position: "absolute", right: -50, top: -50, width: 200, height: 200, background: prog.color, filter: "blur(100px)", opacity: 0.1, zIndex: 0 }} />
            
            <div style={{ flexShrink: 0, width: 80, height: 80, borderRadius: 20, background: `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))`, border: `1px solid ${prog.color}40`, color: prog.color, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, boxShadow: `0 8px 30px ${prog.color}20` }}>
              {prog.icon}
            </div>

            <div style={{ flex: 1, zIndex: 1 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>{prog.title}</h2>
                  <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: `${prog.color}15`, color: prog.color, border: `1px solid ${prog.color}30` }}>
                     {prog.status}
                  </span>
               </div>
               <p style={{ fontSize: 15, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.6, margin: "0 0 16px 0", maxWidth: "90%" }}>
                  {prog.description}
               </p>
               <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: prog.color, boxShadow: `0 0 8px ${prog.color}` }} />
                  {prog.stats}
               </div>
            </div>

            <button style={{ flexShrink: 0, width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ewhite)", cursor: "pointer", transition: "all 0.2s, transform 0.2s", zIndex: 1 }} onMouseOver={(e) => { e.currentTarget.style.background = prog.color; e.currentTarget.style.transform = "translateX(4px)"; }} onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateX(0)"; }}>
               <IconArrowRight size={20} />
            </button>
          </div>
        ))}
      </div>
    </AlumniLayout>
  );
}
