"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { 
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
  IconActivity,
  IconMapPins,
  IconAward,
  IconGlobe,
  IconLoader2,
} from "@tabler/icons-react";
import { useHomePath } from "@/hooks/use-home-path";
import { isCountryWorkspaceRole } from "@/lib/home-path";
import { trpc } from "@/utils/trpc";

const GENDER_COLORS: Record<string, string> = {
  Female: "#7F77DD",
  Male: "#3B8BEB",
  Other: "#E8A020",
  "Not specified": "#64748B",
};

const STATUS_COLORS: Record<string, string> = {
  "Active Fellows": "#2EC27E",
  Alumni: "#3B8BEB",
  Inactive: "#E8A020",
};

const chartTooltipStyle = {
  background: "rgba(4,12,38,0.8)",
  backdropFilter: "blur(10px)",
  border: "1px solid var(--gborder)",
  borderRadius: 12,
  color: "var(--ewhite)",
  fontFamily: "var(--font)",
};

function toPercentData(items: Array<{ name: string; count: number }>, total: number) {
  if (total <= 0) return [];
  return items.map((item) => ({
    name: item.name,
    value: Math.round((item.count / total) * 100),
    count: item.count,
    color: GENDER_COLORS[item.name] ?? STATUS_COLORS[item.name] ?? "#4150A3",
  }));
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        padding: "14px 12px",
        borderRadius: 12,
        border: "1px solid var(--eborder)",
        background: "var(--eglass)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: accent,
          fontFamily: "var(--font)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "var(--emuted)",
          marginTop: 6,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontFamily: "var(--font)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function StatusBreakdown({
  items,
  total,
}: {
  items: Array<{ name: string; value: number; count: number; color: string }>;
  total: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((item) => (
        <div
          key={item.name}
          style={{
            padding: "18px 16px",
            borderRadius: 14,
            border: `1px solid color-mix(in srgb, ${item.color} 32%, var(--eborder))`,
            background: `linear-gradient(160deg, color-mix(in srgb, ${item.color} 16%, transparent), var(--eglass))`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: item.color,
                  boxShadow: `0 0 8px ${item.color}60`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--ewhite)",
                  fontFamily: "var(--font)",
                }}
              >
                {item.name}
              </span>
            </div>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: item.color,
                fontFamily: "var(--font)",
                lineHeight: 1,
              }}
            >
              {item.count}
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              height: 6,
              borderRadius: 999,
              background: "var(--eborder)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${item.value}%`,
                height: "100%",
                borderRadius: 999,
                background: item.color,
              }}
            />
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--emuted)",
              fontFamily: "var(--font)",
            }}
          >
            {total > 0 ? `${item.value}% of the network` : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function CountryDeploymentList({
  countries,
  totalActiveFellows,
}: {
  countries: Array<{
    name: string;
    flag: string;
    fellows: number;
    mcf: number;
    total: number;
    color: string;
  }>;
  totalActiveFellows: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {countries.map((country) => {
        const sharePct =
          totalActiveFellows > 0 ? Math.round((country.fellows / totalActiveFellows) * 100) : null;
        const fillPct = sharePct ?? 0;
        return (
          <div
            key={country.name}
            style={{
              padding: "20px 22px",
              borderRadius: 16,
              border: `1px solid color-mix(in srgb, ${country.color} 35%, var(--eborder))`,
              background: `linear-gradient(135deg, color-mix(in srgb, ${country.color} 12%, transparent), var(--eglass))`,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${country.color} 16%, var(--eglass))`,
                  border: `1px solid color-mix(in srgb, ${country.color} 35%, var(--eborder))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {country.flag || "🌍"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                  }}
                >
                  {country.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--emuted)",
                    marginTop: 2,
                    fontFamily: "var(--font)",
                  }}
                >
                  {country.mcf > 0
                    ? `${country.mcf} fellow${country.mcf === 1 ? "" : "s"} on MCF track`
                    : "Active country hub"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <MiniStat label="Active" value={country.fellows} accent={country.color} />
              <MiniStat label="MCF" value={country.mcf} accent="#E8A020" />
              <MiniStat label="Total" value={country.total} accent="var(--ewhite)" />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--emuted)",
                  fontFamily: "var(--font)",
                  marginBottom: 6,
                }}
              >
                <span>Share of active network</span>
                <span style={{ fontWeight: 700, color: country.color }}>
                  {sharePct != null ? `${sharePct}%` : "—"}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "var(--eborder)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${fillPct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${country.color}, color-mix(in srgb, ${country.color} 75%, white))`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GlobalFellowsDashboard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();
  const networkQuery = useQuery({
    ...trpc.platform.network.queryOptions(),
    enabled: Boolean(session?.user) && !home.isLoading && home.role === "super_admin",
  });

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (home.isLoading) return;
    if (isCountryWorkspaceRole(home.role)) {
      router.replace(home.path as never);
    }
  }, [home.isLoading, home.path, home.role, router]);

  const totals = networkQuery.data?.totals;
  const countryData = useMemo(
    () =>
      (networkQuery.data?.countries ?? []).map((c) => ({
        name: c.name,
        flag: c.flag,
        fellows: c.activeFellows,
        mcf: c.mcfFellows,
        total: c.totalNetwork,
        color: c.color,
      })),
    [networkQuery.data?.countries],
  );

  const genderData = useMemo(
    () => toPercentData(networkQuery.data?.gender ?? [], networkQuery.data?.total ?? 0),
    [networkQuery.data?.gender, networkQuery.data?.total],
  );

  const statusTotal = useMemo(
    () => (networkQuery.data?.status ?? []).reduce((sum, item) => sum + item.count, 0),
    [networkQuery.data?.status],
  );

  const statusData = useMemo(
    () => toPercentData(networkQuery.data?.status ?? [], statusTotal),
    [networkQuery.data?.status, statusTotal],
  );

  const cohortGrowthData = networkQuery.data?.cohorts ?? [];

  if (isPending || !session?.user || home.isLoading || isCountryWorkspaceRole(home.role)) {
    return null;
  }

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <AppShell activePage="fellows" pageTitle="Network" user={user}>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "var(--ewhite)",
            margin: "0 0 8px 0",
            fontFamily: "var(--font)",
          }}
        >
          Total Network
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: "var(--emuted)", fontFamily: "var(--font)" }}>
          Aggregate view of active fellows and MCF fellows across the EPL network. Phase 1 — no
          individual names.
        </p>
      </div>

      {networkQuery.isLoading && (
        <div className="rm-state">
          <IconLoader2 size={18} className="animate-spin" />
          Loading network data…
        </div>
      )}

      {networkQuery.isError && (
        <div className="rm-state rm-state-error">
          Could not load network data. {networkQuery.error.message}
        </div>
      )}

      {!networkQuery.isLoading && !networkQuery.isError && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 24,
              marginBottom: 32,
            }}
          >
         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(59,139,235,0.15)",
                  border: "1px solid rgba(59,139,235,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3B8BEB",
                }}
              >
               <IconActivity size={24} />
            </div>
            <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--emuted)",
                    fontFamily: "var(--font)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: 4,
                    fontWeight: 700,
                  }}
                >
                  Active Fellows
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                    lineHeight: 1,
                  }}
                >
                  {totals?.activeFellows ?? 0}
                </div>
              </div>
         </div>
         
         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(232,160,32,0.15)",
                  border: "1px solid rgba(232,160,32,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#E8A020",
                }}
              >
                <IconAward size={24} />
            </div>
            <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--emuted)",
                    fontFamily: "var(--font)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: 4,
                    fontWeight: 700,
                  }}
                >
                  Alumni Leaders
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                    lineHeight: 1,
                  }}
                >
                  {totals?.alumniLeaders ?? 0}
                </div>
              </div>
         </div>

         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(46,194,126,0.15)",
                  border: "1px solid rgba(46,194,126,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2EC27E",
                }}
              >
               <IconGlobe size={24} />
            </div>
            <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--emuted)",
                    fontFamily: "var(--font)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: 4,
                    fontWeight: 700,
                  }}
                >
                  Total Network
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                    lineHeight: 1,
                  }}
                >
                  {totals?.totalNetwork ?? 0}
                </div>
              </div>
         </div>

         <div className="gc" style={{ padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(232,160,32,0.15)",
                  border: "1px solid rgba(232,160,32,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#E8A020",
                }}
              >
               <IconMapPins size={24} />
            </div>
            <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--emuted)",
                    fontFamily: "var(--font)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: 4,
                    fontWeight: 700,
                  }}
                >
                  Active Countries
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                    lineHeight: 1,
                  }}
                >
                  {totals?.countries ?? 0}
                </div>
              </div>
            </div>
         </div>

          {(totals?.totalNetwork ?? 0) === 0 ? (
            <div className="rm-state">
              No fellows in the network yet. Country managers can add fellows from their hub&apos;s
              Network page.
      </div>
          ) : (
            <>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
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
                    Cohort Intake Growth
                  </h3>
             <div style={{ flex: 1, minHeight: 300 }}>
                    {cohortGrowthData.length === 0 ? (
                      <div className="network-breakdown-empty">
                        <div className="network-breakdown-empty-title">No cohort data yet</div>
                        <div className="network-breakdown-empty-copy">
                          Cohort year on each fellow drives this chart.
                        </div>
                      </div>
                    ) : (
                <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={cohortGrowthData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                      <defs>
                        <linearGradient id="colorIntake" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B8BEB" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3B8BEB" stopOpacity={0} />
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
                      <YAxis stroke="var(--emuted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                            contentStyle={chartTooltipStyle}
                         itemStyle={{ color: "#3B8BEB", fontWeight: 700 }}
                      />
                          <Area
                            type="monotone"
                            dataKey="intake"
                            stroke="#3B8BEB"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorIntake)"
                          />
                   </AreaChart>
                </ResponsiveContainer>
                    )}
             </div>
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
                    Gender Diversity
                  </h3>
             <div style={{ flex: 1, minHeight: 250 }}>
                    {genderData.length === 0 ? (
                      <div className="network-breakdown-empty">
                        <div className="network-breakdown-empty-title">No gender data yet</div>
                      </div>
                    ) : (
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="45%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                            {genderData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={entry.color}
                                style={{ filter: `drop-shadow(0 0 8px ${entry.color}50)` }}
                              />
                        ))}
                      </Pie>
                      <Tooltip 
                            contentStyle={chartTooltipStyle}
                            formatter={(val, _name, item) => [
                              `${val}% (${(item.payload as { count: number }).count})`,
                              "Population",
                            ]}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{
                              fontSize: 13,
                              color: "var(--emuted)",
                              fontFamily: "var(--font)",
                              bottom: 0,
                            }}
                          />
                   </PieChart>
                </ResponsiveContainer>
                    )}
             </div>
          </div>
      </div>

                            <div className="gc" style={{ padding: "28px 30px", paddingBottom: 60 }}>
                <h3
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                  }}
                >
                  Network Breakdown
                </h3>
                <p
                  style={{
                    margin: "0 0 24px 0",
                    fontSize: 12,
                    color: "var(--emuted)",
                    fontFamily: "var(--font)",
                  }}
                >
                  Deployment status and hub-level fellow counts across the continent.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(240px, 1fr) minmax(300px, 1.5fr)",
                    gap: 28,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--emuted)",
                        fontFamily: "var(--font)",
                        marginBottom: 14,
                      }}
                    >
                      Operational Status
                    </div>
                    {statusData.length === 0 ? (
                      <div className="network-breakdown-empty">
                        <div className="network-breakdown-empty-title">No status data yet</div>
             </div>
                    ) : (
                      <StatusBreakdown items={statusData} total={statusTotal} />
                    )}
          </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--emuted)",
                        fontFamily: "var(--font)",
                        marginBottom: 14,
                      }}
                    >
                      Deployment by Country
                    </div>
                    {countryData.length === 0 ? (
                      <div className="network-breakdown-empty">
                        <div className="network-breakdown-empty-title">No country hubs yet</div>
                      </div>
                    ) : (
                      <CountryDeploymentList countries={countryData} totalActiveFellows={totals?.activeFellows ?? 0} />
                    )}
             </div>
          </div>
      </div>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
