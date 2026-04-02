"use client";

import { useParams, useRouter } from "next/navigation";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import {
  IconArrowLeft,
  IconBuildingBank,
  IconUsersGroup,
  IconBriefcase,
  IconAward,
  IconFileText,
  IconCalendarEvent,
  IconHeartHandshake,
  IconTarget,
  IconCheck
} from "@tabler/icons-react";

const PROJECT_EXTENSIONS: Record<string, any> = {
  "public-service-fellowship": {
    name: "Public Service Fellowship",
    lead: "Dr. Evelyn Mensah",
    established: "2018",
    phase: "Scaled Deployment",
    sponsors: ["Co-Impact", "Mastercard Foundation"],
    institutions: ["Ministry of Finance", "Ministry of Education", "Environmental Protection Agency"],
    longDescription: "The Emerging Public Leaders of Ghana (EPL Ghana) Public Service Fellowship is a transformative one-year journey of growth, innovation, and leadership. It begins with a rigorous and highly competitive selection process designed to identify exceptional individuals who exemplify our values of excellence, integrity, leadership, and community service. Through leadership development, mentorship, and capacity-building programmes, we nurture a generation of ethical public servants committed to innovation, inclusion, and national development.",
    outcomes: ["Placing 100+ graduates in key government sectors", "Establishing a unified network of young policymakers", "Modernizing aging civil service frameworks"]
  },
  "women-on-the-rise": {
    name: "Women on the Rise",
    lead: "Mrs. Serwaa Baah",
    established: "2024",
    phase: "Active Pilot",
    sponsors: ["Co-Impact", "Office of the Head of Civil Service (OHCS)"],
    institutions: ["Ministry of Gender", "Ministry of Communications"],
    longDescription: "The Women on the Rise Project is a transformative initiative addressing systemic barriers that prevent women from leadership in Ghana's Public Service. Initiated in 2024, the project is influencing structural changes to promote gender equality, strengthen institutional commitment, and ensure sustained investment in women's professional development in partnership with the Government of Ghana.",
    outcomes: ["Implementing new gender mainstreaming SOPs", "Tripling female representation in directorship roles", "Securing permanent funding mandates for female professional training"]
  },
  "p-e-a-c-e": {
    name: "P.E.A.C.E",
    lead: "Chief Inspector Osei",
    established: "2025",
    phase: "Inception Phase",
    sponsors: ["U.S. Embassy in Ghana"],
    institutions: ["Ministry of Interior", "Ministry of National Security", "Regional Authorities"],
    longDescription: "The Professional Engaged Against Conflict & Endangerment (P.E.A.C.E) Fellowship is a 12-month initiative equipping security service professionals and community leaders in Northern Ghana with leadership, negotiation, and peacebuilding skills to strengthen civilian-security relations and promote lasting peace.",
    outcomes: ["Mediating civilian-security relations rapidly", "De-escalating regional border conflicts", "Fostering mutual trust frameworks locally"]
  }
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as CountryId;
  const projectId = params?.projectId as string;
  const country = COUNTRIES_MAP[id];

  const details = PROJECT_EXTENSIONS[projectId];

  if (!country || !details) return (
     <CountryLayout activePage="programs" pageTitle="Project Details">
         <div style={{ padding: 40, textAlign: "center", color: "var(--emuted)", fontFamily: "var(--font)" }}>
             Project data could not be found. 
             <br/><br/>
             <button onClick={() => router.back()} style={{ border: "none", background: "var(--eborder)", color: "var(--ewhite)", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>Go Back</button>
         </div>
     </CountryLayout>
  );

  return (
    <CountryLayout activePage="programs" pageTitle="Project Profile">
       <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
          
          {/* Top Breadcrumb */}
          <div 
             onClick={() => router.back()} 
             style={{ 
               display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)", cursor: "pointer", 
               fontSize: 13, fontWeight: 600, fontFamily: "var(--font)", width: "fit-content" 
             }}
          >
             <IconArrowLeft size={16} /> Back to Projects Directory
          </div>

          {/* Hero Spotlight */}
          <div className="gc" style={{ padding: 40, borderRadius: 20, position: "relative", border: "1px solid var(--eborder)", background: "var(--gbs)", overflow: "hidden" }}>
             <div style={{ position: "absolute", top: -100, right: -100, width: 350, height: 350, background: `radial-gradient(circle, ${country.color}25 0%, transparent 70%)`, borderRadius: "50%" }} />
             
             <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 20 }}>
                 <div style={{ width: 80, height: 80, borderRadius: 20, background: `${country.color}20`, border: `1px solid ${country.color}40`, display: "flex", alignItems: "center", justifyContent: "center", color: country.color }}>
                     {details.name.includes("Women") ? <IconHeartHandshake size={40} /> : details.name.includes("P.E.A") ? <IconTarget size={40}/> : <IconUsersGroup size={40}/>}
                 </div>
                 <div>
                     <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                         {details.name}
                     </h1>
                     <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                        <span style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6 }}>
                           <IconCalendarEvent size={16} /> Est. {details.established}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6 }}>
                           <IconAward size={16} style={{ color: country.color }}/> {details.phase}
                        </span>
                     </div>
                 </div>
             </div>

             <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ewhite)", fontFamily: "var(--font)", maxWidth: 800 }}>
                 {details.longDescription}
             </div>
          </div>

          {/* 3-Column Layout for Data */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
             
             {/* Administrative Core */}
             <div className="gc" style={{ padding: 24, borderRadius: 16, border: "1px solid var(--eborder)", display: "flex", flexDirection: "column", gap: 20 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                     <div style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
                        <IconBriefcase size={20} style={{ color: "var(--emuted)" }} />
                     </div>
                     <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Project Admin
                     </h2>
                 </div>
                 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                       <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Project Lead</div>
                       <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{details.lead}</div>
                    </div>
                    <div>
                       <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Official Region</div>
                       <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6 }}>
                           {country.flag} {country.name} Operations
                       </div>
                    </div>
                 </div>
             </div>

             {/* Partnerships */}
             <div className="gc" style={{ padding: 24, borderRadius: 16, border: "1px solid var(--eborder)", display: "flex", flexDirection: "column", gap: 20 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                     <div style={{ padding: 8, borderRadius: 8, background: `${country.color}20` }}>
                        <IconHeartHandshake size={20} style={{ color: country.color }} />
                     </div>
                     <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Sponsors & Partners
                     </h2>
                 </div>
                 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                     {details.sponsors.map((sponsor: string, i: number) => (
                        <div key={i} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--gborder)", color: "var(--ewhite)", fontSize: 14, fontWeight: 500, fontFamily: "var(--font)" }}>
                           {sponsor}
                        </div>
                     ))}
                 </div>
             </div>

             {/* Involved Institutions */}
             <div className="gc" style={{ padding: 24, borderRadius: 16, border: "1px solid var(--eborder)", display: "flex", flexDirection: "column", gap: 20 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                     <div style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
                        <IconBuildingBank size={20} style={{ color: "var(--emuted)" }} />
                     </div>
                     <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px" }}>
                        Host Institutions
                     </h2>
                 </div>
                 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                     {details.institutions.map((inst: string, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                           <IconCheck size={16} style={{ color: "#2EC27E", flexShrink: 0, marginTop: 2 }}/>
                           <span style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.4 }}>{inst}</span>
                        </div>
                     ))}
                 </div>
             </div>

          </div>

          {/* Strategic Outcomes block */}
          <div className="gc" style={{ padding: 30, borderRadius: 16, border: "1px solid var(--eborder)", background: "rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <IconFileText size={22} style={{ color: "#E8A020" }}/>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Key Strategic Expected Outcomes
                  </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  {details.outcomes.map((out: string, i: number) => (
                      <div key={i} style={{ padding: 20, background: "var(--gbs)", border: "1px solid var(--gborder)", borderRadius: 12, fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                         {out}
                      </div>
                  ))}
              </div>
          </div>

       </div>
    </CountryLayout>
  );
}
