"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId, type CountryData } from "@/lib/mock-data";
import { trpc } from "@/utils/trpc";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";
import {
  IconUsers,
  IconSchool,
  IconBuildingCommunity,
  IconArrowUpRight,
  IconArrowDownRight,
  IconCalendarEvent,
  IconFileText,
  IconGlobe,
} from "@tabler/icons-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type HubView = {
  id: string;
  name: string;
  color: string;
  flagSrc: string;
  fellows: number;
  alumniLeaders: number;
  totalNetwork: number;
  institutions: number;
  activePrograms: number;
  placed: number;
  totalFellows: number;
  checkInRate: number | null;
  trend: number | null;
  upcomingEventsCount: number;
  cohortCount: number;
  representatives: number;
  cohorts: { year: string; fellows: number; placed: number; graduated: number; inProgress?: boolean }[];
  projects: { name: string; status: "active" | "completed" | "planning"; fellows: number; startDate: string }[];
  recentUpdates: { text: string; time: string; type: string }[];
  events: { title: string; date: string; id: string }[];
  isEmpty: boolean;
};

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  return formatEventDate(iso);
}

function mapProgramStatus(status: string): "active" | "completed" | "planning" {
  if (status === "completed") return "completed";
  if (status === "planned") return "planning";
  return "active";
}
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

function Sk({ w, h = 14, r = 8 }: { w: string | number; h?: number; r?: number }) {
  return (
    <div
      className="co-skel"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        flexShrink: 0,
      }}
    />
  );
}

function CountryOverviewSkeleton({ accent = "#4150A3" }: { accent?: string }) {
  return (
    <div className="co-dash" aria-busy="true" aria-label="Loading country overview">
      <section style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
          border: `2px solid ${accent}30`, flexShrink: 0,
        }}>
          <Sk w="100%" h={48} r={24} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Sk w={180} h={22} />
          <Sk w={260} h={12} />
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="gc" style={{ padding: "16px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <Sk w={38} h={38} r={10} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <Sk w={48} h={18} />
              <Sk w={90} h={10} />
            </div>
          </div>
        ))}
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="gc" style={{ padding: "16px 18px", display: "flex", gap: 12, alignItems: "center" }}>
            <Sk w={38} h={38} r={10} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <Sk w={40} h={18} />
              <Sk w={80} h={10} />
            </div>
          </div>
        ))}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="gc" style={{ padding: 20, height: 280, display: "flex", flexDirection: "column", gap: 14 }}>
          <Sk w={200} h={14} />
          <Sk w="100%" h={200} r={12} />
        </div>
        <div className="gc" style={{ padding: 20, height: 280, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <Sk w={160} h={14} />
          <Sk w={160} h={160} r={999} />
          <div style={{ display: "flex", gap: 10 }}>
            <Sk w={70} h={10} />
            <Sk w={70} h={10} />
            <Sk w={70} h={10} />
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="gc" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <Sk w={140} h={14} />
          {[0, 1, 2, 3].map((i) => <Sk key={i} w="100%" h={42} r={8} />)}
        </div>
        <div className="gc" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <Sk w={100} h={14} />
          {[0, 1, 2].map((i) => <Sk key={i} w="100%" h={52} r={10} />)}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="gc" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
            <Sk w={120} h={14} />
            <Sk w="100%" h={12} />
            <Sk w="92%" h={12} />
            <Sk w="85%" h={12} />
            <Sk w="100%" h={48} r={8} />
          </div>
        ))}
      </section>
    </div>
  );
}

function EmptyPanel({ title, message }: { title: string; message: string }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 6, padding: "28px 16px", textAlign: "center",
      border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12,
      background: "rgba(255,255,255,0.02)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 260, lineHeight: 1.45 }}>{message}</div>
    </div>
  );
}

function CountryDashboard({ hub }: { hub: HubView }) {
  const cohortData = [...hub.cohorts].reverse().map((c) => ({
    name: c.year.toString(),
    Fellows: c.fellows,
    Retained: c.placed,
  }));
  const pieData = hub.projects.filter((p) => p.fellows > 0).map((p) => ({ name: p.name, value: p.fellows }));
  const COLORS = [hub.color, "#3B8BEB", "#2EC27E", "#E8A020", "#9B59B6"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="gc" style={{ padding: "10px 14px", border: "1px solid var(--eborder)", borderRadius: 8, zIndex: 99 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: "bold", color: "var(--ewhite)" }}>{label || payload[0].name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: 0, fontSize: 11, color: entry.fill, marginTop: 4 }}>
              {entry.name}: <span style={{ fontWeight: "bold" }}>{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="co-dash">
      <section style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          className="rm-cp-flag"
          style={{
            width: 48,
            height: 32,
            borderRadius: 8,
            border: `2px solid ${hub.color}40`,
            boxShadow: `0 0 16px ${hub.color}30`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hub.flagSrc} alt="" />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: "var(--ewhite)",
            fontFamily: "var(--font)", letterSpacing: "-0.02em",
          }}>
            {hub.name}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginTop: 4,
            fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", flexWrap: "wrap",
          }}>
            <span>{hub.activePrograms} Active Programs</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>{hub.cohortCount} Cohorts</span>
            {hub.trend != null && (
              <>
                <span style={{ opacity: 0.3 }}>·</span>
                <TrendBadge value={hub.trend} />
              </>
            )}
            {hub.isEmpty && (
              <span className="rm-pill" style={{ marginLeft: 4 }}>
                <i style={{ background: hub.color }} />
                Awaiting data
              </span>
            )}
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatBox label="Active Fellows" value={hub.fellows} accent={hub.color} icon={<IconUsers size={18} />} />
        <StatBox label="Alumni" value={hub.alumniLeaders} accent="#9B59B6" icon={<IconBuildingCommunity size={18} />} />
        <StatBox label="Total Network" value={hub.totalNetwork} accent="#2EC27E" icon={<IconGlobe size={18} />} />
        <StatBox label="Institutions" value={hub.institutions} accent="#E8A020" icon={<IconSchool size={18} />} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, height: 280 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Fellows & Retention by Cohort
          </div>
          {cohortData.length === 0 ? (
            <EmptyPanel title="No cohort data yet" message="Cohort bars will appear when fellows and retention data are entered." />
          ) : (
            <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--eborder)" }} />
                  <Bar dataKey="Fellows" fill={hub.color} radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Retained" fill="#2EC27E" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, height: 280 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Program Distribution
          </div>
          {pieData.length === 0 ? (
            <EmptyPanel title="No programs yet" message="Program share will show once programs are added for this hub." />
          ) : (
            <>
              <div style={{ flex: 1, minHeight: 0, minWidth: 0, width: "100%" }}>
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
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: -10 }}>
                {pieData.map((entry, index) => (
                  <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[index % COLORS.length] }} />
                    <span style={{ fontSize: 11, color: "var(--emuted)" }}>{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Cohort Breakdown
          </div>
          {hub.cohorts.length === 0 ? (
            <EmptyPanel title="No cohorts" message="Add cohorts to track fellows, retention, and graduation." />
          ) : (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "0 4px",
                fontSize: 9, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font)",
              }}>
                <span>Cohort</span><span>Fellows</span><span>Retained</span><span>Graduated</span>
              </div>
              {hub.cohorts.map((c) => (
                <div key={c.year} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "10px 8px",
                  background: "var(--eglass)", borderRadius: 8, border: "1px solid var(--eborder)", alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: hub.color, fontFamily: "var(--font)" }}>{c.year}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{c.fellows}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--eborder)" }}>
                      <div style={{
                        width: `${c.fellows ? Math.round((c.placed / c.fellows) * 100) : 0}%`,
                        height: "100%", borderRadius: 2, background: "#2EC27E",
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{c.placed}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font)", color: c.graduated > 0 ? "var(--ewhite)" : "var(--emuted)" }}>
                    {c.graduated > 0 ? c.graduated : "In progress"}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Programs</div>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--rf)",
              background: `${hub.color}15`, color: hub.color, fontFamily: "var(--font)", border: `1px solid ${hub.color}30`,
            }}>
              {hub.activePrograms} Active
            </span>
          </div>
          {hub.projects.length === 0 ? (
            <EmptyPanel title="No programs" message="Programs created for this country will list here." />
          ) : (
            hub.projects.map((p) => (
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
            ))
          )}
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>
        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Recent Updates</div>
          {hub.recentUpdates.length === 0 ? (
            <EmptyPanel title="No updates yet" message="Recent cohort, program, and event activity will appear here." />
          ) : (
            hub.recentUpdates.map((u, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
                borderBottom: "1px solid var(--eborder)",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                  background: u.type === "alert" ? "#E05C5C" : u.type === "event" ? "#9B59B6" : hub.color,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.4 }}>{u.text}</div>
                  <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>{u.time}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Upcoming Events</div>
          {hub.events.length === 0 ? (
            <EmptyPanel title="No events" message="Scheduled country events will appear here." />
          ) : (
            hub.events.map((e) => (
              <Link
                key={e.id}
                href={`/dashboard/countries/${hub.id}/events` as never}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "var(--eglass)",
                  borderRadius: 8,
                  border: "1px solid var(--eborder)",
                  textDecoration: "none",
                }}
              >
                <IconCalendarEvent size={16} style={{ color: hub.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{e.title}</div>
                  <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>{e.date}</div>
                </div>
              </Link>
            ))
          )}
          <div style={{
            marginTop: "auto", padding: 12, borderRadius: 8,
            background: `${hub.color}08`, border: `1px solid ${hub.color}18`,
            display: "flex", justifyContent: "space-around",
          }}>
            <div style={{ textAlign: "center" }}>
              <IconCalendarEvent size={14} style={{ color: hub.color }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{hub.upcomingEventsCount}</div>
              <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Events</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <IconFileText size={14} style={{ color: hub.color }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{hub.cohortCount}</div>
              <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Cohorts</div>
            </div>
          </div>
        </div>

        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Alumni Leaders</div>
            <span style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>{hub.totalNetwork} in network</span>
          </div>
          {hub.alumniLeaders === 0 ? (
            <EmptyPanel title="No featured leaders" message="Add alumni leaders from the Alumni Leaders page." />
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 12, color: "var(--emuted)", lineHeight: 1.5, fontFamily: "var(--font)" }}>
                {hub.alumniLeaders} featured leader{hub.alumniLeaders === 1 ? "" : "s"}
                {hub.representatives > 0 ? ` · ${hub.representatives} representative${hub.representatives === 1 ? "" : "s"}` : ""}.
              </p>
              <Link href={`/dashboard/countries/${hub.id}/alumni` as never} className="rm-ghost" style={{ alignSelf: "flex-start", fontSize: 12 }}>
                View alumni leaders →
              </Link>
            </>
          )}
        </div>      </section>
    </div>
  );
}

function fromMock(country: CountryData, id: string): HubView {
  return {
    id,
    name: country.name,
    color: country.color,
    flagSrc: flagImageUrl(id, 80),
    fellows: country.fellows,
    alumniLeaders: country.alumni,
    totalNetwork: country.fellows + country.alumni,
    institutions: country.institutions,
    activePrograms: country.activePrograms,
    placed: country.placed,
    totalFellows: country.fellows,
    checkInRate: country.checkInRate,
    trend: country.trend,
    upcomingEventsCount: country.events.length,
    cohortCount: country.cohorts.length,
    representatives: 0,
    cohorts: country.cohorts,
    projects: country.projects,
    recentUpdates: country.recentUpdates,
    events: country.events.map((e, i) => ({ ...e, id: String(i) })),
    isEmpty: false,
  };
}
function emptyFromLive(live: {
  id: string;
  name: string;
  color: string;
  countryCode: string;
  iso2?: string;
  flag?: string;
}): HubView {
  const iso2 = resolveIso2({
    countryCode: live.countryCode,
    iso2: live.iso2,
    flag: live.flag,
  });
  return {
    id: live.id,
    name: live.name,
    color: live.color,
    flagSrc: iso2 ? flagImageUrl(iso2, 80) : "",
    fellows: 0,
    alumniLeaders: 0,
    totalNetwork: 0,
    institutions: 0,
    activePrograms: 0,
    placed: 0,
    totalFellows: 0,
    checkInRate: null,
    trend: null,
    upcomingEventsCount: 0,
    cohortCount: 0,
    representatives: 0,
    cohorts: [],
    projects: [],
    recentUpdates: [],
    events: [],
    isEmpty: true,
  };
}

function buildLiveHub(
  live: {
    id: string;
    name: string;
    color: string;
    countryCode: string;
    iso2?: string;
    flag?: string;
  },
  data: {
    fellows?: { activeFellows: number; alumniLeaders: number; totalNetwork: number };
    cohorts?: { items: Array<{ label: string; cohortYear: number | null; totalFellows: number; placed: number; alumniFellows: number; inProgress: boolean }> };
    cohortsAgg?: { cohortCount: number; totalFellows: number; totalPlaced: number };
    programs?: { items: Array<{ title: string; status: string; totalFellows: number; startYear: number | null }> };
    programsAgg?: { activePrograms: number };
    partners?: { activePartners: number };
    checkIns?: { complianceRate: number; activeFellows: number };
    events?: { items: Array<{ id: string; title: string; startsAt: string }> };
    eventsAgg?: { upcoming: number };
    alumniLeaders?: { activeLeaders: number; representatives: number };
  },
): HubView {
  const base = emptyFromLive(live);
  const cohortItems = data.cohorts?.items ?? [];
  const programItems = data.programs?.items ?? [];
  const upcomingEvents = (data.events?.items ?? []).slice(0, 5);

  const cohorts = cohortItems.map((c) => ({
    year: c.label || (c.cohortYear != null ? String(c.cohortYear) : "—"),
    fellows: c.totalFellows,
    placed: c.placed,
    graduated: c.inProgress ? 0 : c.alumniFellows,
    inProgress: c.inProgress,
  }));

  const projects = programItems.map((p) => ({
    name: p.title,
    status: mapProgramStatus(p.status),
    fellows: p.totalFellows,
    startDate: p.startYear != null ? String(p.startYear) : "—",
  }));

  const recentUpdates: HubView["recentUpdates"] = [];
  for (const event of upcomingEvents.slice(0, 2)) {
    recentUpdates.push({
      text: `Upcoming event: ${event.title}`,
      time: formatRelativeDate(event.startsAt),
      type: "event",
    });
  }
  for (const cohort of cohortItems.filter((c) => c.inProgress).slice(0, 2)) {
    recentUpdates.push({
      text: `${cohort.label} is in progress`,
      time: "Cohort",
      type: "cohort",
    });
  }
  for (const program of programItems.filter((p) => p.status === "active").slice(0, 1)) {
    recentUpdates.push({
      text: `${program.title} program active`,
      time: "Program",
      type: "program",
    });
  }

  const fellows = data.fellows?.activeFellows ?? 0;
  // Network alumni count from fellows roster (status = alumni), not featured leaders.
  const alumni = data.fellows?.alumniLeaders ?? 0;
  const totalNetwork = fellows + alumni;
  const totalFellows = data.cohortsAgg?.totalFellows ?? 0;
  const placed = data.cohortsAgg?.totalPlaced ?? 0;

  return {
    ...base,
    fellows,
    alumniLeaders: alumni,
    totalNetwork,
    institutions: data.partners?.activePartners ?? 0,
    activePrograms: data.programsAgg?.activePrograms ?? programItems.filter((p) => p.status === "active").length,
    placed,
    totalFellows,
    checkInRate:
      data.checkIns && data.checkIns.activeFellows > 0 ? data.checkIns.complianceRate : null,
    upcomingEventsCount: data.eventsAgg?.upcoming ?? upcomingEvents.length,
    cohortCount: data.cohortsAgg?.cohortCount ?? cohortItems.length,
    representatives: data.alumniLeaders?.representatives ?? 0,
    cohorts,
    projects,
    recentUpdates,
    events: upcomingEvents.map((e) => ({ id: e.id, title: e.title, date: formatEventDate(e.startsAt) })),
    isEmpty: fellows + alumni + cohortItems.length + programItems.length === 0,
  };
}
export default function CountryOverviewPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const mock = COUNTRIES_MAP[id as CountryId];

  const liveQuery = useQuery({
    ...trpc.tenants.get.queryOptions({ id }),
    enabled: Boolean(id) && !mock,
    retry: false,
  });

  const tenantId = liveQuery.data?.id ?? "";
  const queryEnabled = Boolean(tenantId) && !mock;

  const fellowsQuery = useQuery({
    ...trpc.fellows.aggregates.queryOptions({ tenantId }),
    enabled: queryEnabled,
  });
  const cohortsQuery = useQuery({
    ...trpc.cohorts.list.queryOptions({ tenantId }),
    enabled: queryEnabled,
  });
  const cohortsAggQuery = useQuery({
    ...trpc.cohorts.aggregates.queryOptions({ tenantId }),
    enabled: queryEnabled,
  });
  const programsQuery = useQuery({
    ...trpc.programs.list.queryOptions({ tenantId }),
    enabled: queryEnabled,
  });
  const programsAggQuery = useQuery({
    ...trpc.programs.aggregates.queryOptions({ tenantId }),
    enabled: queryEnabled,
  });
  const partnersQuery = useQuery({
    ...trpc.partners.aggregates.queryOptions({ tenantId, kind: "placement" }),
    enabled: queryEnabled,
  });
  const eventsQuery = useQuery({
    ...trpc.events.list.queryOptions({ tenantId, timeframe: "upcoming" }),
    enabled: queryEnabled,
  });
  const eventsAggQuery = useQuery({
    ...trpc.events.aggregates.queryOptions({ tenantId }),
    enabled: queryEnabled,
  });
  const alumniLeadersQuery = useQuery({
    ...trpc.alumniLeaders.aggregates.queryOptions({ tenantId }),
    enabled: queryEnabled,
  });

  const liveLoading =
    queryEnabled &&
    (fellowsQuery.isLoading ||
      cohortsQuery.isLoading ||
      programsQuery.isLoading ||
      partnersQuery.isLoading ||
      eventsQuery.isLoading ||
      alumniLeadersQuery.isLoading);

  const hub: HubView | null = useMemo(() => {
    if (mock) return fromMock(mock, id);
    if (!liveQuery.data) return null;
    return buildLiveHub(liveQuery.data, {
      fellows: fellowsQuery.data,
      cohorts: cohortsQuery.data,
      cohortsAgg: cohortsAggQuery.data,
      programs: programsQuery.data,
      programsAgg: programsAggQuery.data,
      partners: partnersQuery.data,
      events: eventsQuery.data,
      eventsAgg: eventsAggQuery.data,
      alumniLeaders: alumniLeadersQuery.data,
    });
  }, [
    mock,
    id,
    liveQuery.data,
    fellowsQuery.data,
    cohortsQuery.data,
    cohortsAggQuery.data,
    programsQuery.data,
    programsAggQuery.data,
    partnersQuery.data,
    eventsQuery.data,
    eventsAggQuery.data,
    alumniLeadersQuery.data,
  ]);

  return (
    <CountryLayout activePage="overview" pageTitle="Overview">
      {!mock && (liveQuery.isLoading || liveLoading) && <CountryOverviewSkeleton accent={liveQuery.data?.color} />}
      {!mock && liveQuery.isError && (
        <div className="rm-state rm-state-error">
          Could not open this country hub: {liveQuery.error.message}
        </div>
      )}
      {hub && !( !mock && (liveQuery.isLoading || liveLoading) ) && <CountryDashboard hub={hub} />}
    </CountryLayout>
  );
}