"use client";

import { useParams } from "next/navigation";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import {
  IconUsers,
  IconTrendingUp,
  IconSchool,
  IconCalendarCheck,
  IconBuildingCommunity,
  IconArrowUpRight,
  IconArrowDownRight,
  IconCalendarEvent,
  IconPhoto,
  IconFileText,
  IconChevronRight,
} from "@tabler/icons-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const FLAG_MAP: Record<string, string> = {
  "gh": "https://flagcdn.com/gh.svg",
  "ke": "https://flagcdn.com/ke.svg",
  "lr": "https://flagcdn.com/lr.svg",
  "mw": "https://flagcdn.com/mw.svg",
  "sl": "https://flagcdn.com/sl.svg",
};

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
      {up ? "+" : ""}{value}% this quarter
    </span>
  );
}

function StatBox({ label, value, accent, icon }: {
  label: string; value: string | number; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className="gc" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
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
  const c = status === "active" ? "#2EC27E" : status === "completed" ? "#3B8BEB" : "var(--emuted)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 600, color: c, fontFamily: "var(--font)", textTransform: "capitalize",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}50` }} />
      {status}
    </span>
  );
}

export default function CountryOverviewPage() {
  const params = useParams();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];

  if (!country) return null;
  const placementRate = Math.round((country.placed / country.fellows) * 100);

  // Data for Charts
  const cohortData = [...country.cohorts].reverse().map(c => ({
    name: c.year.toString(),
    Fellows: c.fellows,
    Placed: c.placed
  })); 

  // Format projects data for PieChart
  const pieData = country.projects.filter(p => p.fellows > 0).map(p => ({
    name: p.name,
    value: p.fellows
  }));

  const COLORS = [country.color, '#3B8BEB', '#2EC27E', '#E8A020', '#9B59B6'];

  // Custom tooltips styling for charts compatible with light/dark
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="gc" style={{ padding: "10px 14px", border: "1px solid var(--eborder)", borderRadius: "8px", zIndex: 99 }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold", color: "var(--ewhite)" }}>{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
             <p key={index} style={{ margin: 0, fontSize: "11px", color: entry.fill, marginTop: 4 }}>
                {entry.name}: <span style={{ fontWeight: "bold" }}>{entry.value}</span>
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <CountryLayout activePage="overview" pageTitle="Overview">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Hero stats + trend */}
        <section style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
            border: `2px solid ${country.color}40`, padding: 2, background: "var(--eglass)",
            boxShadow: `0 0 16px ${country.color}30`, flexShrink: 0
          }}>
             <img src={FLAG_MAP[id] || ""} alt={`${country.name} Flag`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 22, fontWeight: 700, color: "var(--ewhite)",
              fontFamily: "var(--font)", letterSpacing: "-0.02em",
            }}>
              {country.name}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginTop: 4,
              fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)",
            }}>
              <span>{country.activePrograms} Active Programs</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>{country.cohorts.length} Cohorts</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <TrendBadge value={country.trend} />
            </div>
          </div>
        </section>

        {/* KPI Cards */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <StatBox label="Active Fellows" value={country.fellows} accent={country.color} icon={<IconUsers size={18} />} />
          <StatBox label="Alumni" value={country.alumni} accent="#9B59B6" icon={<IconBuildingCommunity size={18} />} />
          <StatBox label="Placement Rate" value={`${placementRate}%`} accent="#2EC27E" icon={<IconTrendingUp size={18} />} />
          <StatBox label="Institutions" value={country.institutions} accent="#E8A020" icon={<IconSchool size={18} />} />
          <StatBox label="Check-in Rate" value={`${country.checkInRate}%`} accent={country.checkInRate >= 90 ? "#2EC27E" : "#E8A020"} icon={<IconCalendarCheck size={18} />} />
        </section>

        {/* CHARTS SECTION */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, height: "280px" }}>
             <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
               Fellows & Placement by Cohort
             </div>
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--eborder)' }} />
                  <Bar dataKey="Fellows" fill={country.color} radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Placed" fill="#2EC27E" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
             </ResponsiveContainer>
          </div>

          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, height: "280px" }}>
             <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
               Program Distribution
             </div>
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
             </ResponsiveContainer>
             <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: "-10px" }}>
                 {pieData.map((entry, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                       <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[index % COLORS.length] }} />
                       <span style={{ fontSize: 11, color: "var(--emuted)" }}>{entry.name}</span>
                    </div>
                 ))}
             </div>
          </div>
        </section>

        {/* Cohorts + Programs */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Cohort table */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              Cohort Breakdown
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "0 4px",
              fontSize: 9, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font)",
            }}>
              <span>Cohort</span><span>Fellows</span><span>Placed</span><span>Graduated</span>
            </div>

            {country.cohorts.map((c) => (
              <div key={c.year} style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "10px 8px",
                background: "var(--eglass)", borderRadius: 8, border: "1px solid var(--eborder)", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: country.color, fontFamily: "var(--font)" }}>{c.year}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{c.fellows}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--eborder)" }}>
                    <div style={{ width: `${Math.round((c.placed / c.fellows) * 100)}%`, height: "100%", borderRadius: 2, background: "#2EC27E" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{c.placed}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font)", color: c.graduated > 0 ? "var(--ewhite)" : "var(--emuted)" }}>
                  {c.graduated > 0 ? c.graduated : "In progress"}
                </span>
              </div>
            ))}
          </div>

          {/* Programs */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Programs</div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--rf)",
                background: `${country.color}15`, color: country.color, fontFamily: "var(--font)", border: `1px solid ${country.color}30`,
              }}>
                {country.activePrograms} Active
              </span>
            </div>
            {country.projects.map((p) => (
              <div key={p.name} style={{
                padding: "12px 14px", background: "var(--eglass)", borderRadius: 10, border: "1px solid var(--eborder)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{p.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 3 }}>
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

        {/* Updates + Events + Alumni */}
        <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>
          {/* Recent updates */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Recent Updates</div>
            {country.recentUpdates.map((u, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
                borderBottom: "1px solid var(--eborder)",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                  background: u.type === "alert" ? "#E05C5C" : u.type === "event" ? "#9B59B6" : country.color,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.4 }}>{u.text}</div>
                  <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>{u.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Events */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Upcoming Events</div>
            {country.events.map((e, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                background: "var(--eglass)", borderRadius: 8, border: "1px solid var(--eborder)",
              }}>
                <IconCalendarEvent size={16} style={{ color: country.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{e.title}</div>
                  <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>{e.date}</div>
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 8, padding: 12, borderRadius: 8,
              background: `${country.color}08`, border: `1px solid ${country.color}18`,
              display: "flex", justifyContent: "space-around",
            }}>
              <div style={{ textAlign: "center" }}>
                <IconPhoto size={14} style={{ color: country.color }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{country.mediaItems}</div>
                <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Media</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <IconFileText size={14} style={{ color: country.color }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{country.cohorts.length}</div>
                <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Reports</div>
              </div>
            </div>
          </div>

          {/* Alumni highlights */}
          <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Alumni Highlights</div>
              <span style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>{country.alumni} total</span>
            </div>
            {country.alumniHighlights.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                background: "var(--eglass)", borderRadius: 8, border: "1px solid var(--eborder)",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: `${country.color}15`, border: `1px solid ${country.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600, color: country.color, fontFamily: "var(--font)", flexShrink: 0,
                }}>
                  {a.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>{a.role}</div>
                </div>
                <span style={{
                  fontSize: 9, padding: "2px 6px", borderRadius: 4,
                  background: "var(--eborder)", color: "var(--emuted)", fontFamily: "var(--font)",
                }}>{a.cohort}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CountryLayout>
  );
}
