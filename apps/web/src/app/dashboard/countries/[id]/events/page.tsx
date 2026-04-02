"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import {
  IconCalendarEvent,
  IconMapPin,
  IconUsers,
  IconClock,
  IconX,
  IconSpeakerphone,
  IconAward,
  IconCertificate,
  IconArrowRight
} from "@tabler/icons-react";

type EventDetails = {
  id: string;
  title: string;
  status: "current" | "upcoming" | "past";
  type: "Graduation" | "Orientation" | "Fireside Training" | "Summit" | "Workshop";
  dateFormatted: string;
  timeLine: string;
  location: string;
  attendees: number;
  description: string;
  keynote?: string;
};

const MOCK_EVENTS: EventDetails[] = [
  {
    id: "e1",
    title: "Cohort 7 Graduation Ceremony",
    status: "upcoming",
    type: "Graduation",
    dateFormatted: "May 24, 2026",
    timeLine: "09:00 AM - 02:00 PM GMT",
    location: "Main Convention Centre, Capital City",
    attendees: 150,
    description: "The momentous culmination for Cohort 7, officially transitioning from active Fellows into distinguished Alumni. A morning of reflection, awards, and prestigious addresses by government partners.",
    keynote: "H.E. The Vice President"
  },
  {
    id: "e2",
    title: "National Policy Orientation Week",
    status: "current",
    type: "Orientation",
    dateFormatted: "Mar 30 - Apr 04, 2026",
    timeLine: "Daily 08:00 AM - 05:00 PM",
    location: "Institute of Management & Public Administration",
    attendees: 45,
    description: "An intensive immersion week for the newly inducted fellows, ensuring they are deeply aligned with institutional policy frameworks, core values, and expectations for the civil service before immediate deployment.",
    keynote: "Head of Civil Service"
  },
  {
    id: "e3",
    title: "Fireside Training: Adaptive Leadership",
    status: "upcoming",
    type: "Fireside Training",
    dateFormatted: "April 15, 2026",
    timeLine: "03:00 PM - 05:00 PM GMT",
    location: "EPL Hub / Hybrid Virtual",
    attendees: 80,
    description: "A highly interactive, focused coaching session where seasoned alumni and top executives break down the nuances of navigating bureaucratic resistance and championing adaptive, ethical leadership from the inside.",
    keynote: "Dr. Evelyn Mensah"
  },
  {
    id: "e4",
    title: "Alumni Innovation Summit 2025",
    status: "past",
    type: "Summit",
    dateFormatted: "December 12, 2025",
    timeLine: "All Day",
    location: "Kempinski Hotel Gold Coast City",
    attendees: 300,
    description: "A massive convergence of past cohorts designed to cross-pollinate ideas across ministries and incubate new intra-governmental start-up initiatives pitched directly to partner funds.",
    keynote: "Minister of Finance"
  },
  {
    id: "e5",
    title: "Project Proposal & Budget Workshop",
    status: "past",
    type: "Workshop",
    dateFormatted: "September 18, 2025",
    timeLine: "10:00 AM - 01:00 PM",
    location: "Ministry of Education Annex",
    attendees: 42,
    description: "A technical hard-skills workshop guiding fellows on proper governmental budget structuring, procurement policy compliance, and effective grand proposal drafting within the public sector.",
    keynote: "Director of Budgeting"
  }
];

export default function CountryEventsPage() {
  const params = useParams();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];
  
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEvent(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!country) return null;

  // Derive sets
  const activeEvents = MOCK_EVENTS.filter(e => e.status === "current" || e.status === "upcoming").sort((a,b) => a.status === "current" ? -1 : 1);
  const pastEvents = MOCK_EVENTS.filter(e => e.status === "past");
  
  const displayEvents = activeTab === "active" ? activeEvents : pastEvents;

  const getEventIcon = (type: string) => {
     switch(type) {
        case "Graduation": return <IconCertificate size={28} />;
        case "Orientation": return <IconUsers size={28} />;
        case "Summit": return <IconAward size={28} />;
        default: return <IconCalendarEvent size={28} />;
     }
  };

  return (
    <CountryLayout activePage="events" pageTitle="Events Hub">
       
       {/* Hub Header */}
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              {country.flag} Regional Events
            </div>
            <div style={{ fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)" }}>
              Coordinating orientations, graduations, and critical fireside training sessions.
            </div>
          </div>
          
          {/* Custom Tabs */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 6, border: "1px solid var(--gborder)" }}>
             <button 
                onClick={() => setActiveTab("active")}
                style={{ 
                   padding: "10px 20px", borderRadius: 8, cursor: "pointer", border: "none",
                   background: activeTab === "active" ? "var(--gbs)" : "transparent",
                   color: activeTab === "active" ? "var(--ewhite)" : "var(--emuted)",
                   fontWeight: 700, fontSize: 13, fontFamily: "var(--font)",
                   boxShadow: activeTab === "active" ? "var(--shadow)" : "none", transition: "all 0.2s"
                }}
             >Upcoming & Active</button>
             <button 
                onClick={() => setActiveTab("past")}
                style={{ 
                   padding: "10px 20px", borderRadius: 8, cursor: "pointer", border: "none",
                   background: activeTab === "past" ? "var(--gbs)" : "transparent",
                   color: activeTab === "past" ? "var(--ewhite)" : "var(--emuted)",
                   fontWeight: 700, fontSize: 13, fontFamily: "var(--font)",
                   boxShadow: activeTab === "past" ? "var(--shadow)" : "none", transition: "all 0.2s"
                }}
             >Past Summits</button>
          </div>
      </div>

      {/* Grid List of Events */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 24 }}>
          {displayEvents.map((evt) => (
             <div 
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="gc"
                style={{
                   borderRadius: 20, border: "1px solid var(--gborder)", padding: 24, cursor: "pointer",
                   display: "flex", flexDirection: "column", gap: 16, transition: "all 0.2s", position: "relative",
                   overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                   e.currentTarget.style.transform = "translateY(-4px)";
                   e.currentTarget.style.boxShadow = "var(--shadow2)";
                   e.currentTarget.style.borderColor = country.color;
                }}
                onMouseLeave={(e) => {
                   e.currentTarget.style.transform = "none";
                   e.currentTarget.style.boxShadow = "var(--shadow)";
                   e.currentTarget.style.borderColor = "var(--gborder)";
                }}
             >
                {/* Visual Flair Header */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: `linear-gradient(180deg, ${country.color}20 0%, transparent 100%)`, zIndex: 0 }} />
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1, position: "relative" }}>
                   <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--gbs)", border: "1px solid var(--gborder)", display: "flex", alignItems: "center", justifyContent: "center", color: country.color }}>
                      {getEventIcon(evt.type)}
                   </div>
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span style={{ 
                         fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 12, 
                         background: evt.status === "current" ? "#E8A02020" : evt.status === "upcoming" ? "#3B8BEB20" : "rgba(255,255,255,0.05)", 
                         color: evt.status === "current" ? "#E8A020" : evt.status === "upcoming" ? "#3B8BEB" : "var(--emuted)",
                         textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)"
                      }}>
                         {evt.status}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 600 }}>
                         {evt.type}
                      </span>
                   </div>
                </div>

                <div style={{ zIndex: 1, position: "relative" }}>
                   <h3 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.3 }}>
                      {evt.title}
                   </h3>
                   <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", marginBottom: 4 }}>
                      <IconCalendarEvent size={16} /> <span style={{ fontWeight: 600, color: "var(--ewhite)" }}>{evt.dateFormatted}</span>
                   </div>
                   <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                      <IconMapPin size={16} /> <span>{evt.location}</span>
                   </div>
                </div>

                <div style={{ zIndex: 1, position: "relative", marginTop: "auto", borderTop: "1px solid var(--gborder)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 600 }}>
                      <IconUsers size={16} style={{ color: country.color }}/> {evt.attendees} Registered
                   </div>
                   <div style={{ fontSize: 12, fontWeight: 700, color: country.color, fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 4 }}>
                      Full Details <IconArrowRight size={14}/>
                   </div>
                </div>
             </div>
          ))}
          {displayEvents.length === 0 && (
             <div style={{ gridColumn: "1 / -1", padding: 60, textAlign: "center", color: "var(--emuted)", fontSize: 14, fontFamily: "var(--font)", border: "1px dashed var(--gborder)", borderRadius: 20 }}>
                No events found matching this filter.
             </div>
          )}
      </div>

      {/* Slide-out Event Master Panel */}
      {selectedEvent && (
         <div 
           className="slider-overlay"
           onClick={() => setSelectedEvent(null)}
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
                  width: "500px", height: "100%", background: "var(--gbs)", borderLeft: "1px solid var(--gborder)",
                  boxShadow: "-30px 0 60px rgba(0,0,0,0.25)", zIndex: 9999,
                  overflowY: "auto", display: "flex", flexDirection: "column",
                  backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)"
               }}
            >
               {/* Hero Header */}
               <div style={{ 
                   padding: "40px 30px", borderBottom: "1px solid var(--gborder)", 
                   background: `linear-gradient(180deg, ${country.color}20 0%, transparent 100%)`,
                   position: "relative"
               }}>
                   <button 
                      onClick={() => setSelectedEvent(null)}
                      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--gborder)", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ewhite)", position: "absolute", top: 24, right: 24 }}
                   >
                      <IconX size={18} />
                   </button>
                   
                   <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "6px 14px", borderRadius: 20, background: country.color, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)" }}>
                         {selectedEvent.type}
                      </span>
                      {selectedEvent.status === "current" && (
                         <span style={{ fontSize: 10, fontWeight: 800, padding: "6px 14px", borderRadius: 20, border: "1px solid #E8A020", color: "#E8A020", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E8A020", boxShadow: "0 0 10px #E8A020" }}/> Active Now
                         </span>
                      )}
                   </div>
                   
                   <h2 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.2 }}>
                      {selectedEvent.title}
                   </h2>
               </div>

               {/* Logistics Block */}
               <div style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 32 }}>
                   
                   {/* Meta Grid */}
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div className="gc" style={{ padding: 16, borderRadius: 16, border: "1px solid var(--gborder)", background: "rgba(0,0,0,0.1)" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: "var(--emuted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            <IconCalendarEvent size={16}/> Date
                         </div>
                         <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedEvent.dateFormatted}</div>
                      </div>
                      <div className="gc" style={{ padding: 16, borderRadius: 16, border: "1px solid var(--gborder)", background: "rgba(0,0,0,0.1)" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: "var(--emuted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            <IconClock size={16}/> Time Bracket
                         </div>
                         <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedEvent.timeLine}</div>
                      </div>
                   </div>

                   <div className="gc" style={{ padding: 16, borderRadius: 16, border: "1px solid var(--gborder)", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "flex-start", gap: 16 }}>
                      <IconMapPin size={24} style={{ color: country.color, flexShrink: 0 }}/>
                      <div>
                         <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Venue Location</div>
                         <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.4 }}>{selectedEvent.location}</div>
                      </div>
                   </div>

                   <hr style={{ border: "none", borderTop: "1px solid var(--gborder)", margin: 0 }}/>

                   {/* Description */}
                   <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Event Overview</h3>
                      <p style={{ margin: 0, fontSize: 15, color: "var(--emuted)", fontFamily: "var(--font)", lineHeight: 1.7 }}>
                         {selectedEvent.description}
                      </p>
                   </div>

                   {/* Keynote / Admin */}
                   {selectedEvent.keynote && (
                      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px dashed var(--gborder)" }}>
                         <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--gbs)", border: "1px solid var(--gborder)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--emuted)" }}>
                            <IconSpeakerphone size={20}/>
                         </div>
                         <div>
                            <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Officiating Guest / Lead</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedEvent.keynote}</div>
                         </div>
                      </div>
                   )}
               </div>

               {/* Action Footer */}
               {selectedEvent.status !== "past" && (
                   <div style={{ marginTop: "auto", padding: 24, borderTop: "1px solid var(--gborder)", display: "flex", gap: 12 }}>
                      <button 
                         style={{ flex: 1, padding: "14px", borderRadius: 12, background: country.color, color: "#fff", border: "none", fontSize: 14, fontWeight: 800, fontFamily: "var(--font)", cursor: "pointer", boxShadow: `0 4px 16px ${country.color}50` }}
                      >
                         Manage Attendee Register
                      </button>
                   </div>
               )}
               {selectedEvent.status === "past" && (
                   <div style={{ marginTop: "auto", padding: 24, borderTop: "1px solid var(--gborder)", display: "flex", gap: 12 }}>
                      <button 
                         style={{ flex: 1, padding: "14px", borderRadius: 12, background: "transparent", color: "var(--ewhite)", border: "1px solid var(--gborder)", fontSize: 14, fontWeight: 700, fontFamily: "var(--font)", cursor: "pointer" }}
                      >
                         View Post-Event Report
                      </button>
                   </div>
               )}

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
