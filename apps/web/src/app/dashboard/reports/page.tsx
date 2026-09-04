"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportLayout } from "@/components/epl/report-layout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  IconUsers,
  IconBuildingCommunity,
  IconChartBar,
  IconDeviceAnalytics,
  IconGlobe,
  IconLoader2,
  IconAward,
} from "@tabler/icons-react";
import { trpc } from "@/utils/trpc";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";

const chartTooltipStyle = {
  background: "rgba(4,12,38,0.9)",
  backdropFilter: "blur(10px)",
  border: "1px solid var(--gborder)",
  borderRadius: 12,
  color: "var(--ewhite)",
};

export default function ReportsOverviewPage() {
  const overviewQuery = useQuery(trpc.platform.overview.queryOptions());
  const networkQuery = useQuery(trpc.platform.network.queryOptions());

  const isLoading = overviewQuery.isLoading || networkQuery.isLoading;
  const isError = overviewQuery.isError || networkQuery.isError;
  const errorMessage = overviewQuery.error?.message ?? networkQuery.error?.message;

  const totals = overviewQuery.data?.totals;
  const countries = overviewQuery.data?.countries ?? [];
  const cohorts = networkQuery.data?.cohorts ?? [];
  const mcfFellows = networkQuery.data?.totals.mcfFellows ?? 0;

  const deploymentData = useMemo(
    () =>
      countries
        .filter((c) => c.activeFellows > 0 || c.alumniLeaders > 0)
        .map((c) => ({
          name: c.name,
          fellows: c.activeFellows,
          color: c.color,
        })),
    [countries],
  );

  const cohortIntakeData = useMemo(
    () => cohorts.map((c) => ({ year: c.year, intake: c.intake })),
    [cohorts],
  );

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => b.activeFellows - a.activeFellows),
    [countries],
  );

  return (
    <ReportLayout activePage="overview" pageTitle="Data Hub">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 60 }}>
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "var(--ewhite)",
              margin: "0 0 8px 0",
              fontFamily: "var(--font)",
            }}
          >
            Network Performance Overview
          </h1>
          <p style={{ margin: 0, fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Live aggregate analytics across active country hubs — no individual fellow data shown.
          </p>
        </div>

        {isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading network data…
          </div>
        )}

        {isError && (
          <div className="rm-state rm-state-error">Could not load data. {errorMessage}</div>
        )}

        {!isLoading && !isError && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              {[
                {
                  label: "Active Fellows",
                  value: totals?.activeFellows ?? 0,
                  color: "#3B8BEB",
                  icon: <IconUsers size={24} />,
                },
                {
                  label: "Alumni Leaders",
                  value: totals?.alumniLeaders ?? 0,
                  color: "#9B59B6",
                  icon: <IconBuildingCommunity size={24} />,
                },
                {
                  label: "Total Network",
                  value: totals?.totalNetwork ?? 0,
                  color: "#2EC27E",
                  icon: <IconGlobe size={24} />,
                },
                {
                  label: "MCF Fellows",
                  value: mcfFellows,
                  color: "#7F77DD",
                  icon: <IconAward size={24} />,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="gc"
                  style={{ padding: "24px", display: "flex", alignItems: "center", gap: 18 }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: `${s.color}15`,
                      border: `1px solid ${s.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: s.color,
                      boxShadow: `0 8px 20px -6px ${s.color}40`,
                    }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: "var(--ewhite)",
                        fontFamily: "var(--font)",
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--emuted)",
                        fontFamily: "var(--font)",
                        marginTop: 4,
                        fontWeight: 600,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24 }}>
              <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <IconDeviceAnalytics size={20} color="#3B8BEB" />
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "var(--ewhite)",
                      fontFamily: "var(--font)",
                    }}
                  >
                    Cohort Intake by Year
                  </h3>
                </div>
                {cohortIntakeData.length === 0 ? (
                  <div className="rm-state" style={{ minHeight: 260 }}>
                    No cohort intake recorded yet. Fellow records will populate this chart as country
                    hubs sync data.
                  </div>
                ) : (
                  <div style={{ flex: 1, minHeight: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={cohortIntakeData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="year" stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="intake" fill="#3B8BEB" radius={[6, 6, 0, 0]} />
                      </BarChart>
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
                  Deployment Distribution
                </h3>
                {deploymentData.length === 0 ? (
                  <div className="rm-state" style={{ minHeight: 260 }}>
                    No active deployments yet. Add fellows in a country hub to see distribution.
                  </div>
                ) : (
                  <div style={{ flex: 1, minHeight: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={deploymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="fellows"
                          stroke="none"
                        >
                          {deploymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <IconChartBar size={20} color="#2EC27E" />
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: "var(--ewhite)",
                      fontFamily: "var(--font)",
                    }}
                  >
                    Country Performance
                  </h3>
                </div>
                <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 600 }}>
                  {totals?.countries ?? 0} ACTIVE HUB{totals?.countries === 1 ? "" : "S"}
                </div>
              </div>

              {sortedCountries.length === 0 ? (
                <div className="rm-state">
                  No active country hubs yet. Set up a country workspace to begin tracking.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                      gap: 12,
                      padding: "0 16px",
                      fontSize: 10,
                      color: "var(--emuted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontWeight: 800,
                    }}
                  >
                    <span>NATION</span>
                    <span>FELLOWS</span>
                    <span>ALUMNI</span>
                    <span>PROGRAMS</span>
                  </div>

                  {sortedCountries.map((c) => {
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
                          gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                          gap: 12,
                          padding: "16px",
                          alignItems: "center",
                          background: "rgba(255,255,255,0.02)",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.04)",
                          transition: "all 0.2s",
                        }}
                        className="row-hover"
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {flagSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={flagSrc}
                              alt=""
                              width={28}
                              height={20}
                              style={{ borderRadius: 3, objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: 22 }}>{c.flag}</span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>
                            {c.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: c.color }}>
                          {c.activeFellows}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ewhite)" }}>
                          {c.alumniLeaders}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>
                          {c.programHealth.totalPrograms}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ReportLayout>
  );
}
