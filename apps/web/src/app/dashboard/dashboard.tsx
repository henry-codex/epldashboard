"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { MapCard } from "@/components/epl/map-card";
import {
  IconUsers,
  IconTrendingUp,
  IconCalendarStats,
  IconFlag,
  IconArrowUpRight,
  IconArrowDownRight,
  IconBuildingCommunity,
  IconSchool,
  IconCalendarEvent,
  IconChevronRight,
  IconCircleCheck,
  IconAlertTriangle,
  IconClock,
  IconGlobe,
} from "@tabler/icons-react";

/* ── Mock data — mirrors what country portals would upload ── */
const COUNTRIES = [
  {
    id: "gh", name: "Ghana", flag: "🇬🇭", color: "#3B8BEB",
    fellows: 87, alumni: 142, institutions: 22, activePrograms: 4,
    checkInRate: 94, cohorts: [2019, 2020, 2021, 2022, 2023, 2024],
    trend: +12, placed: 81, mediaItems: 14,
    upcomingEvents: 3, projects: ["Youth Policy Lab", "STEM Bridge", "Climate Resilience", "EdTech Pilot"],
  },
  {
    id: "ke", name: "Kenya", flag: "🇰🇪", color: "#9B59B6",
    fellows: 18, alumni: 44, institutions: 5, activePrograms: 2,
    checkInRate: 88, cohorts: [2022, 2023, 2024],
    trend: +6, placed: 16, mediaItems: 7,
    upcomingEvents: 1, projects: ["Nairobi Health Initiative", "AgriTech Fellows"],
  },
  {
    id: "lr", name: "Liberia", flag: "🇱🇷", color: "#E05C5C",
    fellows: 42, alumni: 68, institutions: 10, activePrograms: 3,
    checkInRate: 79, cohorts: [2020, 2021, 2022, 2023],
    trend: -3, placed: 36, mediaItems: 5,
    upcomingEvents: 2, projects: ["Governance Fellows", "Women in STEM", "Rural Health"],
  },
  {
    id: "mw", name: "Malawi", flag: "🇲🇼", color: "#E8A020",
    fellows: 35, alumni: 51, institutions: 9, activePrograms: 2,
    checkInRate: 82, cohorts: [2021, 2022, 2023],
    trend: +4, placed: 30, mediaItems: 3,
    upcomingEvents: 1, projects: ["Teacher Training", "Water & Sanitation"],
  },
  {
    id: "sl", name: "Sierra Leone", flag: "🇸🇱", color: "#2EC27E",
    fellows: 28, alumni: 39, institutions: 7, activePrograms: 2,
    checkInRate: 91, cohorts: [2022, 2023, 2024],
    trend: +8, placed: 26, mediaItems: 6,
    upcomingEvents: 2, projects: ["Education Access", "Public Health Network"],
  },
];

const TOTAL_FELLOWS = COUNTRIES.reduce((s, c) => s + c.fellows, 0);
const TOTAL_ALUMNI  = COUNTRIES.reduce((s, c) => s + c.alumni, 0);
const TOTAL_PLACED  = COUNTRIES.reduce((s, c) => s + c.placed, 0);
const TOTAL_INST    = COUNTRIES.reduce((s, c) => s + c.institutions, 0);
const AVG_CHECKIN   = Math.round(COUNTRIES.reduce((s, c) => s + c.checkInRate, 0) / COUNTRIES.length);

const RECENT_ACTIVITY = [
  { id: 1, type: "checkin",  text: "Ghana submitted Q1 2026 check-in report", time: "2h ago",  color: "#3B8BEB" },
  { id: 2, type: "fellow",   text: "12 new fellows onboarded in Kenya (Cohort 2024)", time: "5h ago",  color: "#9B59B6" },
  { id: 3, type: "alert",    text: "Liberia check-in overdue — 3 institutions pending", time: "1d ago", color: "#E05C5C" },
  { id: 4, type: "event",    text: "Sierra Leone alumni meetup scheduled for April 15", time: "1d ago", color: "#2EC27E" },
  { id: 5, type: "program",  text: "Malawi Teacher Training cohort 2023 completed placement", time: "2d ago", color: "#E8A020" },
  { id: 6, type: "checkin",  text: "Kenya bi-weekly progress update received", time: "3d ago", color: "#9B59B6" },
];

const UPCOMING_EVENTS = [
  { id: 1, title: "Ghana Alumni Summit 2026", date: "Apr 12", country: "Ghana", color: "#3B8BEB" },
  { id: 2, title: "SL Fellows Check-in Review", date: "Apr 15", country: "Sierra Leone", color: "#2EC27E" },
  { id: 3, title: "Continental Board Update", date: "Apr 20", country: "All", color: "rgba(255,255,255,0.60)" },
  { id: 4, title: "Kenya EdTech Demo Day", date: "May 02", country: "Kenya", color: "#9B59B6" },
];

/* ── Helpers ─────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 10, fontWeight: 700, fontFamily: "var(--font)",
      color: up ? "#2EC27E" : "#E05C5C",
      background: up ? "rgba(46,194,126,0.12)" : "rgba(224,92,92,0.12)",
      border: `1px solid ${up ? "rgba(46,194,126,0.30)" : "rgba(224,92,92,0.30)"}`,
      padding: "2px 8px", borderRadius: "var(--rf)",
    }}>
      {up ? <IconArrowUpRight size={11} /> : <IconArrowDownRight size={11} />}
      {up ? "+" : ""}{value}
    </span>
  );
}

/* ── KPI stat card (small) ───────────────────────────────── */
function KPIStat({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; accent: string;
}) {
  return (
    <div className="gc" style={{
      padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: accent,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 3 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/* ── Country row card (clickable → /dashboard/countries/[id]) */
function CountryRow({ country, onClick }: { country: typeof COUNTRIES[0]; onClick: () => void }) {
  const placementRate = Math.round((country.placed / country.fellows) * 100);
  return (
    <button
      onClick={onClick}
      className="gc"
      style={{
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: "1.8fr 1fr 1fr 1fr 0.8fr 40px",
        alignItems: "center",
        gap: 8,
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
        border: `1px solid rgba(255,255,255,0.08)`,
        transition: "border-color 0.2s, background 0.2s",
        background: "transparent",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${country.color}40`; e.currentTarget.style.background = `${country.color}08`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "transparent"; }}
    >
      {/* Country name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: "50%", overflow: "hidden", 
          border: "2px solid rgba(255,255,255,0.12)", flexShrink: 0,
          background: "rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <img 
            src={`https://flagcdn.com/w80/${country.id.toLowerCase()}.png`} 
            alt={country.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            {country.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            {country.activePrograms} active programs · {country.cohorts.length} cohorts
          </div>
        </div>
      </div>

      {/* Fellows */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          {country.fellows}
        </div>
        <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Fellows</div>
      </div>

      {/* Placement rate */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 50, height: 5, borderRadius: 3,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${placementRate}%`, height: "100%",
              borderRadius: 3,
              background: country.color,
            }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: country.color, fontFamily: "var(--font)" }}>
            {placementRate}%
          </span>
        </div>
        <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Placed</div>
      </div>

      {/* Check-in rate */}
      <div>
        <div style={{
          fontSize: 12, fontWeight: 600, fontFamily: "var(--font)",
          color: country.checkInRate >= 90 ? "#2EC27E" : country.checkInRate >= 80 ? "#E8A020" : "#E05C5C",
        }}>
          {country.checkInRate}%
        </div>
        <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Check-in</div>
      </div>

      {/* Trend */}
      <TrendBadge value={country.trend} />

      {/* Arrow */}
      <IconChevronRight size={16} style={{ color: "rgba(255,255,255,0.25)" }} />
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#05142a",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: "2px solid rgba(59,139,235,0.6)",
            borderTopColor: "#3B8BEB",
            animation: "spin 0.8s linear infinite",
          }} />
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Loading dashboard…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session?.user) return null;

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <AppShell
      activePage="overview"
      pageTitle="Overview"
      breadcrumbs={[{ label: "Dashboard" }]}
      user={user}
    >
      <div className="anim-page" style={{ display: "flex", flexDirection: "column", gap: 22 }}>

        {/* ── Greeting + date ─────────────────────────────── */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <div style={{
                fontSize: 22, fontWeight: 700, color: "var(--ewhite)",
                fontFamily: "var(--font)", letterSpacing: "-0.02em",
              }}>
                Good {getGreeting()}, {user?.name?.split(" ")[0] ?? "Admin"} 👋
              </div>
              <div style={{ fontSize: 12, color: "var(--emuted)", marginTop: 4, fontFamily: "var(--font)" }}>
                Continental overview — {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="epl-btn" style={{ padding: "7px 14px", fontSize: 11 }}>
                Export Report
              </button>
            </div>
          </div>
        </section>

        {/* ── Hero Element (Human Element) ───────────────── */}
        <section className="anim-in" style={{ animationDelay: "0.1s" }}>
          <div className="gc" style={{
            height: 200,
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            padding: "0 40px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.30)",
          }}>
            {/* Animated image bg */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "url('/Screenshot 2026-04-01 171412.png')",
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              animation: "heroZoom 30s infinite alternate linear",
              zIndex: 1,
            }} />
            
            {/* Glassy overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, rgba(8, 12, 28, 0.94) 0%, rgba(8, 12, 28, 0.60) 40%, rgba(8, 12, 28, 0.20) 100%)",
              zIndex: 2,
            }} />

            <div style={{ position: "relative", zIndex: 3, maxWidth: 480 }}>
              <div style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 100,
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)",
                fontSize: 10, color: "#fff", fontWeight: 700, marginBottom: 12,
                fontFamily: "var(--font)", letterSpacing: "0.08em", textTransform: "uppercase"
              }}>
                EPL Global
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                Empowering the next generation <br/> of Global public servants.
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.70)", marginTop: 12, lineHeight: 1.5, maxWidth: 380 }}>
                Managing {TOTAL_FELLOWS} active fellows across {COUNTRIES.length} nations with data-driven transparency and Global impact.
              </p>
            </div>
          </div>
          <style>{`
            @keyframes heroZoom {
              from { transform: scale(1); }
              to { transform: scale(1.1); }
            }
          `}</style>
        </section>

        {/* ── Row 1: KPI stats (5 cards) ──────────────────── */}
        <section
          className="anim-stagger"
          style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}
        >
          <KPIStat
            icon={<IconUsers size={20} />}
            label="Active Fellows"
            value={TOTAL_FELLOWS}
            sub={`${COUNTRIES.length} countries`}
            accent="#3B8BEB"
          />
          <KPIStat
            icon={<IconBuildingCommunity size={20} />}
            label="Alumni Network"
            value={TOTAL_ALUMNI}
            sub="All cohorts"
            accent="#9B59B6"
          />
          <KPIStat
            icon={<IconTrendingUp size={20} />}
            label="Placement Rate"
            value={`${Math.round((TOTAL_PLACED / TOTAL_FELLOWS) * 100)}%`}
            sub={`${TOTAL_PLACED} placed`}
            accent="#2EC27E"
          />
          <KPIStat
            icon={<IconSchool size={20} />}
            label="Institutions"
            value={TOTAL_INST}
            sub="Partner orgs"
            accent="#E8A020"
          />
          <KPIStat
            icon={<IconCalendarStats size={20} />}
            label="Avg Check-in"
            value={`${AVG_CHECKIN}%`}
            sub="Compliance rate"
            accent={AVG_CHECKIN >= 85 ? "#2EC27E" : "#E8A020"}
          />
        </section>

        {/* ── Row 2: Map + Country list ───────────────────── */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
          <MapCard />

          {/* Country breakdown table */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                  Country Programs
                </div>
                <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                  Click a country for detailed breakdown
                </div>
              </div>
              <button
                className="epl-btn"
                style={{ padding: "5px 12px", fontSize: 10 }}
                onClick={() => router.push("/dashboard/countries")}
              >
                View All <IconChevronRight size={12} />
              </button>
            </div>

            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.8fr 1fr 1fr 1fr 0.8fr 40px",
              gap: 8,
              padding: "0 18px",
              fontSize: 9,
              color: "rgba(255,255,255,0.30)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontFamily: "var(--font)",
            }}>
              <span>Country</span>
              <span>Fellows</span>
              <span>Placement</span>
              <span>Check-in</span>
              <span>Trend</span>
              <span></span>
            </div>

            {/* Country rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {COUNTRIES.map((c) => (
                <CountryRow
                  key={c.id}
                  country={c}
                  onClick={() => router.push(`/dashboard/countries/${c.id}`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Row 3: Activity feed + Upcoming events ──────── */}
        <section style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>

          {/* Activity feed */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                Recent Activity
              </div>
              <span style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                Across all countries
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {RECENT_ACTIVITY.map((a) => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: a.color,
                    boxShadow: `0 0 8px ${a.color}50`,
                    marginTop: 5, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.4 }}>
                      {a.text}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>
                      {a.time}
                    </div>
                  </div>
                  {a.type === "alert" && <IconAlertTriangle size={14} style={{ color: "#E05C5C", marginTop: 2, flexShrink: 0 }} />}
                  {a.type === "checkin" && <IconCircleCheck size={14} style={{ color: "#2EC27E", marginTop: 2, flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming events + cohort progress  */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Events */}
            <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                  Upcoming Events
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--rf)",
                  background: "rgba(59,139,235,0.12)", color: "#3B8BEB", fontFamily: "var(--font)",
                  border: "1px solid rgba(59,139,235,0.25)",
                }}>
                  {UPCOMING_EVENTS.length}
                </span>
              </div>

              {UPCOMING_EVENTS.map((e) => (
                <div key={e.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div style={{
                    width: 40, textAlign: "center",
                    padding: "6px 0",
                    borderRadius: 6,
                    background: `${e.color}14`,
                    border: `1px solid ${e.color}30`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: e.color, fontFamily: "var(--font)", lineHeight: 1 }}>
                      {e.date.split(" ")[1]}
                    </div>
                    <div style={{ fontSize: 8, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase" }}>
                      {e.date.split(" ")[0]}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                      {e.title}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                      {e.country}
                    </div>
                  </div>
                  <IconCalendarEvent size={14} style={{ color: "rgba(255,255,255,0.20)" }} />
                </div>
              ))}
            </div>

            {/* Program health mini-card */}
            <div className="gc" style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 14 }}>
                Program Health
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "On Track",  count: 10, total: 13, color: "#2EC27E", icon: <IconCircleCheck size={14} /> },
                  { label: "Needs Attention", count: 2, total: 13, color: "#E8A020", icon: <IconClock size={14} /> },
                  { label: "At Risk",   count: 1, total: 13, color: "#E05C5C", icon: <IconAlertTriangle size={14} /> },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ color: s.color, display: "flex" }}>{s.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4,
                      }}>
                        <span style={{ fontSize: 11, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                          {s.label}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: s.color, fontFamily: "var(--font)" }}>
                          {s.count}/{s.total}
                        </span>
                      </div>
                      <div style={{
                        width: "100%", height: 4, borderRadius: 2,
                        background: "rgba(255,255,255,0.06)",
                      }}>
                        <div style={{
                          width: `${Math.round((s.count / s.total) * 100)}%`, height: "100%",
                          borderRadius: 2, background: s.color,
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
