"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { COUNTRIES } from "@/lib/mock-data";
import { 
  IconSchool, IconActivity, IconBuildingBank, IconWorld, IconArrowUpRight,
  IconClock, IconUsers, IconArchive
} from "@tabler/icons-react";

export default function ProgramsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session?.user) return null;

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  const allPrograms = COUNTRIES.flatMap((c) =>
    c.projects.map((p) => ({ ...p, country: c.name, countryId: c.id, flag: c.flag, color: c.color }))
  );

  const active = allPrograms.filter(p => p.status === "active");
  const completed = allPrograms.filter(p => p.status === "completed");
  const totalFellowsInPrograms = allPrograms.reduce((s, p) => s + p.fellows, 0);

  return (
    <AppShell
      activePage="programs"
      pageTitle="Programs Portfolio"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Programs" }]}
      user={user}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        
        {/* Page Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>
             Global Program Architecture
          </h1>
          <p style={{ fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 700 }}>
             A unified view of all strategic fellowship tracks, sectoral deployments, and active program cycles across the continent.
          </p>
        </div>

        {/* Strategic KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            { label: "Total Tracks", value: allPrograms.length, color: "#3B8BEB", icon: <IconBuildingBank size={24} /> },
            { label: "Active Cycles", value: active.length, color: "#2EC27E", icon: <IconActivity size={24} /> },
            { label: "Total Intake", value: totalFellowsInPrograms, color: "#9B59B6", icon: <IconUsers size={24} /> },
            { label: "Partner Nations", value: COUNTRIES.length, color: "#E8A020", icon: <IconWorld size={24} /> },
          ].map((k) => (
            <div key={k.label} className="gc" style={{ padding: "26px", display: "flex", alignItems: "center", gap: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, background: k.color, opacity: 0.1, filter: "blur(30px)", borderRadius: "50%" }} />
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${k.color}15`, border: `1px solid ${k.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center", color: k.color,
                boxShadow: `0 8px 20px -8px ${k.color}60`, zIndex: 1
              }}>{k.icon}</div>
              <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 6, fontWeight: 700, letterSpacing: "0.5px" }}>{k.label.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Program Portfolio Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 24 }}>
          {allPrograms.map((p, i) => (
            <div
              key={i}
              className="gc hover-lift"
              style={{ padding: "30px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 24, position: "relative" }}
              onClick={() => router.push(`/dashboard/countries/${p.countryId}/programs`)}
            >
              {/* Header: Icon + Name + Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ 
                        width: 56, height: 56, borderRadius: 14, background: `${p.color}15`, border: `1px solid ${p.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center", color: p.color,
                        boxShadow: `0 8px 24px -10px ${p.color}50`
                    }}>
                        <IconSchool size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{p.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 22 }}>{p.flag}</span>
                            <span style={{ fontSize: 13, color: "var(--emuted)", fontWeight: 600 }}>{p.country.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px",
                  background: p.status === "active" ? "rgba(46,194,126,0.12)" : p.status === "completed" ? "rgba(59,139,235,0.12)" : "rgba(255,255,255,0.06)",
                  color: p.status === "active" ? "#2EC27E" : p.status === "completed" ? "#3B8BEB" : "rgba(255,255,255,0.40)",
                  border: `1px solid ${p.status === "active" ? "rgba(46,194,126,0.2)" : p.status === "completed" ? "rgba(59,139,235,0.2)" : "rgba(255,255,255,0.1)"}`,
                }}>
                  {p.status}
                </div>
              </div>

              {/* Metrics Section */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                 <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)", marginBottom: 8 }}>
                       <IconUsers size={16} /> <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>INTAKE CAPACITY</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: p.color }}>{p.fellows || "—"} <span style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 500 }}>FELLOWS</span></div>
                 </div>
                 <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)", marginBottom: 8 }}>
                       <IconClock size={16} /> <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px" }}>COMMENCEMENT</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ewhite)", marginTop: 4 }}>{p.startDate}</div>
                 </div>
              </div>

              {/* Lifecycle Progress */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: "var(--emuted)", display: "flex", alignItems: "center", gap: 6 }}><IconActivity size={14} /> PROGRAM LIFECYCLE</span>
                    <span style={{ color: p.color }}>{p.status === "completed" ? "100%" : p.status === "active" ? "65%" : "10%"} COMPLETED</span>
                 </div>
                 <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{ 
                        width: p.status === "completed" ? "100%" : p.status === "active" ? "65%" : "10%", 
                        height: "100%", background: `linear-gradient(90deg, ${p.color}aa, ${p.color})`,
                        boxShadow: `0 0 12px ${p.color}50`
                    }} />
                 </div>
              </div>

              {/* Click-through Indicator */}
              <div style={{ position: "absolute", bottom: 15, right: 20, color: "rgba(255,255,255,0.15)" }}>
                 <IconArrowUpRight size={20} />
              </div>

            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
