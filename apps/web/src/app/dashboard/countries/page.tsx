"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import {
  IconUsers,
  IconChevronRight,
  IconSchool,
  IconTrendingUp,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react";

const COUNTRIES = [
  { id: "gh", name: "Ghana", flag: "https://flagcdn.com/gh.svg", color: "#3B8BEB", fellows: 87, alumni: 142, institutions: 22, programs: 4, checkInRate: 94, trend: 12 },
  { id: "ke", name: "Kenya", flag: "https://flagcdn.com/ke.svg", color: "#9B59B6", fellows: 18, alumni: 44, institutions: 5, programs: 2, checkInRate: 88, trend: 6 },
  { id: "lr", name: "Liberia", flag: "https://flagcdn.com/lr.svg", color: "#E05C5C", fellows: 42, alumni: 68, institutions: 10, programs: 3, checkInRate: 79, trend: -3 },
  { id: "mw", name: "Malawi", flag: "https://flagcdn.com/mw.svg", color: "#E8A020", fellows: 35, alumni: 51, institutions: 9, programs: 2, checkInRate: 82, trend: 4 },
  { id: "sl", name: "Sierra Leone", flag: "https://flagcdn.com/sl.svg", color: "#2EC27E", fellows: 28, alumni: 39, institutions: 7, programs: 2, checkInRate: 91, trend: 8 },
];

export default function CountriesPage() {
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

  return (
    <AppShell
      activePage="countries"
      pageTitle="Countries"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Countries" }]}
      user={user}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24, padding: "12px 0" }}>
        {COUNTRIES.map((c) => {
          const up = c.trend >= 0;
          return (
            <div
              key={c.id}
              className="gc"
              onClick={() => router.push(`/dashboard/countries/${c.id}`)}
              style={{
                position: "relative",
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
                display: "flex", flexDirection: "column", gap: 20,
                overflow: "hidden",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "transparent",
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                target.style.transform = "translateY(-4px)";
                target.style.borderColor = `${c.color}60`;
                target.style.boxShadow = `0 12px 40px ${c.color}15, 0 4px 12px rgba(0,0,0,0.1)`;
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLDivElement;
                target.style.transform = "translateY(0)";
                target.style.borderColor = "transparent";
                target.style.boxShadow = "";
              }}
            >
              <div 
                style={{
                  position: "absolute", top: 0, right: 0, width: "150px", height: "150px",
                  background: `radial-gradient(circle at top right, ${c.color}25 0%, transparent 70%)`,
                  pointerEvents: "none", zIndex: 0
                }}
              />
              
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
                    border: `2px solid ${c.color}40`, padding: 2, background: "var(--eglass)",
                    boxShadow: `0 0 16px ${c.color}30`
                  }}>
                     <img src={c.flag} alt={`${c.name} Flag`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", letterSpacing: "-0.01em" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 500 }}>
                      <span style={{ color: "var(--ewhite)" }}>{c.programs}</span> active programs
                    </div>
                  </div>
                </div>
                <div style={{ 
                  width: 32, height: 32, borderRadius: 12, background: "var(--eglass)", 
                  display: "flex", justifyContent: "center", alignItems: "center"
                }}>
                  <IconChevronRight size={18} style={{ color: "var(--emuted)" }} />
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, zIndex: 1 }}>
                <div style={{
                  padding: "14px 12px", borderRadius: 14,
                  background: `${c.color}15`, border: `1px solid ${c.color}20`,
                  textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                }}>
                  <IconUsers size={18} stroke={2.5} style={{ color: c.color }} />
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginTop: 2 }}>
                    {c.fellows}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fellows</div>
                </div>
                
                <div style={{
                  padding: "14px 12px", borderRadius: 14,
                  background: "var(--eglass)", border: "1px solid var(--eborder, rgba(128,128,128,0.1))",
                  textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                }}>
                  <IconSchool size={18} stroke={2.5} style={{ color: "var(--emuted)" }} />
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginTop: 2 }}>
                    {c.institutions}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Inst.</div>
                </div>
                
                <div style={{
                  padding: "14px 12px", borderRadius: 14,
                  background: "var(--eglass)", border: "1px solid var(--eborder, rgba(128,128,128,0.1))",
                  textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4
                }}>
                  <IconTrendingUp size={18} stroke={2.5} style={{ color: c.checkInRate >= 90 ? "#2EC27E" : "#E8A020" }} />
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", marginTop: 2 }}>
                    {c.checkInRate}%
                  </div>
                  <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Check-in</div>
                </div>
              </div>

              {/* Footer trend */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 16px 0", borderTop: "1px dashed var(--eborder, rgba(128,128,128,0.2))", zIndex: 1
              }}>
                <span style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", fontWeight: 500 }}>
                  <span style={{ color: "var(--ewhite)", fontWeight: 700 }}>{c.alumni}</span> alumni 
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 12, fontWeight: 700, fontFamily: "var(--font)",
                  color: up ? "#2EC27E" : "#E05C5C",
                  background: up ? "rgba(46,194,126,0.1)" : "rgba(224,92,92,0.1)",
                  padding: "4px 8px", borderRadius: 20
                }}>
                  {up ? <IconArrowUpRight size={14} stroke={2.5} /> : <IconArrowDownRight size={14} stroke={2.5} />}
                  {up ? "+" : ""}{c.trend}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
