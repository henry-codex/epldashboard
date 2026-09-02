"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { SlidePanel } from "@/components/epl/slide-panel";
import {
  IconSchool,
  IconActivity,
  IconWorld,
  IconUsers,
  IconLoader2,
  IconMapPin,
  IconCalendarEvent,
  IconTarget,
  IconCircleCheck,
  IconAlertTriangle,
  IconClock,
  IconArrowRight,
} from "@tabler/icons-react";
import { useHomePath } from "@/hooks/use-home-path";
import { isCountryWorkspaceRole } from "@/lib/home-path";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";
import { trpc } from "@/utils/trpc";

function formatCommencement(startYear: number | null | undefined) {
  if (!startYear) return "—";
  return String(startYear);
}

function formatIntake(activeFellows: number, targetFellows: number) {
  if (targetFellows > 0) return `${activeFellows} / ${targetFellows}`;
  return String(activeFellows);
}

function formatRate(value: number | null | undefined) {
  return value == null ? "Pending" : `${value}%`;
}

function ProgramFlag({
  iso2,
  countryCode,
  flag,
  color,
  size = 40,
}: {
  iso2: string;
  countryCode: string;
  flag: string;
  color: string;
  size?: number;
}) {
  const code = resolveIso2({ iso2, countryCode, flag });
  const src = code ? flagImageUrl(code, 80) : "";
  const fallback = (code || countryCode || "?").slice(0, 2).toUpperCase();
  const height = Math.round(size * 0.7);

  return (
    <span
      className="rm-cp-flag"
      style={{
        width: size,
        height,
        borderRadius: 6,
        border: `1px solid ${color}40`,
        boxShadow: `0 6px 16px -8px ${color}80`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={height} />
      ) : (
        <span
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 800,
            color: "var(--ewhite)",
            fontFamily: "var(--font)",
          }}
        >
          {fallback}
        </span>
      )}
    </span>
  );
}

function statusPillClass(status: string) {
  if (status === "active") return "nm-status-pill is-active";
  if (status === "completed") return "nm-status-pill is-alumni";
  return "nm-status-pill is-inactive";
}

function healthPillClass(health: string) {
  if (health === "on_track") return "pm-health-pill is-on-track";
  if (health === "needs_attention") return "pm-health-pill is-needs-attention";
  if (health === "at_risk") return "pm-health-pill is-at-risk";
  if (health === "completed") return "pm-health-pill is-completed";
  return "pm-health-pill is-getting-started";
}

function healthIcon(health: string) {
  if (health === "on_track" || health === "completed") return <IconCircleCheck size={13} />;
  if (health === "needs_attention" || health === "getting_started") return <IconClock size={13} />;
  return <IconAlertTriangle size={13} />;
}

export default function ProgramsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const portfolioQuery = useQuery({
    ...trpc.platform.programPortfolio.queryOptions(),
    enabled: Boolean(session?.user) && !home.isLoading && home.role === "super_admin",
  });

  const programs = portfolioQuery.data?.programs ?? [];
  const selected = programs.find((p) => p.id === selectedId) ?? null;

  const detailQuery = useQuery({
    ...trpc.programs.list.queryOptions({ tenantId: selected?.tenantId ?? "" }),
    enabled: Boolean(selected?.tenantId),
  });
  const detail = detailQuery.data?.items.find((item) => item.id === selected?.id);

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (home.isLoading) return;
    if (isCountryWorkspaceRole(home.role)) {
      router.replace(home.path as never);
    }
  }, [home.isLoading, home.path, home.role, router]);

  if (isPending || !session?.user || home.isLoading || isCountryWorkspaceRole(home.role)) {
    return null;
  }

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  const totals = portfolioQuery.data?.totals;

  return (
    <AppShell
      activePage="programs"
      pageTitle="Programs Portfolio"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Programs" }]}
      user={user}
    >
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
            Programs across hubs
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--emuted)",
              fontFamily: "var(--font)",
              maxWidth: 640,
            }}
          >
            All fellowship tracks by country — click a card for details.
          </p>
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

        {!portfolioQuery.isLoading && !portfolioQuery.isError && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                {
                  label: "Tracks",
                  value: totals?.totalTracks ?? 0,
                  color: "#3B8BEB",
                  icon: <IconSchool size={18} />,
                },
                {
                  label: "Active",
                  value: totals?.activeCycles ?? 0,
                  color: "#2EC27E",
                  icon: <IconActivity size={18} />,
                },
                {
                  label: "Intake",
                  value: totals?.totalIntake ?? 0,
                  color: "#9B59B6",
                  icon: <IconUsers size={18} />,
                },
                {
                  label: "Nations",
                  value: totals?.partnerNations ?? 0,
                  color: "#E8A020",
                  icon: <IconWorld size={18} />,
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
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--emuted)",
                        fontFamily: "var(--font)",
                        marginTop: 3,
                      }}
                    >
                      {k.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {programs.length === 0 ? (
              <div className="rm-state">
                No programs yet. Country managers can add programs from their hub&apos;s Programs
                page.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {programs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="gc"
                    style={{
                      padding: "14px 16px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      textAlign: "left",
                      fontFamily: "var(--font)",
                      border: selectedId === p.id ? `1px solid ${p.country.color}55` : "1px solid transparent",
                      background: "var(--eglass)",
                    }}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <ProgramFlag
                          iso2={p.country.iso2}
                          countryCode={p.country.countryCode}
                          flag={p.country.flag}
                          color={p.country.color}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: "var(--ewhite)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {p.title}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 600, marginTop: 2 }}>
                            {p.country.name}
                          </div>
                        </div>
                      </div>
                      <span className={statusPillClass(p.status)}>{p.status}</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        fontSize: 12,
                        color: "var(--emuted)",
                      }}
                    >
                      <span>
                        <strong style={{ color: "var(--ewhite)", fontWeight: 700 }}>
                          {formatIntake(p.activeFellows, p.targetFellows)}
                        </strong>{" "}
                        fellows
                      </span>
                      <span>Started {formatCommencement(p.startYear)}</span>
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--emuted)",
                          marginBottom: 6,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        <span>Fill</span>
                        <span style={{ color: p.country.color }}>{p.progress}%</span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          borderRadius: 3,
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${p.progress}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: p.country.color,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <SlidePanel
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.title ?? "Program"}
        description={selected ? `${selected.country.name} · ${selected.status}` : undefined}
        width={520}
        footer={
          selected ? (
            <div className="epl-slide-actions">
              <button type="button" className="rm-ghost" onClick={() => setSelectedId(null)}>
                Close
              </button>
              <button
                type="button"
                className="rm-primary"
                onClick={() => router.push(`/dashboard/countries/${selected.tenantId}/programs` as never)}
              >
                Open country hub <IconArrowRight size={15} />
              </button>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="rm-panel-form">
            <section className="rm-panel-section">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <ProgramFlag
                  iso2={selected.country.iso2}
                  countryCode={selected.country.countryCode}
                  flag={selected.country.flag}
                  color={selected.country.color}
                  size={48}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)" }}>
                    {selected.country.name}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <span className={statusPillClass(selected.status)}>{selected.status}</span>
                    {detail?.healthLabel ? (
                      <span className={healthPillClass(detail.health)}>
                        {healthIcon(detail.health)}
                        {detail.healthLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", lineHeight: 1.55 }}>
                {detailQuery.isLoading
                  ? "Loading details…"
                  : detail?.description || selected.description || "No description yet."}
              </p>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconTarget size={16} /> Intake
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Active fellows", value: detail?.activeFellows ?? selected.activeFellows },
                  { label: "Target", value: detail?.targetFellows ?? selected.targetFellows },
                  { label: "Alumni", value: detail?.alumniFellows ?? selected.alumniFellows },
                  { label: "Total network", value: detail?.totalFellows ?? selected.totalFellows },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--eborder)",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)" }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: "var(--emuted)", marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconCalendarEvent size={16} /> Cycle
              </div>
              <div className="epl-slide-field">
                <span>Commencement</span>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>
                  {formatCommencement(detail?.startYear ?? selected.startYear)}
                </div>
              </div>
              <div className="epl-slide-field">
                <span>Fill against target</span>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "var(--emuted)" }}>Progress</span>
                  <span style={{ color: selected.country.color, fontWeight: 700 }}>
                    {detail?.fillRate ?? selected.progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${detail?.fillRate ?? selected.progress}%`,
                      height: "100%",
                      background: selected.country.color,
                    }}
                  />
                </div>
              </div>
              <div className="epl-slide-field">
                <span>
                  <IconMapPin size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                  Retention
                </span>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>
                  {detailQuery.isLoading ? "…" : formatRate(detail?.placementRate)}
                </div>
              </div>
            </section>

            {detail &&
              detail.healthReasons.filter((reason) => !/check-?in/i.test(reason)).length > 0 && (
                <section className="rm-panel-section">
                  <div className="rm-panel-section-head">Health notes</div>
                  <ul
                    className={`pm-health-reasons${
                      detail.health === "at_risk"
                        ? " is-danger"
                        : detail.health === "needs_attention" || detail.health === "getting_started"
                          ? " is-warning"
                          : ""
                    }`}
                  >
                    {detail.healthReasons
                      .filter((reason) => !/check-?in/i.test(reason))
                      .slice(0, 4)
                      .map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                  </ul>
                </section>
              )}
          </div>
        ) : null}
      </SlidePanel>
    </AppShell>
  );
}
