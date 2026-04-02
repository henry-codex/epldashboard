"use client";

import { AlumniLayout } from "@/components/epl/alumni-layout";
import { IconExternalLink, IconCalendarEvent, IconNews } from "@tabler/icons-react";

const newsletters = [
  {
    date: "April 2026",
    title: "Q1 Continental Impact Report",
    tag: "Quarterly Report",
    preview: "Detailing high-level policy transitions across Ministry of Finance placements in Ghana and Kenya. Includes an interview with newly appointed Secretary Otieno.",
    imageColor: "#3B8BEB"
  },
  {
    date: "March 2026",
    title: "GovTech Innovations: Sierra Leone Focus",
    tag: "Spotlight Series",
    preview: "How EPL Alumni are spearheading the digitization of civil tracking records in Freetown, reducing wait times by over 400%.",
    imageColor: "#7F77DD"
  },
  {
    date: "February 2026",
    title: "The Alumni Network Expansion Strategy 2027",
    tag: "Strategy Deck",
    preview: "A comprehensive roadmap outlining expansion plans into Rwanda and Uganda next year, co-authored by the Executive Board.",
    imageColor: "#E8A020"
  },
  {
    date: "January 2026",
    title: "Annual Fellows Summit Recap",
    tag: "Event Summary",
    preview: "High-resolution media galleries and keynote transcripts from the 2026 Summit hosted in Accra featuring 200+ attendees.",
    imageColor: "#2EC27E"
  }
];

export default function NewslettersPage() {
  return (
    <AlumniLayout activePage="newsletters" pageTitle="Newsletters">
      <div style={{ marginBottom: "2.5rem", maxWidth: 800 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: "0 0 12px 0", fontFamily: "var(--font)" }}>
          Network Highlights & Newsletters
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.6 }}>
          Stay updated with quarterly strategy reports, cohort spotlights, and critical policy breakthroughs led by our alumni across the continent.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 30, paddingBottom: 60 }}>
        {newsletters.map((news, idx) => (
          <div key={idx} className="gc" style={{ display: "flex", flexDirection: "column", overflow: "hidden", cursor: "pointer", transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s", position: "relative" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 12px 30px rgba(0,0,0,0.5), 0 0 0 1px ${news.imageColor}50`; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
             {/* Thumbnail Area */}
             <div style={{ height: 160, background: `linear-gradient(180deg, ${news.imageColor}30, rgba(4,12,38,0))`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                {/* Decorative Pattern Background mockup */}
                <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${news.imageColor}20 1px, transparent 1px)`, backgroundSize: "20px 20px", opacity: 0.5 }} />
                <IconNews size={48} stroke={1.2} color={news.imageColor} style={{ filter: `drop-shadow(0 4px 12px ${news.imageColor}50)` }} />
             </div>

             {/* Content Area */}
             <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 8, color: news.imageColor, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "var(--font)" }}>
                     <span style={{ padding: "4px 8px", background: `${news.imageColor}20`, borderRadius: 6 }}>{news.tag}</span>
                   </div>
                   <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--emuted)", fontSize: 13, fontFamily: "var(--font)" }}>
                     <IconCalendarEvent size={14} /> {news.date}
                   </div>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", margin: "0 0 12px 0", fontFamily: "var(--font)", lineHeight: 1.4 }}>{news.title}</h2>
                <p style={{ fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.6, margin: 0, flex: 1 }}>{news.preview}</p>

                {/* Footer Action */}
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8, color: "var(--ewhite)", fontSize: 13, fontWeight: 700, fontFamily: "var(--font)" }}>
                   Read Publication <IconExternalLink size={16} />
                </div>
             </div>
          </div>
        ))}
      </div>
    </AlumniLayout>
  );
}
