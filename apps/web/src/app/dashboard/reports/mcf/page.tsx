"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportLayout } from "@/components/epl/report-layout";
import {
  IconLoader2,
  IconUsersGroup,
  IconSchool,
  IconGenderBigender,
  IconAccessible,
  IconAward,
  IconTarget,
} from "@tabler/icons-react";
import { trpc } from "@/utils/trpc";
import { resolveIso2 } from "@/lib/world-countries";
import { CountryFlag } from "@/components/epl/country-flag";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const dash = "—";

const chartTooltipStyle = {
  background: "rgba(4,12,38,0.9)",
  backdropFilter: "blur(10px)",
  border: "1px solid var(--gborder)",
  borderRadius: 12,
  color: "var(--ewhite)",
};

function femalePctFor(r: { maleCount: number | null; femaleCount: number | null }) {
  if (r.maleCount == null || r.femaleCount == null || r.maleCount + r.femaleCount === 0) return null;
  return Math.round((r.femaleCount / (r.maleCount + r.femaleCount)) * 100);
}

function SummaryTile({
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
        padding: "14px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flex: "1 1 150px",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
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
        <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 3 }}>{label}</div>
        {hint && <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)", opacity: 0.75 }}>{hint}</div>}
      </div>
    </div>
  );
}

function CountryMcfBreakdown({ tenantId, accent }: { tenantId: string; accent: string }) {
  const mcfQuery = useQuery(trpc.cohorts.mcfStats.queryOptions({ tenantId }));

  if (mcfQuery.isLoading) {
    return (
      <div className="rm-state" style={{ padding: "16px 0" }}>
        <IconLoader2 size={16} className="animate-spin" /> Loading MCF Stats…
      </div>
    );
  }

  const rows = [...(mcfQuery.data?.items ?? [])].sort((a, b) => (a.cohortYear ?? 0) - (b.cohortYear ?? 0));

  if (rows.length === 0) {
    return (
      <div className="rm-state" style={{ padding: "16px 0", fontSize: 13 }}>
        No MCF Stats imported for this hub yet. Import it from the hub&apos;s Country Stats page, MCF
        Stats tab.
      </div>
    );
  }

  const chartData = rows.map((r) => ({ name: r.label, Recruited: r.startedCount ?? 0, Graduated: r.graduatedCount ?? 0 }));
  const genderData = rows
    .filter((r) => r.maleCount != null && r.femaleCount != null && r.maleCount + r.femaleCount > 0)
    .map((r) => ({ name: r.label, Male: r.maleCount, Female: r.femaleCount }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, overflowX: "auto" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          Cohort Breakdown
        </div>
        <div style={{ minWidth: 760, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1.2fr 0.7fr 0.9fr 0.9fr 0.8fr 0.7fr 0.9fr 0.8fr", gap: 10, padding: "0 8px",
            fontSize: 9, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--font)",
          }}>
            <span>Cohort</span><span>Year</span><span>Recruited</span><span>Graduated</span>
            <span>Female %</span><span>PWDs</span><span>Scholars</span><span>Rate</span>
          </div>
          {rows.map((r) => {
            const femalePct = femalePctFor(r);
            const graduated = r.graduatedCount ?? 0;
            return (
              <div key={r.id} style={{
                display: "grid", gridTemplateColumns: "1.2fr 0.7fr 0.9fr 0.9fr 0.8fr 0.7fr 0.9fr 0.8fr", gap: 10, padding: "10px 8px",
                background: "var(--eglass)", borderRadius: 8, border: "1px solid var(--eborder)", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: accent, fontFamily: "var(--font)" }}>{r.label}</span>
                <span style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>{r.cohortYear ?? dash}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{r.startedCount ?? dash}</span>
                <span style={{ fontSize: 12, fontWeight: 500, fontFamily: "var(--font)", color: graduated > 0 ? "var(--ewhite)" : "var(--emuted)" }}>
                  {graduated > 0 ? graduated : r.status === "completed" ? "Completed" : "In progress"}
                </span>
                <span style={{ fontSize: 12, color: femalePct != null ? "var(--ewhite)" : "var(--emuted)", fontFamily: "var(--font)" }}>
                  {femalePct != null ? `${femalePct}%` : dash}
                </span>
                <span style={{ fontSize: 12, color: r.pwdCount != null ? "var(--ewhite)" : "var(--emuted)", fontFamily: "var(--font)" }}>
                  {r.pwdCount ?? dash}
                </span>
                <span style={{ fontSize: 12, color: r.scholarCount != null ? "var(--ewhite)" : "var(--emuted)", fontFamily: "var(--font)" }}>
                  {r.scholarCount ?? dash}
                </span>
                <span style={{ fontSize: 12, color: r.attritionRatePercent != null ? "var(--ewhite)" : "var(--emuted)", fontFamily: "var(--font)" }}>
                  {r.attritionRatePercent != null ? `${r.attritionRatePercent}%` : dash}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gc" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          Recruited vs Graduated by Cohort
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "var(--emuted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--emuted)", fontSize: 10 }} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="Recruited" fill={accent} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Graduated" fill="#3B8BEB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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

export default function ReportsMcfPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mcfQuery = useQuery(trpc.platform.mcfSummary.queryOptions());

  const countries = mcfQuery.data?.countries ?? [];

  useEffect(() => {
    if (!selectedId && countries.length > 0) setSelectedId(countries[0]!.id);
  }, [selectedId, countries]);

  const c = countries.find((country) => country.id === selectedId) ?? countries[0];

  return (
    <ReportLayout activePage="mcf" pageTitle="MCF Stats">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 60 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>
            Mastercard Foundation Stats
          </h1>
          <p style={{ fontSize: 16, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 720 }}>
            Pick a country to see the Foundation&apos;s own reported slice — recruitment, graduation,
            and inclusion, cohort by cohort. Summed from each hub&apos;s MCF Stats import, not the
            country-wide totals.
          </p>
        </div>

        {mcfQuery.isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading MCF data…
          </div>
        )}

        {mcfQuery.isError && (
          <div className="rm-state rm-state-error">Could not load MCF data. {mcfQuery.error.message}</div>
        )}

        {!mcfQuery.isLoading && !mcfQuery.isError && countries.length === 0 && (
          <div className="rm-state">
            No hub has imported MCF Stats yet. Country managers import this from their Country Stats
            page&apos;s MCF Stats tab.
          </div>
        )}

        {!mcfQuery.isLoading && !mcfQuery.isError && countries.length > 0 && c && (
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

            <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 22 }}>
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
                    {c.cohortRangeLabel} · {c.cohortCount} cohort{c.cohortCount === 1 ? "" : "s"} reporting
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <SummaryTile label="Total recruited" value={String(c.totalRecruited)} accent={c.color} icon={<IconUsersGroup size={16} />} />
                <SummaryTile label="Total graduated" value={c.totalGraduated > 0 ? String(c.totalGraduated) : dash} accent="#3B8BEB" icon={<IconSchool size={16} />} />
                <SummaryTile label="% Female" value={c.femalePct != null ? `${c.femalePct}%` : dash} accent="#9B59B6" icon={<IconGenderBigender size={16} />} />
                <SummaryTile
                  label="PWDs"
                  value={c.pwdTotal != null ? String(c.pwdTotal) : dash}
                  hint={c.pwdTotal != null && c.pwdCoverage < c.cohortCount ? `${c.pwdCoverage} of ${c.cohortCount} cohorts` : undefined}
                  accent="#E8A020"
                  icon={<IconAccessible size={16} />}
                />
                <SummaryTile
                  label="Foundation Scholars"
                  value={c.scholarTotal != null ? String(c.scholarTotal) : dash}
                  hint={c.scholarTotal != null && c.scholarCoverage < c.cohortCount ? `${c.scholarCoverage} of ${c.cohortCount} cohorts` : undefined}
                  accent="#2EC27E"
                  icon={<IconAward size={16} />}
                />
                {c.toBeRecruited > 0 && (
                  <SummaryTile label="To be recruited" value={String(c.toBeRecruited)} accent={c.color} icon={<IconTarget size={16} />} />
                )}
              </div>

              <CountryMcfBreakdown tenantId={c.id} accent={c.color} />
            </div>
          </>
        )}
      </div>
    </ReportLayout>
  );
}
