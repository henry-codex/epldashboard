"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ReportLayout } from "@/components/epl/report-layout";
import {
  IconUsers,
  IconArrowRight,
  IconArrowUpRight,
  IconLoader2,
  IconStack2,
  IconAward,
} from "@tabler/icons-react";
import { trpc } from "@/utils/trpc";
import { resolveIso2 } from "@/lib/world-countries";
import { CountrySummaryPanel } from "@/components/epl/country-summary";
import { CountryInsights } from "@/components/epl/country-insights";
import { CountryFlag } from "@/components/epl/country-flag";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const chartTooltipStyle = {
  background: "rgba(4,12,38,0.9)",
  backdropFilter: "blur(10px)",
  border: "1px solid var(--gborder)",
  borderRadius: 12,
  color: "var(--ewhite)",
};

function femalePctFor(c: { maleCount: number | null; femaleCount: number | null }) {
  if (c.maleCount == null || c.femaleCount == null || c.maleCount + c.femaleCount === 0) return null;
  return Math.round((c.femaleCount / (c.maleCount + c.femaleCount)) * 100);
}

function CountryFullStats({ tenantId, accent }: { tenantId: string; accent: string }) {
  const cohortsQuery = useQuery(trpc.cohorts.list.queryOptions({ tenantId }));
  const mcfQuery = useQuery(trpc.cohorts.mcfStats.queryOptions({ tenantId }));
  const fellowsQuery = useQuery(trpc.fellows.aggregates.queryOptions({ tenantId }));

  if (cohortsQuery.isLoading || mcfQuery.isLoading || fellowsQuery.isLoading) {
    return (
      <div className="rm-state" style={{ padding: "16px 0" }}>
        <IconLoader2 size={16} className="animate-spin" /> Loading country stats…
      </div>
    );
  }

  const cohorts = cohortsQuery.data?.items ?? [];
  const mcfRows = mcfQuery.data?.items ?? [];
  const aggregates = fellowsQuery.data;

  const cohortData = [...cohorts]
    .filter((c) => !c.isVirtual)
    .sort((a, b) => (a.cohortYear ?? 0) - (b.cohortYear ?? 0))
    .map((c) => ({ name: c.label, Recruited: c.totalFellows, Graduated: c.alumniFellows }));

  const genderData = [...cohorts]
    .filter((c) => !c.isVirtual && c.maleCount != null && c.femaleCount != null && c.maleCount + c.femaleCount > 0)
    .sort((a, b) => (a.cohortYear ?? 0) - (b.cohortYear ?? 0))
    .map((c) => ({ name: c.label, Male: c.maleCount, Female: c.femaleCount }));

  const networkCompositionData = aggregates
    ? [
        { name: "Active", value: aggregates.activeFellows, color: accent },
        { name: "Incoming", value: aggregates.incomingFellows, color: "#3B8BEB" },
        { name: "Alumni", value: aggregates.alumniLeaders, color: "#9B59B6" },
      ].filter((d) => d.value > 0)
    : [];

  const latestCohorts = [...cohorts]
    .filter((c) => !c.isVirtual)
    .sort((a, b) => (b.cohortYear ?? 0) - (a.cohortYear ?? 0))
    .slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <CountrySummaryPanel cohorts={cohorts} mcfRows={mcfRows} accent={accent} />
      <CountryInsights cohorts={cohorts} accent={accent} />

      <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Cohort Breakdown
          </div>
          {cohorts.length > 0 && (
            <Link
              href={`/dashboard/countries/${tenantId}/cohorts` as never}
              style={{
                fontSize: 11, fontWeight: 600, color: accent, fontFamily: "var(--font)", textDecoration: "none",
                display: "flex", alignItems: "center", gap: 3,
              }}
            >
              See all <IconArrowUpRight size={12} />
            </Link>
          )}
        </div>
        {latestCohorts.length === 0 ? (
          <div className="rm-state" style={{ fontSize: 12 }}>No cohorts yet.</div>
        ) : (
          <>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "0 4px",
              fontSize: 9, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font)",
            }}>
              <span>Cohort</span><span>Recruited</span><span>Graduated</span><span>Female %</span>
            </div>
            {latestCohorts.map((co) => {
              const femalePct = femalePctFor(co);
              const graduated = co.alumniFellows;
              return (
                <div key={co.id ?? co.label} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "10px 8px",
                  background: "var(--eglass)", borderRadius: 8, border: "1px solid var(--eborder)", alignItems: "center",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: accent, fontFamily: "var(--font)" }}>{co.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{co.totalFellows}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font)", color: graduated > 0 ? "var(--ewhite)" : "var(--emuted)" }}>
                    {graduated > 0 ? graduated : co.statusLabel}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font)", color: femalePct != null ? "var(--ewhite)" : "var(--emuted)" }}>
                    {femalePct != null ? `${femalePct}%` : "—"}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Recruited vs Graduated by Cohort
          </div>
          {cohortData.length === 0 ? (
            <div className="rm-state" style={{ fontSize: 12 }}>No cohort data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cohortData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "var(--emuted)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--emuted)", fontSize: 10 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="Recruited" fill={accent} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Graduated" fill="#3B8BEB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Network Composition
          </div>
          {networkCompositionData.length === 0 ? (
            <div className="rm-state" style={{ fontSize: 12 }}>No fellows yet.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={networkCompositionData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={68} paddingAngle={2}>
                    {networkCompositionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                {networkCompositionData.map((entry) => (
                  <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color }} />
                    <span style={{ fontSize: 11, color: "var(--emuted)" }}>{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {genderData.length > 0 && (
        <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Gender Balance by Cohort
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={genderData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "var(--emuted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--emuted)", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="Male" stackId="gender" fill={accent} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Female" stackId="gender" fill="#9B59B6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function ReportsByCountryPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const overviewQuery = useQuery(trpc.platform.overview.queryOptions());
  const networkQuery = useQuery(trpc.platform.network.queryOptions());

  const isLoading = overviewQuery.isLoading || networkQuery.isLoading;
  const isError = overviewQuery.isError || networkQuery.isError;
  const errorMessage = overviewQuery.error?.message ?? networkQuery.error?.message;

  const mcfByCountry = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of networkQuery.data?.countries ?? []) {
      map.set(c.id, c.mcfFellows);
    }
    return map;
  }, [networkQuery.data?.countries]);

  const countries = overviewQuery.data?.countries ?? [];

  useEffect(() => {
    if (!selectedId && countries.length > 0) setSelectedId(countries[0]!.id);
  }, [selectedId, countries]);

  const c = countries.find((country) => country.id === selectedId) ?? countries[0];

  return (
    <ReportLayout activePage="country" pageTitle="Country Performance">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 60 }}>
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
            Country Performance
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--emuted)",
              fontFamily: "var(--font)",
              maxWidth: 720,
            }}
          >
            Pick a country to see its full breakdown — cohorts in progress, recruitment and
            graduation totals, and inclusion charts — one hub at a time.
          </p>
        </div>

        {isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading country data…
          </div>
        )}

        {isError && (
          <div className="rm-state rm-state-error">Could not load country data. {errorMessage}</div>
        )}

        {!isLoading && !isError && countries.length === 0 && (
          <div className="rm-state">
            No active country hubs yet. Country managers can set up their hub to appear here.
          </div>
        )}

        {!isLoading && !isError && countries.length > 0 && c && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {countries.map((country) => {
                const iso2 = resolveIso2({ countryCode: country.countryCode, flag: country.flag, iso2: country.iso2 });
                const active = country.id === c.id;
                return (
                  <button
                    key={country.id}
                    type="button"
                    onClick={() => setSelectedId(country.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      borderRadius: 999,
                      border: `1px solid ${active ? country.color : "rgba(255,255,255,0.1)"}`,
                      background: active ? `${country.color}20` : "rgba(255,255,255,0.03)",
                      color: active ? country.color : "var(--emuted)",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "var(--font)",
                      cursor: "pointer",
                    }}
                  >
                    <CountryFlag iso2={iso2} emoji={country.flag} width={18} height={13} />
                    {country.name}
                  </button>
                );
              })}
            </div>

            <div
              className="gc"
              style={{
                padding: "30px",
                display: "flex",
                flexDirection: "column",
                gap: 22,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  background: c.color,
                  opacity: 0.15,
                  filter: "blur(40px)",
                  borderRadius: "50%",
                }}
              />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1, gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.1)",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <CountryFlag
                      iso2={resolveIso2({ countryCode: c.countryCode, flag: c.flag, iso2: c.iso2 })}
                      emoji={c.flag}
                      width={56}
                      height={42}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--emuted)", fontWeight: 600, fontFamily: "var(--font)" }}>
                    {(c.activeCohorts ?? []).length} cohort{(c.activeCohorts ?? []).length === 1 ? "" : "s"} in progress
                    {(mcfByCountry.get(c.id) ?? 0) > 0 ? ` · ${mcfByCountry.get(c.id)} MCF` : ""}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    background: `${c.color}20`,
                    color: c.color,
                    fontSize: 11,
                    fontWeight: 800,
                    border: `1px solid ${c.color}30`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.totalNetwork} IN NETWORK
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, zIndex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--emuted)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  <IconStack2 size={14} /> Active cohorts
                </div>

                {(c.activeCohorts ?? []).length === 0 ? (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      fontSize: 13,
                      color: "var(--emuted)",
                    }}
                  >
                    No in-progress cohort yet. Add a cohort on the country hub, or enroll fellows with a
                    cohort year.
                  </div>
                ) : (
                  (c.activeCohorts ?? []).map((co) => (
                    <div
                      key={co.id ?? `${co.label}-${co.cohortYear}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                            {co.label}
                            {co.cohortYear != null ? (
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--emuted)", marginLeft: 8 }}>
                                · {co.cohortYear}
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--emuted)", marginTop: 4, fontWeight: 600 }}>
                            {co.activeFellows} active fellow{co.activeFellows === 1 ? "" : "s"}
                            {co.totalFellows > co.activeFellows ? ` · ${co.totalFellows} total` : ""}
                            {co.startsOn && co.endsOn ? ` · ${co.startsOn} → ${co.endsOn}` : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "5px 10px",
                            borderRadius: 20,
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            whiteSpace: "nowrap",
                            background: co.status === "in_progress" ? "rgba(46,194,126,0.12)" : "rgba(59,139,235,0.12)",
                            color: co.status === "in_progress" ? "#2EC27E" : "#3B8BEB",
                            border: `1px solid ${co.status === "in_progress" ? "rgba(46,194,126,0.25)" : "rgba(59,139,235,0.25)"}`,
                          }}
                        >
                          {co.statusLabel}
                        </div>
                      </div>
                      {co.timelineProgress != null && (
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--emuted)",
                              marginBottom: 6,
                            }}
                          >
                            <span>TIMELINE</span>
                            <span style={{ color: c.color }}>
                              {co.daysRemaining != null && co.daysRemaining > 0
                                ? `${co.daysRemaining}d left · ${co.timelineProgress}%`
                                : `${co.timelineProgress}%`}
                            </span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                            <div style={{ width: `${co.timelineProgress}%`, height: "100%", background: c.color }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, zIndex: 1 }}>
                {[
                  { label: "Active", value: c.activeFellows, icon: <IconUsers size={14} />, color: "#3B8BEB" },
                  { label: "Alumni", value: c.alumniLeaders, icon: <IconAward size={14} />, color: "#9B59B6" },
                  { label: "Cohorts", value: c.cohortCount, icon: <IconStack2 size={14} />, color: "#E8A020" },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      padding: "14px 12px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        color: "var(--emuted)",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      {m.icon} {m.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: m.color, fontFamily: "var(--font)", lineHeight: 1 }}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  zIndex: 1,
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 600 }}>
                  {c.programHealth.activePrograms} active program{c.programHealth.activePrograms === 1 ? "" : "s"}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/countries/${c.id}/cohorts`)}
                  style={{
                    background: "none",
                    border: "none",
                    color: c.color,
                    fontSize: 13,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  View cohorts <IconArrowRight size={16} />
                </button>
              </div>

              <div style={{ zIndex: 1, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <CountryFullStats tenantId={c.id} accent={c.color} />
              </div>
            </div>
          </>
        )}
      </div>
    </ReportLayout>
  );
}
