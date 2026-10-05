"use client";

import { useQuery } from "@tanstack/react-query";
import {
  IconUsers,
  IconBuildingCommunity,
  IconGlobe,
  IconAccessible,
  IconAward,
  IconGenderBigender,
  IconHome2,
  IconTimeline,
} from "@tabler/icons-react";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { trpc } from "@/utils/trpc";

type BreakdownItem = { name: string; count: number };
type Segment = { key: string; label: string; count: number; color: string };

type Props = {
  tenantId: string;
  accent: string;
  activeFellows: number;
  alumniLeaders: number;
  totalNetwork: number;
};

// Fixed categorical order, validated on the app's dark and light surfaces
// (see .network-aggregate in index.css). "Not specified" is always muted
// so missing data never competes with real categories.
const SERIES = ["var(--agg-1)", "var(--agg-2)", "var(--agg-3)", "var(--agg-4)"];
const MUTED = "var(--agg-muted)";

const STATUS_ORDER = [
  { key: "active", label: "Active", color: SERIES[0]! },
  { key: "alumni", label: "Alumni", color: SERIES[2]! },
  { key: "incoming", label: "Incoming", color: SERIES[3]! },
  { key: "inactive", label: "Left early", color: MUTED },
] as const;

function pctOf(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function countOf(items: BreakdownItem[] | undefined, name: string) {
  return items?.find((item) => item.name === name)?.count ?? 0;
}

/** Orders a breakdown by fixed keys, folding anything else into the muted last segment. */
function segmentsFrom(items: BreakdownItem[], order: { name: string; label: string; color: string }[], restLabel: string): Segment[] {
  const known = new Set(order.map((o) => o.name));
  const rest = items.filter((item) => !known.has(item.name)).reduce((sum, item) => sum + item.count, 0);
  return [
    ...order.map((o) => ({ key: o.name, label: o.label, count: countOf(items, o.name), color: o.color })),
    { key: "__rest", label: restLabel, count: rest, color: MUTED },
  ].filter((segment) => segment.count > 0);
}

function Empty({ message }: { message: string }) {
  return (
    <div className="network-breakdown-empty">
      <div className="network-breakdown-empty-copy">{message}</div>
    </div>
  );
}

/** Part-to-whole as one labelled 100% bar; every value is printed, never colour alone. */
function CompositionBar({ segments, total }: { segments: Segment[]; total: number }) {
  return (
    <div className="agg-composition">
      <div className="agg-bar" role="img" aria-label={segments.map((s) => `${s.label} ${s.count}`).join(", ")}>
        {segments.map((segment) => (
          <span
            key={segment.key}
            className="agg-bar-seg"
            style={{ flexGrow: segment.count, background: segment.color }}
            title={`${segment.label}: ${segment.count} (${pctOf(segment.count, total)}%)`}
          />
        ))}
      </div>
      <ul className="agg-legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="agg-swatch" style={{ background: segment.color }} />
            <span className="agg-legend-label">{segment.label}</span>
            <span className="agg-legend-value">
              {segment.count} <span className="agg-legend-pct">· {pctOf(segment.count, total)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat({ icon, label, value, meta }: { icon: React.ReactNode; label: string; value: string; meta: string }) {
  return (
    <div className="agg-mini">
      <div className="agg-mini-head">
        {icon}
        <span>{label}</span>
      </div>
      <div className="agg-mini-value">{value}</div>
      <div className="agg-mini-meta">{meta}</div>
    </div>
  );
}

export function NetworkAggregateView({ tenantId, accent, activeFellows, alumniLeaders, totalNetwork }: Props) {
  const demographicsQuery = useQuery(trpc.fellows.demographics.queryOptions({ tenantId }));
  const data = demographicsQuery.data;
  const roster = data?.total ?? 0;

  const stats = [
    { label: "Active Fellows", value: activeFellows, accent, icon: <IconUsers size={24} /> },
    { label: "Alumni", value: alumniLeaders, accent: "#9B59B6", icon: <IconBuildingCommunity size={24} /> },
    { label: "Total Network", value: totalNetwork, accent: "#2EC27E", icon: <IconGlobe size={24} /> },
  ];

  const female = countOf(data?.gender, "Female");
  const male = countOf(data?.gender, "Male");
  const pwd = countOf(data?.disability, "Yes");
  const disabilityRecorded = roster - countOf(data?.disability, "Not specified");
  const scholars = data?.scholarFellows ?? 0;
  const idps = data?.idpFellows ?? 0;

  const genderSegments = segmentsFrom(
    data?.gender ?? [],
    [
      { name: "Female", label: "Female", color: SERIES[0]! },
      { name: "Male", label: "Male", color: SERIES[1]! },
      { name: "Other", label: "Other", color: SERIES[3]! },
    ],
    "Not specified",
  );
  const disabilitySegments = segmentsFrom(
    data?.disability ?? [],
    [
      { name: "Yes", label: "With disability", color: SERIES[0]! },
      { name: "No", label: "Without disability", color: SERIES[2]! },
    ],
    "Not recorded",
  );

  const cohortRows = data?.cohortStatus ?? [];
  const largestCohort = Math.max(1, ...cohortRows.map((row) => row.active + row.alumni + row.incoming + row.inactive));
  const statusTotals = STATUS_ORDER.map((s) => ({ ...s, count: cohortRows.reduce((sum, row) => sum + row[s.key], 0) }));

  return (
    <div className="network-aggregate">
      <div className="network-aggregate-stats">
        {stats.map((item) => (
          <div key={item.label} className="gc network-aggregate-stat">
            <div
              className="network-aggregate-stat-icon"
              style={{ background: `${item.accent}15`, borderColor: `${item.accent}30`, color: item.accent }}
            >
              {item.icon}
            </div>
            <div>
              <div className="network-aggregate-stat-label">{item.label}</div>
              <div className="network-aggregate-stat-value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {demographicsQuery.isLoading ? (
        <CountrySectionSkeleton accent={accent} />
      ) : roster === 0 ? (
        <Empty message="Once country managers add or import fellows, gender, disability, scholar and cohort breakdowns appear here — aggregate only, no names." />
      ) : (
        <>
          <section className="gc network-aggregate-section">
            <div className="network-aggregate-section-head">
              <IconAward size={18} style={{ color: "#E8A020" }} />
              <div>
                <h3>Mastercard Foundation scholars</h3>
                <p>Fellows individually designated MCF scholars on the roster — aggregate count only.</p>
              </div>
            </div>
            <div className="agg-meter-row">
              <div className="agg-hero">
                {scholars}
                <span>MCF scholars</span>
              </div>
              <div className="agg-meter-wrap">
                <div className="agg-meter" title={`${scholars} of ${roster} fellows (${pctOf(scholars, roster)}%)`}>
                  <span style={{ width: `${pctOf(scholars, roster)}%` }} />
                </div>
                <div className="agg-meter-caption">
                  <strong>{pctOf(scholars, roster)}%</strong> of {roster} fellows on the roster
                </div>
              </div>
            </div>
          </section>

          <section className="gc network-aggregate-section">
            <div className="network-aggregate-section-head">
              <IconGenderBigender size={18} style={{ color: accent }} />
              <div>
                <h3>Inclusion</h3>
                <p>Across all {roster} fellows on the roster.</p>
              </div>
            </div>
            <div className="agg-mini-row">
              <MiniStat
                icon={<IconGenderBigender size={16} />}
                label="Female"
                value={female + male > 0 ? `${pctOf(female, female + male)}%` : "—"}
                meta={`${female} women · ${male} men`}
              />
              <MiniStat
                icon={<IconAccessible size={16} />}
                label="With disability"
                value={disabilityRecorded > 0 ? String(pwd) : "—"}
                meta={disabilityRecorded > 0 ? `${pctOf(pwd, disabilityRecorded)}% of ${disabilityRecorded} recorded` : "Not recorded yet"}
              />
              <MiniStat
                icon={<IconHome2 size={16} />}
                label="Internally displaced"
                value={String(idps)}
                meta={`${pctOf(idps, roster)}% of the roster`}
              />
            </div>
          </section>

          <div className="network-aggregate-split">
            <section className="gc network-aggregate-section">
              <h3>Gender</h3>
              {genderSegments.length === 0 ? <Empty message="No gender recorded yet." /> : <CompositionBar segments={genderSegments} total={roster} />}
            </section>
            <section className="gc network-aggregate-section">
              <h3>Disability</h3>
              {disabilitySegments.length === 0 ? (
                <Empty message="No disability status recorded yet." />
              ) : (
                <CompositionBar segments={disabilitySegments} total={roster} />
              )}
            </section>
          </div>

          <section className="gc network-aggregate-section">
            <div className="network-aggregate-section-head">
              <IconTimeline size={18} style={{ color: accent }} />
              <div>
                <h3>Fellows by cohort</h3>
                <p>Each cohort year split by where its fellows are now.</p>
              </div>
            </div>
            {cohortRows.length === 0 ? (
              <Empty message="Cohort year on each fellow drives this chart." />
            ) : (
              <>
                <ul className="agg-legend agg-legend-inline">
                  {statusTotals
                    .filter((s) => s.count > 0)
                    .map((s) => (
                      <li key={s.key}>
                        <span className="agg-swatch" style={{ background: s.color }} />
                        <span className="agg-legend-label">{s.label}</span>
                        <span className="agg-legend-value">{s.count}</span>
                      </li>
                    ))}
                </ul>
                <div className="agg-cohorts">
                  {cohortRows.map((row) => {
                    const total = row.active + row.alumni + row.incoming + row.inactive;
                    return (
                      <div key={row.year} className="agg-cohort">
                        <span className="agg-cohort-year">{row.year}</span>
                        <div className="agg-cohort-track">
                          <div className="agg-bar" style={{ width: `${(total / largestCohort) * 100}%` }}>
                            {STATUS_ORDER.filter((s) => row[s.key] > 0).map((s) => (
                              <span
                                key={s.key}
                                className="agg-bar-seg"
                                style={{ flexGrow: row[s.key], background: s.color }}
                                title={`${row.year} · ${s.label}: ${row[s.key]}`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="agg-cohort-total">{total}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
