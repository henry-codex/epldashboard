"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import {
  IconBuildingBank,
  IconMapPin,
  IconUserCircle,
  IconPhoneCall,
  IconMail,
  IconX,
  IconArrowUpRight,
  IconBriefcase
} from "@tabler/icons-react";

type Partner = {
  id: string;
  name: string;
  type: "Government Ministry" | "Agency" | "Private Sector" | "Development Partner";
  location: string;
  contactPerson: string;
  contactRole: string;
  email: string;
  phone: string;
  activeFellows: number;
  established: string;
};

const MOCK_PARTNERS: Partner[] = [
  {
    id: "p1",
    name: "Ministry of Finance",
    type: "Government Ministry",
    location: "Ministries, Accra",
    contactPerson: "Dr. Kwame Owusu",
    contactRole: "Chief Director",
    email: "k.owusu@mof.gov.gh",
    phone: "+233 24 123 4567",
    activeFellows: 15,
    established: "2018"
  },
  {
    id: "p2",
    name: "Ministry of Education",
    type: "Government Ministry",
    location: "Osu, Accra",
    contactPerson: "Mrs. Evelyn Baah",
    contactRole: "Director of HR",
    email: "e.baah@moe.gov.gh",
    phone: "+233 20 987 6543",
    activeFellows: 12,
    established: "2019"
  },
  {
    id: "p3",
    name: "Environmental Protection Agency",
    type: "Agency",
    location: "Airport Residential Area, Accra",
    contactPerson: "Mr. Samuel Tetteh",
    contactRole: "Head of Operations",
    email: "s.tetteh@epa.gov.gh",
    phone: "+233 27 555 1234",
    activeFellows: 8,
    established: "2020"
  },
  {
    id: "p4",
    name: "Ministry of Gender, Children and Social Protection",
    type: "Government Ministry",
    location: "Ministries, Accra",
    contactPerson: "Hon. Sarah Adjei",
    contactRole: "Deputy Minister",
    email: "s.adjei@mogcsp.gov.gh",
    phone: "+233 24 444 8888",
    activeFellows: 22,
    established: "2021"
  },
  {
    id: "p5",
    name: "Office of the Head of Civil Service",
    type: "Agency",
    location: "Ministries Enclave, Accra",
    contactPerson: "Mr. Nana Mensah",
    contactRole: "Chief Director",
    email: "nana.mensah@ohcs.gov.gh",
    phone: "+233 20 111 2222",
    activeFellows: 10,
    established: "2018"
  },
  {
    id: "p6",
    name: "Ministry of Communications",
    type: "Government Ministry",
    location: "Ridge, Accra",
    contactPerson: "Mrs. Anita Kusi",
    contactRole: "Head of IT",
    email: "a.kusi@moc.gov.gh",
    phone: "+233 55 999 7777",
    activeFellows: 5,
    established: "2022"
  },
  {
    id: "p7",
    name: "Ministry of National Security",
    type: "Government Ministry",
    location: "Cantonments, Accra",
    contactPerson: "Col. Emmanuel Darko",
    contactRole: "Director of Intelligence",
    email: "e.darko@mns.gov.gh",
    phone: "+233 24 333 4444",
    activeFellows: 15,
    established: "2024"
  }
];

export default function PartnersPage() {
  const params = useParams();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  
  // Quick fix: allow any country to display the mock partners, but in a real app, filter them by id.
  const partners = MOCK_PARTNERS;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPartner(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!country) return null;

  return (
    <CountryLayout activePage="partners" pageTitle="Partner Institutions">
        
       {/* Hub Header */}
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 8 }}>
              {country.name} Partner Network
            </div>
            <div style={{ fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)" }}>
              Collaborating with {partners.length} institutions to deploy fellows and drive public sector innovation.
            </div>
          </div>
          <button style={{
             background: country.color, color: "#fff", border: "none", padding: "10px 20px", 
             borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "var(--font)", 
             boxShadow: `0 4px 12px ${country.color}40`, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
          }}>
             Add Partner <IconArrowUpRight size={16} />
          </button>
      </div>

       {/* Grid Layout of Partner Cards */}
       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {partners.map(partner => (
             <div 
               key={partner.id}
               className="gc"
               onClick={() => setSelectedPartner(partner)}
               style={{
                  padding: 24, borderRadius: 16, border: "1px solid var(--gborder)", cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 16, transition: "transform 0.2s, box-shadow 0.2s"
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
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                   <div style={{ width: 48, height: 48, borderRadius: 12, background: `${country.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: country.color, flexShrink: 0 }}>
                      <IconBuildingBank size={24} />
                   </div>
                   <div>
                      <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.3 }}>
                         {partner.name}
                      </h3>
                      <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                         {partner.type}
                      </div>
                   </div>
                </div>
                
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid var(--gborder)" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                      <IconBriefcase size={16} style={{ color: country.color }}/> 
                      <span style={{ fontWeight: 700, color: "var(--ewhite)" }}>{partner.activeFellows}</span> Fellows
                   </div>
                </div>
             </div>
          ))}
       </div>

       {/* Slider Panel for Partner Detail */}
       {selectedPartner && (
         <div 
           className="slider-overlay"
           onClick={() => setSelectedPartner(null)}
           style={{
             position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
             background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
             zIndex: 9998, display: "flex", justifyContent: "flex-end"
           }}
         >
            <div 
               className="sidebar-panel"
               onClick={(e) => e.stopPropagation()}
               style={{
                  width: "400px", height: "100%", background: "var(--gbs)", borderLeft: "1px solid var(--gborder)",
                  boxShadow: "-20px 0 50px rgba(0,0,0,0.15)", zIndex: 9999,
                  overflowY: "auto", display: "flex", flexDirection: "column",
                  backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)"
               }}
            >
               {/* Header Block */}
               <div style={{ 
                   padding: "30px 24px", borderBottom: "1px solid var(--gborder)", 
                   background: `linear-gradient(180deg, ${country.color}20 0%, transparent 100%)`,
                   position: "relative"
               }}>
                   <button 
                      onClick={() => setSelectedPartner(null)}
                      style={{ 
                         background: "var(--gborder)", border: "none", width: 32, height: 32, borderRadius: "50%",
                         display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ewhite)",
                         position: "absolute", top: 24, right: 24
                      }}
                   >
                      <IconX size={18} />
                   </button>
                   
                   <div style={{ width: 64, height: 64, borderRadius: 16, background: `${country.color}20`, border: `1px solid ${country.color}40`, display: "flex", alignItems: "center", justifyContent: "center", color: country.color, marginBottom: 20 }}>
                      <IconBuildingBank size={32} />
                   </div>
                   <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.2 }}>
                      {selectedPartner.name}
                   </h2>
                   <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: country.color, fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1px" }}>
                      {selectedPartner.type}
                   </div>
               </div>

               {/* Body Content */}
               <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 32 }}>

                   {/* Location Info */}
                   <div>
                       <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
                          Physical Location
                       </div>
                       <div className="gc" style={{ padding: 16, borderRadius: 12, border: "1px solid var(--gborder)", display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
                             <IconMapPin size={20} style={{ color: "var(--ewhite)" }}/>
                          </div>
                          <div>
                             <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedPartner.location}</div>
                             <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>{country.name}</div>
                          </div>
                       </div>
                   </div>

                   {/* Contact Person Info */}
                   <div>
                       <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
                          Primary Point of Contact
                       </div>
                       <div className="gc" style={{ padding: "20px 16px", borderRadius: 12, border: "1px solid var(--gborder)", display: "flex", flexDirection: "column", gap: 16 }}>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                             <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gborder)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <IconUserCircle size={24} style={{ color: "var(--ewhite)" }}/>
                             </div>
                             <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedPartner.contactPerson}</div>
                                <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>{selectedPartner.contactRole}</div>
                             </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--gborder)", paddingTop: 16 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                 <IconMail size={16} style={{ color: country.color }}/>
                                 <a href={`mailto:${selectedPartner.email}`} style={{ fontSize: 13, color: "var(--ewhite)", fontFamily: "var(--font)", textDecoration: "none" }}>{selectedPartner.email}</a>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                 <IconPhoneCall size={16} style={{ color: country.color }}/>
                                 <a href={`tel:${selectedPartner.phone}`} style={{ fontSize: 13, color: "var(--ewhite)", fontFamily: "var(--font)", textDecoration: "none" }}>{selectedPartner.phone}</a>
                              </div>
                          </div>

                       </div>
                   </div>
               </div>

               {/* Footer / Actions */}
               <div style={{ marginTop: "auto", padding: 24, borderTop: "1px solid var(--gborder)" }}>
                  <button 
                     style={{ 
                        width: "100%", padding: "12px", borderRadius: 10, background: "transparent", color: "var(--ewhite)", 
                        border: "1px solid var(--gborder)", fontSize: 13, fontWeight: 700, fontFamily: "var(--font)", cursor: "pointer"
                     }}
                  >
                     Edit Details
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
