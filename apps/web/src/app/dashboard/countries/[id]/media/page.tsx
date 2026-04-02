"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import {
  IconFolder,
  IconFolderPlus,
  IconArrowLeft,
  IconPhoto,
  IconDotsVertical,
  IconUpload
} from "@tabler/icons-react";

type MediaAlbum = {
  id: string;
  name: string;
  dateCreated: string;
  itemCount: number;
  coverColor: string;
  photos: { id: string; name: string }[];
};

const MOCK_ALBUMS: MediaAlbum[] = [
  {
    id: "a1",
    name: "Cohort 7 Graduation Highlights",
    dateCreated: "May 25, 2026",
    itemCount: 42,
    coverColor: "#3B8BEB",
    photos: Array.from({ length: 42 }).map((_, i) => ({ id: `p${i}`, name: `Graduation_Shot_${i+1}.jpg` }))
  },
  {
    id: "a2",
    name: "National Policy Orientation",
    dateCreated: "April 02, 2026",
    itemCount: 18,
    coverColor: "#2EC27E",
    photos: Array.from({ length: 18 }).map((_, i) => ({ id: `p${i}`, name: `Orientation_Day_${i+1}.jpg` }))
  },
  {
    id: "a3",
    name: "Fireside Training Sessions",
    dateCreated: "March 15, 2026",
    itemCount: 9,
    coverColor: "#E8A020",
    photos: Array.from({ length: 9 }).map((_, i) => ({ id: `p${i}`, name: `Fireside_Training_${i+1}.jpg` }))
  },
  {
    id: "a4",
    name: "Annual Alumni Meetup 2025",
    dateCreated: "December 15, 2025",
    itemCount: 104,
    coverColor: "#7F77DD",
    photos: Array.from({ length: 104 }).map((_, i) => ({ id: `p${i}`, name: `Meetup_2025_${i+1}.jpg` }))
  },
  {
    id: "a5",
    name: "Community Site Visits",
    dateCreated: "October 10, 2025",
    itemCount: 22,
    coverColor: "#E85E64",
    photos: Array.from({ length: 22 }).map((_, i) => ({ id: `p${i}`, name: `Site_Visit_${i+1}.jpg` }))
  }
];

export default function CountryMediaPage() {
  const params = useParams();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];
  
  const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null);

  if (!country) return null;

  return (
    <CountryLayout activePage="media" pageTitle="Media Library">
       
       {/* Hub Header */}
       {!selectedAlbum ? (
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 8 }}>
                  Media Directory
                </div>
                <div style={{ fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                  Grouped albums and visual documentation for {country.name} operations.
                </div>
              </div>
              <button style={{
                 background: country.color, color: "#fff", border: "none", padding: "10px 20px", 
                 borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "var(--font)", 
                 boxShadow: `0 4px 12px ${country.color}40`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
              }}>
                 <IconFolderPlus size={18} /> Create New Album
              </button>
          </div>
       ) : (
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <button 
                   onClick={() => setSelectedAlbum(null)}
                   style={{ 
                      display: "flex", alignItems: "center", gap: 6, color: "var(--emuted)", cursor: "pointer", 
                      background: "transparent", border: "none", fontSize: 13, fontWeight: 600, fontFamily: "var(--font)", width: "fit-content", padding: 0 
                   }}
                >
                   <IconArrowLeft size={16} /> Back to Directory
                </button>
                <div>
                   <div style={{ fontSize: 28, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                     <IconFolder size={32} style={{ color: selectedAlbum.coverColor }} /> {selectedAlbum.name}
                   </div>
                   <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                     {selectedAlbum.itemCount} media items • Created {selectedAlbum.dateCreated}
                   </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                 <button style={{
                    background: "rgba(255,255,255,0.05)", color: "var(--ewhite)", border: "1px solid var(--gborder)", padding: "10px 20px", 
                    borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "var(--font)", cursor: "pointer"
                 }}>
                    Album Settings
                 </button>
                 <button style={{
                    background: country.color, color: "#fff", border: "none", padding: "10px 20px", 
                    borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "var(--font)", 
                    boxShadow: `0 4px 12px ${country.color}40`, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                 }}>
                    <IconUpload size={18} /> Upload Media
                 </button>
              </div>
          </div>
       )}

       {/* Directory View */}
       {!selectedAlbum && (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
               {MOCK_ALBUMS.map(album => (
                  <div 
                     key={album.id}
                     onClick={() => setSelectedAlbum(album)}
                     className="gc"
                     style={{
                        borderRadius: 16, border: "1px solid var(--gborder)", cursor: "pointer",
                        display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s",
                        position: "relative", overflow: "hidden"
                     }}
                     onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "var(--shadow2)";
                     }}
                     onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "var(--shadow)";
                     }}
                  >
                     {/* Album Art Cover (Mock Gradient) */}
                     <div style={{ height: 140, background: `linear-gradient(135deg, ${album.coverColor}25 0%, rgba(0,0,0,0.1) 100%)`, borderBottom: "1px solid var(--gborder)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <IconFolder size={48} style={{ color: album.coverColor, opacity: 0.8 }} />
                        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", padding: 4, borderRadius: 8, color: "var(--ewhite)", border: "1px solid rgba(255,255,255,0.1)" }}>
                           <IconDotsVertical size={16}/>
                        </div>
                     </div>
                     
                     <div style={{ padding: 20 }}>
                        <h3 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.3 }}>
                           {album.name}
                        </h3>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                           <span style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                              {album.dateCreated}
                           </span>
                           <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "var(--ewhite)", border: "1px solid var(--gborder)", display: "flex", alignItems: "center", gap: 4 }}>
                              <IconPhoto size={12}/> {album.itemCount} items
                           </span>
                        </div>
                     </div>
                  </div>
               ))}
           </div>
       )}

       {/* Inside Album View */}
       {selectedAlbum && (
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
               {selectedAlbum.photos.map((photo) => (
                   <div 
                      key={photo.id}
                      className="gc"
                      style={{ 
                         aspectRatio: "1", borderRadius: 12, border: "1px solid var(--gborder)", background: "rgba(0,0,0,0.1)",
                         display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                         cursor: "pointer", position: "relative", overflow: "hidden", transition: "border-color 0.2s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = selectedAlbum.coverColor; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--gborder)"; }}
                   >
                      <IconPhoto size={36} style={{ color: "var(--emuted)", opacity: 0.5, marginBottom: 16 }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 12, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", fontSize: 11, color: "var(--ewhite)", fontFamily: "var(--font)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                         {photo.name}
                      </div>
                   </div>
               ))}
           </div>
       )}
       
    </CountryLayout>
  );
}
