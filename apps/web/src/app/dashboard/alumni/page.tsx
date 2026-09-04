"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  IconUsers,
  IconBriefcase,
  IconMapPins,
  IconSchool,
  IconLoader2,
} from "@tabler/icons-react";
import { AlumniLayout } from "@/components/epl/alumni-layout";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";
import { trpc } from "@/utils/trpc";

const chartTooltip = {
  background: "rgba(4,12,38,0.9)",
  backdropFilter: "blur(10px)",
  border: "1px solid var(--eborder)",
  borderRadius: 12,
  color: "var(--ewhite)",
  fontFamily: "var(--font)",
};

function Flag({
  iso2,
  countryCode,
  flag,
  color,
}: {
  iso2: string;
  countryCode: string;
  flag: string;
  color: string;
}) {
  const code = resolveIso2({ iso2, countryCode, flag });
  const src = code ? flagImageUrl(code, 80) : "";
  const fallback = (code || countryCode || "?").slice(0, 2).toUpperCase();

  return (
    <span
      className="rm-cp-flag"
      style={{
        width: 28,
        height: 20,
        borderRadius: 4,
        border: `1px solid ${color}40`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={28} height={20} />
      ) : (
        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--ewhite)" }}>{fallback}</span>
      )}
    </span>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--emuted)",
        fontSize: 13,
        textAlign: "center",
        padding: 24,
      }}
    >
      {message}
    </div>
  );
}

export default function ContinentalAlumniDashboard() {
  const query = useQuery(trpc.platform.alumniDashboard.queryOptions());
  const data = query.data;
  const totals = data?.totals;
  const maxCountry = Math.max(1, ...(data?.countries.map((c) => c.alumni) ?? [1]));

  return (
    <AlumniLayout activePage="dashboard" pageTitle="Continental Dashboard">
      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--ewhite)",
              margin: 0,
              fontFamily: "var(--font)",
            }}
          >
            Continental Alumni Network
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Alumni from every country hub and fellowship — Network rosters plus completed cohort
            counts.
          </p>
        </div>

        {query.isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading alumni across hubs…
          </div>
        )}

        {query.isError && (
          <div className="rm-state rm-state-error">
            Could not load alumni. {query.error.message}
          </div>
        )}

        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                {
                  label: "Total Alumni",
                  value: totals?.alumni ?? 0,
                  hint: `${totals?.liveAlumni ?? 0} on Network rosters`,
                  color: "#2EC27E",
                  icon: <IconUsers size={18} />,
                },
                {
                  label: "Country Networks",
                  value: totals?.countries ?? 0,
                  hint: "Hubs with alumni",
                  color: "#3B8BEB",
                  icon: <IconMapPins size={18} />,
                },
                {
                  label: "Fellowships",
                  value: totals?.fellowships ?? 0,
                  hint: "Programs with alumni",
                  color: "#E8A020",
                  icon: <IconSchool size={18} />,
                },
                {
                  label: "Alumni Leaders",
                  value: totals?.leaders ?? 0,
                  hint: "Active on the Alumni Board",
                  color: "#7F77DD",
                  icon: <IconBriefcase size={18} />,
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="gc"
                  style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${k.color}18`,
                      border: `1px solid ${k.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: k.color,
                      flexShrink: 0,
                    }}
                  >
                    {k.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "var(--ewhite)",
                        fontFamily: "var(--font)",
                        lineHeight: 1,
                      }}
                    >
                      {k.value}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--emuted)", marginTop: 3 }}>{k.label}</div>
                    <div style={{ fontSize: 10, color: "var(--emuted)", marginTop: 2 }}>{k.hint}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
              <div className="gc" style={{ padding: 20, display: "flex", flexDirection: "column", minHeight: 280 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "var(--ewhite)" }}>
                  Alumni by country
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--emuted)" }}>
                  Combined Network alumni and completed-cohort graduates.
                </p>
                {data.countries.every((c) => c.alumni === 0) ? (
                  <EmptyChart message="No alumni recorded yet. Add alumni on country Network or completed cohorts." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.countries.map((c) => (
                      <div key={c.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 48px", gap: 10, alignItems: "center" }}>
                        <Flag iso2={c.iso2} countryCode={c.countryCode} flag={c.flag} color={c.color} />
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ewhite)" }}>{c.name}</span>
                            <span style={{ fontSize: 11, color: "var(--emuted)" }}>
                              {c.liveAlumni} on roster
                            </span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.round((c.alumni / maxCountry) * 100)}%`,
                                height: "100%",
                                background: c.color,
                              }}
                            />
                          </div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ewhite)", textAlign: "right" }}>
                          {c.alumni}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="gc" style={{ padding: 20, display: "flex", flexDirection: "column", minHeight: 280 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "var(--ewhite)" }}>
                  Roster coverage
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--emuted)" }}>
                  How many alumni have an individual Network record vs. only a completed-cohort headcount.
                </p>
                {data.rosterCoverage.length === 0 ? (
                  <EmptyChart message="Coverage appears once hubs have alumni recorded on Network or completed cohorts." />
                ) : (
                  <div style={{ flex: 1, minHeight: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.rosterCoverage}
                          cx="50%"
                          cy="46%"
                          innerRadius={58}
                          outerRadius={82}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {data.rosterCoverage.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={chartTooltip} />
                        <Legend
                          verticalAlign="bottom"
                          height={32}
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, color: "var(--emuted)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="gc" style={{ padding: 20, display: "flex", flexDirection: "column", minHeight: 280 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "var(--ewhite)" }}>
                  Alumni by fellowship
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--emuted)" }}>
                  From country Network alumni lists, grouped by program.
                </p>
                {data.programs.length === 0 ? (
                  <EmptyChart message="Program mix appears when graduates are on each hub’s Network roster." />
                ) : (
                  <div style={{ flex: 1, minHeight: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.programs} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="var(--ewhite)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                        />
                        <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey="alumni" radius={[0, 6, 6, 0]} barSize={18} fill="#3B8BEB" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="gc" style={{ padding: 20, display: "flex", flexDirection: "column", minHeight: 280 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "var(--ewhite)" }}>
                  Cumulative growth
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--emuted)" }}>
                  Alumni by cohort year across all hubs.
                </p>
                {data.growth.length === 0 ? (
                  <EmptyChart message="Growth appears once cohorts have alumni counts or Network alumni." />
                ) : (
                  <div style={{ flex: 1, minHeight: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.growth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAlumniLive" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2EC27E" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#2EC27E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="year" stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={chartTooltip} />
                        <Area
                          type="monotone"
                          dataKey="cumulative"
                          name="Alumni"
                          stroke="#2EC27E"
                          strokeWidth={2}
                          fill="url(#colorAlumniLive)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AlumniLayout>
  );
}
