"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ReportLayout } from "@/components/epl/report-layout";
import {
  IconUsers,
  IconBuildingBank,
  IconArrowRight,
  IconLoader2,
  IconStack2,
  IconAward,
} from "@tabler/icons-react";
import { trpc } from "@/utils/trpc";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";

export default function ReportsByCountryPage() {
  const router = useRouter();
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

  return (
    <ReportLayout activePage="country" pageTitle="Country Performance">
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
            Mid-program pulse: which cohorts are in progress, network size,
            and placement institutions. Retention rate is shown as a network outcome metric.
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

        {!isLoading && !isError && countries.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: 24,
            }}
          >
            {countries.map((c) => {
              const mcf = mcfByCountry.get(c.id) ?? 0;
              const activeCohorts = c.activeCohorts ?? [];
              const iso2 = resolveIso2({
                countryCode: c.countryCode,
                flag: c.flag,
                iso2: c.iso2,
              });
              const flagSrc = iso2 ? flagImageUrl(iso2, 80) : "";

              return (
                <div
                  key={c.id}
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

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      zIndex: 1,
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
                        {flagSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={flagSrc}
                            alt=""
                            width={56}
                            height={42}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : c.flag ? (
                          <span style={{ fontSize: 28 }}>{c.flag}</span>
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--emuted)" }}>
                            {iso2 || "—"}
                          </span>
                        )}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: "var(--ewhite)",
                            fontFamily: "var(--font)",
                          }}
                        >
                          {c.name}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--emuted)",
                            fontWeight: 600,
                            fontFamily: "var(--font)",
                          }}
                        >
                          {activeCohorts.length} cohort
                          {activeCohorts.length === 1 ? "" : "s"} in progress
                          {mcf > 0 ? ` · ${mcf} MCF` : ""}
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

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      zIndex: 1,
                    }}
                  >
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

                    {activeCohorts.length === 0 ? (
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
                        No in-progress cohort yet. Add a cohort on the country hub, or enroll
                        fellows with a cohort year.
                      </div>
                    ) : (
                      activeCohorts.map((co) => (
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
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 800,
                                color: "var(--ewhite)",
                                fontFamily: "var(--font)",
                              }}
                            >
                              {co.label}
                              {co.cohortYear != null ? (
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "var(--emuted)",
                                    marginLeft: 8,
                                  }}
                                >
                                  · {co.cohortYear}
                                </span>
                              ) : null}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--emuted)",
                                marginTop: 4,
                                fontWeight: 600,
                              }}
                            >
                              {co.activeFellows} active fellow
                              {co.activeFellows === 1 ? "" : "s"}
                              {co.totalFellows > co.activeFellows
                                ? ` · ${co.totalFellows} total`
                                : ""}
                              {co.startsOn && co.endsOn
                                ? ` · ${co.startsOn} → ${co.endsOn}`
                                : ""}
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
                              background:
                                co.status === "in_progress"
                                  ? "rgba(46,194,126,0.12)"
                                  : "rgba(59,139,235,0.12)",
                              color: co.status === "in_progress" ? "#2EC27E" : "#3B8BEB",
                              border: `1px solid ${
                                co.status === "in_progress"
                                  ? "rgba(46,194,126,0.25)"
                                  : "rgba(59,139,235,0.25)"
                              }`,
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
                              <div
                                style={{
                                  height: 6,
                                  borderRadius: 3,
                                  background: "rgba(255,255,255,0.05)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${co.timelineProgress}%`,
                                    height: "100%",
                                    background: c.color,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 12,
                      zIndex: 1,
                    }}
                  >
                    {[
                      {
                        label: "Active",
                        value: c.activeFellows,
                        icon: <IconUsers size={14} />,
                        color: "#3B8BEB",
                      },
                      {
                        label: "Alumni",
                        value: c.alumniLeaders,
                        icon: <IconAward size={14} />,
                        color: "#9B59B6",
                      },
                      {
                        label: "Institutions",
                        value: c.institutions,
                        icon: <IconBuildingBank size={14} />,
                        color: "#E8A020",
                      },
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
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            color: m.color,
                            fontFamily: "var(--font)",
                            lineHeight: 1,
                          }}
                        >
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
                      {c.programHealth.activePrograms} active program
                      {c.programHealth.activePrograms === 1 ? "" : "s"}
                      {c.placed > 0 ? ` · ${c.placed} retained` : ""}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
