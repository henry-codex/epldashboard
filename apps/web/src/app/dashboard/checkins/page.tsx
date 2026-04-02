"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { COUNTRIES, AVG_CHECKIN, TOTAL_INST } from "@/lib/mock-data";
import { 
  IconChecklist, IconBuildingBank, IconUsers, IconAlertTriangle,
  IconArrowUpRight, IconShieldCheck, IconClock
} from "@tabler/icons-react";

export default function CheckInsPage() {
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

  const overdueCount = COUNTRIES.filter(c => c.checkInRate < 85).length;
  const onTrackCount = COUNTRIES.filter(c => c.checkInRate >= 85).length;

  return (
    <AppShell
      activePage="checkins"
      pageTitle="Check-in Compliance"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Check-ins" }]}
      user={user}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        
        {/* Page Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>
             Continental Compliance Hub
          </h1>
          <p style={{ fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 700 }}>
             Cross-border monitoring of institutional check-in health, fellow reporting consistency, and program accountability.
          </p>
        </div>

        {/* Global Compliance KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {[
            { label: "Avg Compliance", value: `${AVG_CHECKIN}%`, color: "#3B8BEB", icon: <IconShieldCheck size={24} /> },
            { label: "Institutions", value: TOTAL_INST, color: "#9B59B6", icon: <IconBuildingBank size={24} /> },
            { label: "On Track", value: onTrackCount, color: "#2EC27E", icon: <IconChecklist size={24} /> },
            { label: "Needs Review", value: overdueCount, color: "#E05C5C", icon: <IconAlertTriangle size={24} /> },
          ].map((k) => (
            <div key={k.label} className="gc" style={{ padding: "26px", display: "flex", alignItems: "center", gap: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, background: k.color, opacity: 0.1, filter: "blur(30px)", borderRadius: "50%" }} />
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${k.color}15`, border: `1px solid ${k.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center", color: k.color,
                boxShadow: `0 8px 20px -8px ${k.color}50`, zIndex: 1
              }}>{k.icon}</div>
              <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 6, fontWeight: 700, letterSpacing: "0.5px" }}>{k.label.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Regional Compliance Matrix */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconChecklist size={20} color="#3B8BEB" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Nation-State Compliance Summary</h3>
           </div>
           
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: 16 }}>
             {COUNTRIES.sort((a, b) => b.checkInRate - a.checkInRate).map((c) => {
               const isGood = c.checkInRate >= 85;
               return (
                 <div
                   key={c.id}
                   className="gc hover-lift"
                   style={{ padding: "30px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 20, position: "relative" }}
                   onClick={() => router.push(`/dashboard/countries/${c.id}/checkins`)}
                 >
                    {/* Country Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ fontSize: 32, width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.08)" }}>{c.flag}</div>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{c.name}</div>
                                <div style={{ fontSize: 13, color: "var(--emuted)", fontWeight: 600 }}>{c.institutions} ACTIVE INSTITUTIONS</div>
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 32, fontWeight: 900, color: isGood ? "#2EC27E" : "#E05C5C", fontFamily: "var(--font)", lineHeight: 1 }}>{c.checkInRate}%</div>
                            <div style={{
                                padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", marginTop: 8,
                                background: isGood ? "rgba(46,194,126,0.12)" : "rgba(224,92,92,0.12)",
                                color: isGood ? "#2EC27E" : "#E05C5C",
                                border: `1px solid ${isGood ? "rgba(46,194,126,0.2)" : "rgba(224,92,92,0.2)"}`,
                                display: "inline-flex", alignItems: "center", gap: 6
                            }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", boxShadow: "0 0 6px currentColor" }} />
                                {isGood ? "ON TRACK" : "NEEDS REVIEW"}
                            </div>
                        </div>
                    </div>

                    {/* Meta Section */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                         <div style={{ padding: "14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
                             <IconUsers size={16} color="var(--emuted)" />
                             <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)" }}>{c.fellows} ACTIVE FELLOWS</div>
                         </div>
                         <div style={{ padding: "14px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 12 }}>
                             <IconClock size={16} color="var(--emuted)" />
                             <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)" }}>COHORT 7 ACTIVE</div>
                         </div>
                    </div>

                    {/* Progress Monitor */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                         <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                            <div style={{
                                width: `${c.checkInRate}%`, height: "100%", borderRadius: 5,
                                background: isGood ? `linear-gradient(90deg, ${c.color}aa, ${c.color})` : `linear-gradient(90deg, #E05C5Caa, #E05C5C)`,
                                boxShadow: `0 0 12px ${isGood ? c.color : "#E05C5C"}40`
                            }} />
                         </div>
                    </div>

                    {/* Footer Indication */}
                    <div style={{ position: "absolute", bottom: 15, right: 20, color: "rgba(255,255,255,0.15)" }}>
                        <IconArrowUpRight size={20} />
                    </div>
                 </div>
               );
             })}
           </div>
        </div>

      </div>
    </AppShell>
  );
}
