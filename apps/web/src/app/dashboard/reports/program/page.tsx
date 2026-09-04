"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportLayout } from "@/components/epl/report-layout";
import {
  IconSchool,
  IconLoader2,
  IconUsersGroup,
  IconGenderBigender,
  IconAccessible,
  IconAward,
} from "@tabler/icons-react";
import { trpc } from "@/utils/trpc";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";

const dash = "—";

function SummaryStat({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flex: "1 1 140px",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 2 }}>{label}</div>
        {hint && (
          <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)", opacity: 0.75 }}>{hint}</div>
        )}
      </div>
    </div>
  );
}

export default function ReportsByProgramPage() {
  const [view, setView] = useState<"country" | "mcf">("country");
  const summaryQuery = useQuery(trpc.platform.countrySummary.queryOptions());
  const mcfQuery = useQuery(trpc.platform.mcfSummary.queryOptions());

  const countries = summaryQuery.data?.countries ?? [];
  const mcfCountries = mcfQuery.data?.countries ?? [];

  const continentTotals = useMemo(() => {
    const totalRecruited = countries.reduce((sum, c) => sum + c.totalRecruited, 0);
    const totalGraduated = countries.reduce((sum, c) => sum + c.totalGraduated, 0);
    return { totalRecruited, totalGraduated };
  }, [countries]);

  const mcfTotals = useMemo(() => {
    return mcfCountries.reduce(
      (acc, c) => ({
        totalRecruited: acc.totalRecruited + c.totalRecruited,
        totalGraduated: acc.totalGraduated + c.totalGraduated,
        pwdTotal: acc.pwdTotal + (c.pwdTotal ?? 0),
        scholarTotal: acc.scholarTotal + (c.scholarTotal ?? 0),
        toBeRecruited: acc.toBeRecruited + c.toBeRecruited,
      }),
      { totalRecruited: 0, totalGraduated: 0, pwdTotal: 0, scholarTotal: 0, toBeRecruited: 0 },
    );
  }, [mcfCountries]);

  const isLoading = view === "country" ? summaryQuery.isLoading : mcfQuery.isLoading;
  const isError = view === "country" ? summaryQuery.isError : mcfQuery.isError;
  const errorMessage = view === "country" ? summaryQuery.error?.message : mcfQuery.error?.message;

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
              {view === "country"
                ? "Recruitment, graduation, and inclusion totals summed straight from each hub's own cohort data."
                : "The Foundation's own reported slice — summed from each hub's MCF Stats import, not the country-wide totals."}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div
              className="cs-tabs"
              style={{ "--tab-accent": "#4150A3" } as React.CSSProperties}
            >
              <button type="button" className={`cs-tab${view === "country" ? " is-active" : ""}`} onClick={() => setView("country")}>
                All Stats
              </button>
              <button type="button" className={`cs-tab${view === "mcf" ? " is-active" : ""}`} onClick={() => setView("mcf")}>
                MCF Stats
              </button>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading data…
          </div>
        )}

        {isError && (
          <div className="rm-state rm-state-error">Could not load data. {errorMessage}</div>
        )}

        {!isLoading && !isError && view === "country" && countries.length === 0 && (
          <div className="rm-state">No active country hubs yet.</div>
        )}

        {!isLoading && !isError && view === "country" && countries.length > 0 && (
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconSchool size={20} color="#E8A020" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                Summary by Country
              </h3>
              <span style={{ fontSize: 12, color: "var(--emuted)", marginLeft: "auto" }}>
                Continental total: {continentTotals.totalRecruited} recruited · {continentTotals.totalGraduated} graduated
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {countries.map((c) => {
                const iso2 = resolveIso2({ iso2: c.iso2, flag: c.flag, countryCode: c.countryCode });
                const flagSrc = iso2 ? flagImageUrl(iso2, 40) : "";
                const activePrograms = c.programs.filter((p) => p.status === "active").length;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                      padding: "18px 20px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {flagSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={flagSrc} alt="" width={28} height={20} style={{ borderRadius: 3, objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 22 }}>{c.flag}</span>
                      )}
                      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ewhite)" }}>{c.name}</span>
                      <span style={{ fontSize: 12, color: "var(--emuted)" }}>
                        {c.cohortCount} cohort{c.cohortCount === 1 ? "" : "s"} · {activePrograms} active program
                        {activePrograms === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      <SummaryStat label="Total recruited" value={String(c.totalRecruited)} accent={c.color} icon={<IconUsersGroup size={16} />} />
                      <SummaryStat label="Total graduated" value={String(c.totalGraduated)} accent="#3B8BEB" icon={<IconSchool size={16} />} />
                      <SummaryStat
                        label="% Female"
                        value={c.femalePct != null ? `${c.femalePct}%` : dash}
                        accent="#9B59B6"
                        icon={<IconGenderBigender size={16} />}
                      />
                      <SummaryStat
                        label="PWDs"
                        value={c.pwdTotal != null ? String(c.pwdTotal) : dash}
                        hint={c.pwdTotal != null && c.pwdCoverage < c.cohortCount ? `${c.pwdCoverage} of ${c.cohortCount} cohorts` : undefined}
                        accent="#E8A020"
                        icon={<IconAccessible size={16} />}
                      />
                      <SummaryStat
                        label="Foundation Scholars"
                        value={c.scholarTotal != null ? String(c.scholarTotal) : dash}
                        hint={c.scholarTotal != null && c.scholarCoverage < c.cohortCount ? `${c.scholarCoverage} of ${c.cohortCount} cohorts` : undefined}
                        accent="#2EC27E"
                        icon={<IconAward size={16} />}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && !isError && view === "mcf" && mcfCountries.length === 0 && (
          <div className="rm-state">
            No MCF Stats imported for any hub yet. Country managers import this from their Country
            Stats page&apos;s MCF Stats tab.
          </div>
        )}

        {!isLoading && !isError && view === "mcf" && mcfCountries.length > 0 && (
          <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20, overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <IconSchool size={20} color="#E8A020" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                Mastercard Foundation Stats
              </h3>
            </div>

            <div style={{ minWidth: 900, display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1.1fr 1fr 1fr 0.7fr 0.7fr 1.1fr 1fr",
                  gap: 12,
                  padding: "0 16px",
                  fontSize: 10,
                  color: "var(--emuted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 800,
                }}
              >
                <span>Country</span>
                <span>Class / Cohorts</span>
                <span>Total recruited</span>
                <span>Total graduated</span>
                <span>%F</span>
                <span>PWDs</span>
                <span>Foundation Scholars</span>
                <span>To be recruited</span>
              </div>

              {mcfCountries.map((c) => {
                const iso2 = resolveIso2({ iso2: c.iso2, flag: c.flag, countryCode: c.countryCode });
                const flagSrc = iso2 ? flagImageUrl(iso2, 40) : "";
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.3fr 1.1fr 1fr 1fr 0.7fr 0.7fr 1.1fr 1fr",
                      gap: 12,
                      padding: "14px 16px",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {flagSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={flagSrc} alt="" width={24} height={18} style={{ borderRadius: 3, objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 18 }}>{c.flag}</span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--emuted)" }}>{c.cohortRangeLabel}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: c.color }}>{c.totalRecruited}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>{c.totalGraduated || dash}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)" }}>
                      {c.femalePct != null ? `${c.femalePct}%` : dash}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)" }}>
                      {c.pwdTotal != null ? c.pwdTotal : dash}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)" }}>
                      {c.scholarTotal != null ? c.scholarTotal : dash}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)" }}>
                      {c.toBeRecruited > 0 ? c.toBeRecruited : dash}
                    </span>
                  </div>
                );
              })}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1.1fr 1fr 1fr 0.7fr 0.7fr 1.1fr 1fr",
                  gap: 12,
                  padding: "14px 16px",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.1)",
                  marginTop: 4,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ewhite)" }}>Total</span>
                <span />
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ewhite)" }}>{mcfTotals.totalRecruited}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ewhite)" }}>{mcfTotals.totalGraduated || dash}</span>
                <span />
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>{mcfTotals.pwdTotal || dash}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>{mcfTotals.scholarTotal || dash}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>{mcfTotals.toBeRecruited || dash}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
