"use client";

import { useQuery } from "@tanstack/react-query";
import { ReportLayout } from "@/components/epl/report-layout";
import {
  IconSchool,
  IconActivity,
  IconArchive,
  IconClock,
  IconLoader2,
} from "@tabler/icons-react";
import { trpc } from "@/utils/trpc";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";

function formatCommencement(startYear: number | null) {
  if (!startYear) return "Not set";
  return String(startYear);
}

function formatIntake(activeFellows: number, targetFellows: number) {
  if (targetFellows > 0) return `${activeFellows} / ${targetFellows}`;
  return String(activeFellows);
}

export default function ReportsByProgramPage() {
  const portfolioQuery = useQuery(trpc.platform.programPortfolio.queryOptions());
  const programs = portfolioQuery.data?.programs ?? [];
  const active = programs.filter((p) => p.status === "active");
  const planned = programs.filter((p) => p.status === "planned");
  const completed = programs.filter((p) => p.status === "completed");

  return (
    <ReportLayout activePage="program" pageTitle="Continental Program Audit">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
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
              Global Program Portfolio
            </h1>
            <p style={{ margin: 0, fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)" }}>
              Program tracks and fill rates across active country hubs.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                background: "rgba(46,194,126,0.1)",
                border: "1px solid rgba(46,194,126,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconActivity size={16} color="#2EC27E" />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#2EC27E" }}>
                {active.length} ACTIVE
              </span>
            </div>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                background: "rgba(59,139,235,0.1)",
                border: "1px solid rgba(59,139,235,0.2)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconArchive size={16} color="#3B8BEB" />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#3B8BEB" }}>
                {completed.length} FINISHED
              </span>
            </div>
            {planned.length > 0 && (
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--emuted)" }}>
                  {planned.length} PLANNED
                </span>
              </div>
            )}
          </div>
        </div>

        {portfolioQuery.isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading program portfolio…
          </div>
        )}

        {portfolioQuery.isError && (
          <div className="rm-state rm-state-error">
            Could not load programs. {portfolioQuery.error.message}
          </div>
        )}

        {!portfolioQuery.isLoading && !portfolioQuery.isError && programs.length === 0 && (
          <div className="rm-state">
            No programs recorded yet. Country managers can add programs from their hub&apos;s Programs
            page.
          </div>
        )}

        {!portfolioQuery.isLoading && !portfolioQuery.isError && programs.length > 0 && (
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <IconSchool size={20} color="#E8A020" />
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--ewhite)",
                  fontFamily: "var(--font)",
                }}
              >
                Program Performance Audit
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 1fr",
                  gap: 16,
                  padding: "0 20px",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.30)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 800,
                }}
              >
                <span>PROGRAM TRACK</span>
                <span>NATION</span>
                <span>INTAKE</span>
                <span>COMMENCEMENT</span>
                <span>STATUS</span>
              </div>

              {programs.map((p) => {
                const iso2 = resolveIso2({ iso2: p.country.iso2, flag: p.country.flag });
                const flagSrc = iso2 ? flagImageUrl(iso2, 40) : "";
                return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 1fr",
                    gap: 16,
                    padding: "20px",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.05)",
                    transition: "all 0.2s",
                  }}
                  className="row-hover"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: `${p.country.color}15`,
                        border: `1px solid ${p.country.color}30`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: p.country.color,
                      }}
                    >
                      <IconSchool size={20} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>
                      {p.title}
                    </span>
                  </div>

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
                      <span style={{ fontSize: 22 }}>{p.country.flag}</span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--emuted)" }}>
                      {p.country.name}
                    </span>
                  </div>

                  <span style={{ fontSize: 16, fontWeight: 800, color: p.country.color }}>
                    {formatIntake(p.activeFellows, p.targetFellows)}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)" }}>
                    <IconClock size={14} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {formatCommencement(p.startYear)}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      background:
                        p.status === "active"
                          ? "rgba(46,194,126,0.12)"
                          : p.status === "completed"
                            ? "rgba(59,139,235,0.12)"
                            : "rgba(255,255,255,0.05)",
                      color:
                        p.status === "active"
                          ? "#2EC27E"
                          : p.status === "completed"
                            ? "#3B8BEB"
                            : "rgba(255,255,255,0.4)",
                      border: `1px solid ${
                        p.status === "active"
                          ? "rgba(46,194,126,0.25)"
                          : p.status === "completed"
                            ? "rgba(59,139,235,0.25)"
                            : "rgba(255,255,255,0.1)"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "currentColor",
                        boxShadow: "0 0 6px currentColor",
                      }}
                    />
                    {p.status}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
