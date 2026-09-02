"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import {
  IconUsers,
  IconTrendingUp,
  IconSchool,
  IconBuildingCommunity,
  IconArrowUpRight,
  IconArrowDownRight,
  IconChevronRight,
  IconCalendarEvent,
  IconCircleCheck,
  IconClock,
  IconAlertTriangle,
  IconArrowLeft,
  IconPhoto,
  IconFileText,
} from "@tabler/icons-react";

/* ── Country data (same shape as overview — would come from API) */
const COUNTRIES_DB: Record<string, {
  name: string; flag: string; color: string;
  fellows: number; alumni: number; institutions: number;
  activePrograms: number; placed: number; checkInRate: number;
  trend: number; mediaItems: number;
  cohorts: { year: number; fellows: number; placed: number; graduated: number }[];
  projects: { name: string; status: "active" | "completed" | "planning"; fellows: number; startDate: string }[];
  recentUpdates: { text: string; time: string; type: "checkin" | "fellow" | "event" | "alert" }[];
  events: { title: string; date: string }[];
  alumniHighlights: { name: string; role: string; cohort: number }[];
}> = {
  gh: {
    name: "Ghana", flag: "🇬🇭", color: "#3B8BEB",
    fellows: 87, alumni: 142, institutions: 22, activePrograms: 4, placed: 81, checkInRate: 94, trend: 12, mediaItems: 14,
    cohorts: [
      { year: 2024, fellows: 22, placed: 18, graduated: 0 },
      { year: 2023, fellows: 20, placed: 20, graduated: 12 },
      { year: 2022, fellows: 18, placed: 18, graduated: 18 },
      { year: 2021, fellows: 15, placed: 14, graduated: 15 },
      { year: 2020, fellows: 12, placed: 11, graduated: 12 },
    ],
    projects: [
      { name: "Youth Policy Lab", status: "active", fellows: 22, startDate: "Jan 2024" },
      { name: "STEM Bridge Program", status: "active", fellows: 18, startDate: "Mar 2023" },
      { name: "Climate Resilience Fellowship", status: "active", fellows: 28, startDate: "Jun 2022" },
      { name: "EdTech Pilot", status: "planning", fellows: 0, startDate: "Upcoming" },
    ],
    recentUpdates: [
      { text: "Q1 2026 check-in report submitted on time", time: "2h ago", type: "checkin" },
      { text: "4 new fellows confirmed for Youth Policy Lab", time: "1d ago", type: "fellow" },
      { text: "Alumni summit date finalized — April 12, Accra", time: "2d ago", type: "event" },
      { text: "STEM Bridge mid-term evaluation complete", time: "4d ago", type: "checkin" },
    ],
    events: [
      { title: "Ghana Alumni Summit 2026", date: "Apr 12, 2026" },
      { title: "Cohort 2024 Orientation", date: "Apr 28, 2026" },
      { title: "Youth Policy Lab Demo Day", date: "May 10, 2026" },
    ],
    alumniHighlights: [
      { name: "Ama Serwah", role: "Founder, GreenGhana Initiative", cohort: 2020 },
      { name: "Kofi Mensah", role: "Policy Advisor, Min. of Education", cohort: 2021 },
      { name: "Abena Osei-Bonsu", role: "CEO, TechBridge Accra", cohort: 2022 },
    ],
  },
  ke: {
    name: "Kenya", flag: "🇰🇪", color: "#9B59B6",
    fellows: 18, alumni: 44, institutions: 5, activePrograms: 2, placed: 16, checkInRate: 88, trend: 6, mediaItems: 7,
    cohorts: [
      { year: 2024, fellows: 8, placed: 6, graduated: 0 },
      { year: 2023, fellows: 6, placed: 6, graduated: 4 },
      { year: 2022, fellows: 4, placed: 4, graduated: 4 },
    ],
    projects: [
      { name: "Nairobi Health Initiative", status: "active", fellows: 10, startDate: "Feb 2023" },
      { name: "AgriTech Fellows", status: "active", fellows: 8, startDate: "Sep 2024" },
    ],
    recentUpdates: [
      { text: "12 new fellows onboarded for AgriTech program", time: "5h ago", type: "fellow" },
      { text: "Bi-weekly progress update received", time: "3d ago", type: "checkin" },
    ],
    events: [
      { title: "Kenya EdTech Demo Day", date: "May 02, 2026" },
    ],
    alumniHighlights: [
      { name: "Wanjiku Kamau", role: "Health Director, Nairobi County", cohort: 2022 },
      { name: "James Otieno", role: "CTO, FarmConnect", cohort: 2023 },
    ],
  },
  lr: {
    name: "Liberia", flag: "🇱🇷", color: "#E05C5C",
    fellows: 42, alumni: 68, institutions: 10, activePrograms: 3, placed: 36, checkInRate: 79, trend: -3, mediaItems: 5,
    cohorts: [
      { year: 2023, fellows: 14, placed: 12, graduated: 0 },
      { year: 2022, fellows: 12, placed: 10, graduated: 8 },
      { year: 2021, fellows: 10, placed: 9, graduated: 10 },
      { year: 2020, fellows: 6, placed: 5, graduated: 6 },
    ],
    projects: [
      { name: "Governance Fellows", status: "active", fellows: 14, startDate: "Jan 2023" },
      { name: "Women in STEM", status: "active", fellows: 16, startDate: "Jun 2021" },
      { name: "Rural Health Network", status: "active", fellows: 12, startDate: "Mar 2022" },
    ],
    recentUpdates: [
      { text: "3 institutions still pending check-in — overdue", time: "1d ago", type: "alert" },
      { text: "Women in STEM cohort 2023 retention complete", time: "3d ago", type: "checkin" },
    ],
    events: [
      { title: "Governance Fellows Workshop", date: "Apr 18, 2026" },
      { title: "Liberia Annual Review", date: "Jun 01, 2026" },
    ],
    alumniHighlights: [
      { name: "Mary Kollie", role: "Director, WomenLead Liberia", cohort: 2020 },
      { name: "Samuel Gaye", role: "Health Policy, WHO Liberia", cohort: 2021 },
    ],
  },
  mw: {
    name: "Malawi", flag: "🇲🇼", color: "#E8A020",
    fellows: 35, alumni: 51, institutions: 9, activePrograms: 2, placed: 30, checkInRate: 82, trend: 4, mediaItems: 3,
    cohorts: [
      { year: 2023, fellows: 14, placed: 12, graduated: 0 },
      { year: 2022, fellows: 12, placed: 10, graduated: 8 },
      { year: 2021, fellows: 9, placed: 8, graduated: 9 },
    ],
    projects: [
      { name: "Teacher Training Fellowship", status: "active", fellows: 20, startDate: "Sep 2021" },
      { name: "Water & Sanitation", status: "active", fellows: 15, startDate: "Jan 2023" },
    ],
    recentUpdates: [
      { text: "Teacher Training cohort 2023 completed retention", time: "2d ago", type: "checkin" },
      { text: "Water & Sanitation mid-term review scheduled", time: "5d ago", type: "event" },
    ],
    events: [
      { title: "Mid-term Review", date: "Apr 25, 2026" },
    ],
    alumniHighlights: [
      { name: "Grace Banda", role: "Education Consultant, UNICEF", cohort: 2021 },
      { name: "Chimwemwe Phiri", role: "WASH Coordinator, Lilongwe", cohort: 2022 },
    ],
  },
  sl: {
    name: "Sierra Leone", flag: "🇸🇱", color: "#2EC27E",
    fellows: 28, alumni: 39, institutions: 7, activePrograms: 2, placed: 26, checkInRate: 91, trend: 8, mediaItems: 6,
    cohorts: [
      { year: 2024, fellows: 10, placed: 8, graduated: 0 },
      { year: 2023, fellows: 10, placed: 10, graduated: 6 },
      { year: 2022, fellows: 8, placed: 8, graduated: 8 },
    ],
    projects: [
      { name: "Education Access Network", status: "active", fellows: 16, startDate: "Mar 2022" },
      { name: "Public Health Fellowship", status: "active", fellows: 12, startDate: "Jan 2024" },
    ],
    recentUpdates: [
      { text: "Alumni meetup scheduled for April 15", time: "1d ago", type: "event" },
      { text: "Check-in review session complete", time: "4d ago", type: "checkin" },
    ],
    events: [
      { title: "SL Fellows Check-in Review", date: "Apr 15, 2026" },
      { title: "Education Access Showcase", date: "May 20, 2026" },
    ],
    alumniHighlights: [
      { name: "Aminata Kamara", role: "Founder, EduReach Sierra Leone", cohort: 2022 },
      { name: "Ibrahim Sesay", role: "Public Health Lead, Freetown", cohort: 2023 },
    ],
  },
};

/* ── Small helpers ──────────────────────────────────────── */
function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 11, fontWeight: 700, fontFamily: "var(--font)",
      color: up ? "#2EC27E" : "#E05C5C",
      background: up ? "rgba(46,194,126,0.12)" : "rgba(224,92,92,0.12)",
      border: `1px solid ${up ? "rgba(46,194,126,0.30)" : "rgba(224,92,92,0.30)"}`,
      padding: "3px 10px", borderRadius: "var(--rf)",
    }}>
      {up ? <IconArrowUpRight size={12} /> : <IconArrowDownRight size={12} />}
      {up ? "+" : ""}{value} this quarter
    </span>
  );
}

function StatBox({ label, value, accent, icon }: {
  label: string; value: string | number; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className="gc" style={{
      padding: "16px 18px", display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: accent,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "active" | "completed" | "planning" }) {
  const c = status === "active" ? "#2EC27E" : status === "completed" ? "#3B8BEB" : "rgba(255,255,255,0.35)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 600, color: c, fontFamily: "var(--font)",
      textTransform: "capitalize",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}50` }} />
      {status}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   COUNTRY DETAIL PAGE
   ═══════════════════════════════════════════════════════════ */
export default function CountryDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending) return null;
  if (!session?.user) return null;

  const country = COUNTRIES_DB[id];
  if (!country) {
    return (
      <AppShell activePage="countries" pageTitle="Country Not Found">
        <div style={{ padding: 40, textAlign: "center", color: "var(--emuted)" }}>
          Country not found. <button onClick={() => router.push("/dashboard")} style={{ color: "#3B8BEB", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Back to Overview</button>
        </div>
      </AppShell>
    );
  }

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };
  const placementRate = Math.round((country.placed / country.fellows) * 100);

  return (
    <AppShell
      activePage="countries"
      pageTitle={country.name}
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Countries", href: "/dashboard/countries" }, { label: country.name }]}
      user={user}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

        {/* ── Back button + Country header ──────────────── */}
        <section>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              color: "var(--emuted)", fontSize: 12, fontFamily: "var(--font)",
              marginBottom: 12, padding: 0,
            }}
          >
            <IconArrowLeft size={14} /> Back to Overview
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
            <span style={{ fontSize: 40 }}>{country.flag}</span>
            <div>
              <div style={{
                fontSize: 26, fontWeight: 700, color: "var(--ewhite)",
                fontFamily: "var(--font)", letterSpacing: "-0.02em",
              }}>
                {country.name}
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 4,
              }}>
                <span>{country.activePrograms} Active Programs</span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>{country.cohorts.length} Cohorts</span>
                <span style={{ opacity: 0.3 }}>·</span>
                <TrendBadge value={country.trend} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Row 1: stat boxes ────────────────────────── */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatBox label="Active Fellows" value={country.fellows} accent={country.color} icon={<IconUsers size={18} />} />
          <StatBox label="Alumni" value={country.alumni} accent="#9B59B6" icon={<IconBuildingCommunity size={18} />} />
          <StatBox label="Retention Rate" value={`${placementRate}%`} accent="#2EC27E" icon={<IconTrendingUp size={18} />} />
          <StatBox label="Institutions" value={country.institutions} accent="#E8A020" icon={<IconSchool size={18} />} />
        </section>

        {/* ── Row 2: Cohort table + Programs ──────────── */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Cohort breakdown */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              Cohort Breakdown
            </div>

            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 8, padding: "0 4px",
              fontSize: 9, color: "rgba(255,255,255,0.30)",
              textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font)",
            }}>
              <span>Cohort</span>
              <span>Fellows</span>
              <span>Retained</span>
              <span>Graduated</span>
            </div>

            {/* Rows */}
            {country.cohorts.map((c) => (
              <div key={c.year} style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 8, padding: "10px 8px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)",
                alignItems: "center",
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: country.color, fontFamily: "var(--font)",
                }}>
                  {c.year}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                  {c.fellows}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 40, height: 4, borderRadius: 2,
                    background: "rgba(255,255,255,0.08)",
                  }}>
                    <div style={{
                      width: `${Math.round((c.placed / c.fellows) * 100)}%`, height: "100%",
                      borderRadius: 2, background: "#2EC27E",
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                    {c.placed}
                  </span>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 500, fontFamily: "var(--font)",
                  color: c.graduated > 0 ? "var(--ewhite)" : "rgba(255,255,255,0.25)",
                }}>
                  {c.graduated > 0 ? c.graduated : "In progress"}
                </span>
              </div>
            ))}
          </div>

          {/* Active Programs */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                Programs
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--rf)",
                background: `${country.color}15`, color: country.color, fontFamily: "var(--font)",
                border: `1px solid ${country.color}30`,
              }}>
                {country.activePrograms} Active
              </span>
            </div>

            {country.projects.map((p) => (
              <div key={p.name} style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                    {p.name}
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 3,
                  }}>
                    <span>{p.fellows > 0 ? `${p.fellows} fellows` : "TBC"}</span>
                    <span style={{ opacity: 0.3 }}>·</span>
                    <span>Started {p.startDate}</span>
                  </div>
                </div>
                <StatusDot status={p.status} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Row 3: Recent updates + Events + Alumni ─── */}
        <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>

          {/* Updates */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              Recent Updates
            </div>
            {country.recentUpdates.map((u, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                  background: u.type === "alert" ? "#E05C5C" : u.type === "event" ? "#9B59B6" : country.color,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.4 }}>
                    {u.text}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>
                    {u.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Upcoming events */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              Upcoming Events
            </div>
            {country.events.map((e, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <IconCalendarEvent size={16} style={{ color: country.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                    {e.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                    {e.date}
                  </div>
                </div>
              </div>
            ))}

            {/* Quick stats */}
            <div style={{
              marginTop: 8, padding: "12px", borderRadius: 8,
              background: `${country.color}08`, border: `1px solid ${country.color}18`,
              display: "flex", justifyContent: "space-around",
            }}>
              <div style={{ textAlign: "center" }}>
                <IconPhoto size={14} style={{ color: country.color }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                  {country.mediaItems}
                </div>
                <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Media</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <IconFileText size={14} style={{ color: country.color }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                  {country.cohorts.length}
                </div>
                <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Reports</div>
              </div>
            </div>
          </div>

          {/* Alumni highlights */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                Alumni Highlights
              </div>
              <span style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                {country.alumni} total
              </span>
            </div>

            {country.alumniHighlights.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: `${country.color}20`, border: `1px solid ${country.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600, color: country.color, fontFamily: "var(--font)",
                  flexShrink: 0,
                }}>
                  {a.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                    {a.role}
                  </div>
                </div>
                <span style={{
                  fontSize: 9, padding: "2px 6px", borderRadius: 4,
                  background: "rgba(255,255,255,0.05)", color: "var(--emuted)", fontFamily: "var(--font)",
                }}>
                  {a.cohort}
                </span>
              </div>
            ))}

            <button
              className="epl-btn"
              style={{ width: "100%", justifyContent: "center", padding: "8px", fontSize: 11, marginTop: 4 }}
              onClick={() => router.push("/dashboard/alumni")}
            >
              View Full Alumni Network <IconChevronRight size={12} />
            </button>
          </div>
        </section>

      </div>
    </AppShell>
  );
}
