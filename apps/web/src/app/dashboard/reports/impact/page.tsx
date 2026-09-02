"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportLayout } from "@/components/epl/report-layout";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  IconTrophy,
  IconSchool,
  IconBuildingBank,
  IconWorld,
  IconTrendingUp,
  IconLoader2,
  IconAward,
} from "@tabler/icons-react";
import { trpc } from "@/utils/trpc";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";

const chartTooltipStyle = {
  background: "rgba(4,12,38,0.9)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--gborder)",
  borderRadius: 12,
  color: "var(--ewhite)",
};

const GENDER_COLORS: Record<string, string> = {
  Female: "#7F77DD",
  Male: "#3B8BEB",
  Other: "#E8A020",
  "Not specified": "#64748B",
};

function formatRate(value: number | null | undefined, fallback = "—") {
  return value != null ? `${value}%` : fallback;
}

export default function ImpactReportPage() {
  const overviewQuery = useQuery(trpc.platform.overview.queryOptions());
  const networkQuery = useQuery(trpc.platform.network.queryOptions());

  const isLoading = overviewQuery.isLoading || networkQuery.isLoading;
  const isError = overviewQuery.isError || networkQuery.isError;
  const errorMessage = overviewQuery.error?.message ?? networkQuery.error?.message;

  const totals = overviewQuery.data?.totals;
  const countries = overviewQuery.data?.countries ?? [];
  const cohorts = networkQuery.data?.cohorts ?? [];
  const gender = networkQuery.data?.gender ?? [];
  const mcfFellows = networkQuery.data?.totals.mcfFellows ?? 0;

  const networkGrowth = useMemo(() => {
    if (cohorts.length === 0) return [];
    const sorted = [...cohorts].sort((a, b) => Number(a.year) - Number(b.year));
    let cumulative = 0;
    return sorted.map((c) => {
      cumulative += c.intake;
      return { year: c.year, network: cumulative };
    });
  }, [cohorts]);

  const genderData = useMemo(
    () =>
      gender.map((g) => ({
        name: g.name,
        count: g.count,
        color: GENDER_COLORS[g.name] ?? "#4150A3",
      })),
    [gender],
  );

  const pillars = useMemo(() => {
    const totalNetwork = totals?.totalNetwork ?? 0;
    const mcfShare =
      totalNetwork > 0 ? Math.round((mcfFellows / totalNetwork) * 100) : null;

    return [
      {
        icon: <IconBuildingBank size={24} />,
        title: "Retention Coverage",
        desc:
          totals?.placed != null && totals.activeFellows != null
            ? `${totals.placed} of ${totals.activeFellows} active fellows are currently retained (${formatRate(totals.placementRate)}).`
            : "Retention data will appear as country hubs record fellow retention.",
        color: "#3B8BEB",
      },
      {
        icon: <IconSchool size={24} />,
        title: "Program Capacity",
        desc: `${totals?.programHealth.total ?? 0} program tracks tracked · ${totals?.programHealth.onTrack ?? 0} on track across the network.`,
        color: "#E8A020",
      },
      {
        icon: <IconAward size={24} />,
        title: "MCF Network",
        desc:
          mcfShare != null
            ? `${mcfFellows} MCF-flagged fellows (${mcfShare}% of total network) — ready for MCF accountability reporting.`
            : `${mcfFellows} MCF-flagged fellows in the network.`,
        color: "#7F77DD",
      },
    ];
  }, [totals, mcfFellows]);

  return (
    <ReportLayout activePage="impact" pageTitle="Global Impact Tracking">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "var(--ewhite)",
              margin: 0,
              fontFamily: "var(--font)",
            }}
          >
            Network Impact Dashboard
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--emuted)",
              fontFamily: "var(--font)",
              maxWidth: 700,
            }}
          >
            Defensible aggregate outcomes from live hub data — retention, alumni growth, inclusion,
            and institutional reach.
          </p>
        </div>

        {isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading impact data…
          </div>
        )}

        {isError && (
          <div className="rm-state rm-state-error">Could not load impact data. {errorMessage}</div>
        )}

        {!isLoading && !isError && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {[
                {
                  label: "Overall Retention",
                  value: formatRate(totals?.placementRate),
                  sub: `${totals?.placed ?? 0} of ${totals?.activeFellows ?? 0} active fellows retained`,
                  color: "#3B8BEB",
                  icon: <IconBuildingBank size={24} />,
                },
                {
                  label: "Alumni Network",
                  value: String(totals?.alumniLeaders ?? 0),
                  sub: "Graduated fellows in the network",
                  color: "#2EC27E",
                  icon: <IconTrophy size={24} />,
                },
                {
                  label: "Regional Reach",
                  value: String(totals?.countries ?? 0),
                  sub: "Active country hub integrations",
                  color: "#7F77DD",
                  icon: <IconWorld size={24} />,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="gc"
                  style={{
                    padding: "30px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      width: 80,
                      height: 80,
                      background: kpi.color,
                      opacity: 0.1,
                      filter: "blur(40px)",
                      borderRadius: "50%",
                    }}
                  />
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      marginBottom: 20,
                      background: `${kpi.color}15`,
                      border: `1px solid ${kpi.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: kpi.color,
                      boxShadow: `0 8px 24px -10px ${kpi.color}`,
                    }}
                  >
                    {kpi.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 900,
                      color: "var(--ewhite)",
                      fontFamily: "var(--font)",
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    {kpi.value}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: kpi.color,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: 6,
                    }}
                  >
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                    {kpi.sub}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
              <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  <IconTrendingUp size={20} color="#2EC27E" />
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "var(--ewhite)",
                      fontFamily: "var(--font)",
                    }}
                  >
                    Cumulative Network Growth
                  </h3>
                </div>
                {networkGrowth.length === 0 ? (
                  <div className="rm-state" style={{ minHeight: 260 }}>
                    Network growth chart will populate as fellow records are added by cohort year.
                  </div>
                ) : (
                  <div style={{ flex: 1, minHeight: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={networkGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="impactArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2EC27E" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2EC27E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="year"
                          stroke="var(--emuted)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--emuted)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area
                          type="monotone"
                          dataKey="network"
                          stroke="#2EC27E"
                          strokeWidth={3}
                          fill="url(#impactArea)"
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
                <h3
                  style={{
                    margin: "0 0 24px 0",
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                  }}
                >
                  Gender Inclusion
                </h3>
                {genderData.length === 0 ? (
                  <div className="rm-state" style={{ minHeight: 260 }}>
                    Gender breakdown appears when fellow gender fields are recorded in country hubs.
                  </div>
                ) : (
                  <div style={{ flex: 1, minHeight: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={genderData}
                        layout="vertical"
                        margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                      >
                        <XAxis type="number" hide allowDecimals={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="var(--ewhite)"
                          fontSize={13}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          width={100}
                        />
                        <Tooltip cursor={{ fill: "transparent" }} contentStyle={chartTooltipStyle} />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={20}>
                          {genderData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                  }}
                >
                  Country Impact Matrix
                </h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--emuted)",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B8BEB" }} />{" "}
                    Retention
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--emuted)",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2EC27E" }} />{" "}
                    Alumni
                  </div>
                </div>
              </div>

              {countries.length === 0 ? (
                <div className="rm-state">No country hubs to display yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {countries.map((c) => {
                    const iso2 = resolveIso2({
                      countryCode: c.countryCode,
                      flag: c.flag,
                      iso2: c.iso2,
                    });
                    const flagSrc = iso2 ? flagImageUrl(iso2, 40) : "";
                    return (
                    <div
                      key={c.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "220px 1fr 120px",
                        gap: 24,
                        padding: "20px 24px",
                        alignItems: "center",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                      className="row-item"
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          {flagSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={flagSrc}
                              alt=""
                              width={42}
                              height={32}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: 22 }}>{c.flag}</span>
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color: "var(--ewhite)",
                              fontFamily: "var(--font)",
                            }}
                          >
                            {c.name}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 600 }}>
                            {c.programHealth.activePrograms} ACTIVE PROGRAM
                            {c.programHealth.activePrograms === 1 ? "" : "S"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--emuted)",
                          }}
                        >
                          <span>RETENTION RATE</span>
                          <span style={{ color: "var(--ewhite)" }}>
                            {formatRate(c.placementRate)}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 8,
                            borderRadius: 4,
                            background: "rgba(255,255,255,0.05)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${c.placementRate ?? 0}%`,
                              height: "100%",
                              background: `linear-gradient(90deg, ${c.color}aa, ${c.color})`,
                              boxShadow: `0 0 10px ${c.color}40`,
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: "var(--ewhite)",
                            fontFamily: "var(--font)",
                            lineHeight: 1,
                          }}
                        >
                          {c.alumniLeaders}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--emuted)",
                            textTransform: "uppercase",
                            marginTop: 4,
                          }}
                        >
                          Alumni
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {pillars.map((pillar, i) => (
                <div
                  key={i}
                  className="gc"
                  style={{ padding: "26px", display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: `${pillar.color}15`,
                      border: `1px solid ${pillar.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: pillar.color,
                    }}
                  >
                    {pillar.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "var(--ewhite)",
                      fontFamily: "var(--font)",
                    }}
                  >
                    {pillar.title}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--emuted)",
                      lineHeight: 1.6,
                      margin: 0,
                      fontFamily: "var(--font)",
                    }}
                  >
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ReportLayout>
  );
}
