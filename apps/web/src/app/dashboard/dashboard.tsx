"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { MapCard } from "@/components/epl/map-card";
import { useHomePath } from "@/hooks/use-home-path";
import { trpc } from "@/utils/trpc";
import { flagImageUrl, iso2ToNumeric, resolveIso2 } from "@/lib/world-countries";
import {
  IconUsers,
  IconBuildingCommunity,
  IconSchool,
  IconChevronRight,
  IconCircleCheck,
  IconAlertTriangle,
  IconClock,
  IconGlobe,
  IconLoader2,
} from "@tabler/icons-react";

type OverviewCountry = {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  iso2: string;
  flag: string;
  color: string;
  activeFellows: number;
  alumniLeaders: number;
  totalNetwork: number;
  placed: number;
  placementRate: number | null;
  institutions: number;
  checkInRate: number | null;
  programHealth: {
    totalPrograms: number;
    activePrograms: number;
    onTrack: number;
    needsAttention: number;
    atRisk: number;
  };
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function KPIStat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className="gc"
      style={{
        padding: "18px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: accent,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--emuted)",
            fontFamily: "var(--font)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--ewhite)",
            fontFamily: "var(--font)",
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 3 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function CountryRow({ country, onClick }: { country: OverviewCountry; onClick: () => void }) {
  const iso2 = resolveIso2({
    countryCode: country.countryCode,
    flag: country.flag,
    iso2: country.iso2,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="gc"
      style={{
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: "1.6fr 0.9fr 0.9fr 0.8fr 32px",
        alignItems: "center",
        gap: 6,
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "border-color 0.2s, background 0.2s",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${country.color}40`;
        e.currentTarget.style.background = `${country.color}08`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 24,
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.12)",
            flexShrink: 0,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {iso2 ? (
            <img
              src={flagImageUrl(iso2, 80)}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            {country.name}
          </div>
          <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            {country.institutions} institutions
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          {country.activeFellows}
        </div>
        <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Active Fellows</div>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          {country.alumniLeaders}
        </div>
        <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Alumni</div>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          {country.totalNetwork}
        </div>
        <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Total</div>
      </div>

      <IconChevronRight size={16} style={{ color: "rgba(255,255,255,0.25)" }} />
    </button>
  );
}

function OverviewSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
      <div className="rm-state">
        <IconLoader2 size={18} className="animate-spin" />
        Loading continental overview…
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();
  const overviewQuery = useQuery({
    ...trpc.platform.overview.queryOptions(),
    enabled: Boolean(session?.user) && !home.isLoading && home.path === "/dashboard",
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (!session?.user || home.isLoading) return;
    if (home.path !== "/dashboard") {
      router.replace(home.path as never);
    }
  }, [session, home.isLoading, home.path, router]);

  if (isPending || (session?.user && home.isLoading)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05142a",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "2px solid rgba(59,139,235,0.6)",
              borderTopColor: "#3B8BEB",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Loading dashboard…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session?.user) return null;

  if (home.path !== "/dashboard") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05142a",
          color: "rgba(255,255,255,0.45)",
          fontSize: 13,
        }}
      >
        Opening your country hub…
      </div>
    );
  }

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  const countries = (overviewQuery.data?.countries ?? []) as OverviewCountry[];
  const totals = overviewQuery.data?.totals;
  const ph = totals?.programHealth ?? { onTrack: 0, needsAttention: 0, atRisk: 0, total: 0 };
  const mapCountries = countries.map((c) => {
    const iso2 = resolveIso2({ countryCode: c.countryCode, flag: c.flag, iso2: c.iso2 });
    return {
      id: c.id,
      name: c.name,
      color: c.color,
      activeFellows: c.activeFellows,
      alumniLeaders: c.alumniLeaders,
      institutions: c.institutions,
      numericId: iso2ToNumeric(iso2),
    };
  });

  return (
    <AppShell
      activePage="overview"
      pageTitle="Overview"
      breadcrumbs={[{ label: "Dashboard" }]}
      user={user}
    >
      <div className="anim-page" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <section>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ewhite)",
                  fontFamily: "var(--font)",
                  letterSpacing: "-0.02em",
                }}
              >
                Good {getGreeting()}, {user?.name?.split(" ")[0] ?? "Admin"} 👋
              </div>
              <div style={{ fontSize: 12, color: "var(--emuted)", marginTop: 4, fontFamily: "var(--font)" }}>
                Continental overview —{" "}
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {overviewQuery.isFetching && !overviewQuery.isLoading ? (
                <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                  Syncing…
                </span>
              ) : null}
              <button type="button" className="epl-btn" style={{ padding: "7px 14px", fontSize: 11 }}>
                Export Report
              </button>
            </div>
          </div>
        </section>

        {overviewQuery.isLoading ? <OverviewSkeleton /> : null}

        {overviewQuery.isError ? (
          <div className="rm-state rm-state-error">
            Couldn’t load platform overview. Try refreshing the page.
          </div>
        ) : null}

        {!overviewQuery.isLoading && !overviewQuery.isError && totals ? (
          <>
            <section className="anim-in" style={{ animationDelay: "0.1s" }}>
              <div
                className="gc"
                style={{
                  height: 200,
                  borderRadius: 24,
                  overflow: "hidden",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 40px",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.30)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "url('/Screenshot 2026-04-01 171412.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center 20%",
                    animation: "heroZoom 30s infinite alternate linear",
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(90deg, rgba(8, 12, 28, 0.94) 0%, rgba(8, 12, 28, 0.60) 40%, rgba(8, 12, 28, 0.20) 100%)",
                    zIndex: 2,
                  }}
                />
                <div style={{ position: "relative", zIndex: 3, maxWidth: 480 }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: 100,
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.20)",
                      fontSize: 10,
                      color: "#fff",
                      fontWeight: 700,
                      marginBottom: 12,
                      fontFamily: "var(--font)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    EPL Global
                  </div>
                  <h2
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#fff",
                      margin: 0,
                      lineHeight: 1.1,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    Empowering the next generation <br /> of Global public servants.
                  </h2>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.70)",
                      marginTop: 12,
                      lineHeight: 1.5,
                      maxWidth: 380,
                    }}
                  >
                    {totals.totalNetwork} people across the Total Network — {totals.activeFellows} active
                    fellows and {totals.alumniLeaders} alumni leaders in {totals.countries}{" "}
                    {totals.countries === 1 ? "country" : "countries"}.
                  </p>
                </div>
              </div>
              <style>{`
                @keyframes heroZoom {
                  from { transform: scale(1); }
                  to { transform: scale(1.1); }
                }
              `}</style>
            </section>

            <section
              className="anim-stagger"
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}
            >
              <KPIStat
                icon={<IconUsers size={20} />}
                label="Active Fellows"
                value={totals.activeFellows}
                sub={`Across ${totals.countries} ${totals.countries === 1 ? "country" : "countries"}`}
                accent="#3B8BEB"
              />
              <KPIStat
                icon={<IconBuildingCommunity size={20} />}
                label="Alumni"
                value={totals.alumniLeaders}
                sub="Network alumni total"
                accent="#9B59B6"
              />
              <KPIStat
                icon={<IconGlobe size={20} />}
                label="Total Network"
                value={totals.totalNetwork}
                sub="Active fellows + alumni"
                accent="#2EC27E"
              />
              <KPIStat
                icon={<IconSchool size={20} />}
                label="Institutions"
                value={totals.institutions}
                sub="Active placement institutions"
                accent="#E8A020"
              />
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
              <MapCard
                countries={mapCountries}
                totalNetwork={totals.totalNetwork}
                onCountryClick={(id) => router.push(`/dashboard/countries/${id}` as never)}
              />

              <div
                className="gc"
                style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ewhite)",
                        fontFamily: "var(--font)",
                      }}
                    >
                      Country Programs
                    </div>
                    <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                      Click a country for detailed breakdown
                    </div>
                  </div>
                  <button
                    type="button"
                    className="epl-btn"
                    style={{ padding: "5px 12px", fontSize: 10 }}
                    onClick={() => router.push("/dashboard/countries")}
                  >
                    View All <IconChevronRight size={12} />
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 0.9fr 0.9fr 0.8fr 32px",
                    gap: 6,
                    padding: "0 18px",
                    fontSize: 9,
                    color: "rgba(255,255,255,0.30)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontFamily: "var(--font)",
                  }}
                >
                  <span>Country</span>
                  <span>Active Fellows</span>
                  <span>Alumni</span>
                  <span>Total</span>
                  <span />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {countries.length === 0 ? (
                    <div
                      style={{
                        padding: "28px 18px",
                        textAlign: "center",
                        fontSize: 13,
                        color: "var(--emuted)",
                        fontFamily: "var(--font)",
                      }}
                    >
                      No active country hubs yet. Add a tenant to see continental metrics.
                    </div>
                  ) : (
                    countries.map((c) => (
                      <CountryRow
                        key={c.id}
                        country={c}
                        onClick={() => router.push(`/dashboard/countries/${c.id}` as never)}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, maxWidth: 480 }}>
              <div className="gc" style={{ padding: "18px 20px" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ewhite)",
                    fontFamily: "var(--font)",
                    marginBottom: 14,
                  }}
                >
                  Program Health
                </div>
                {ph.total === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                    No programs across hubs yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      {
                        label: "On Track",
                        count: ph.onTrack,
                        total: ph.total,
                        color: "#2EC27E",
                        icon: <IconCircleCheck size={14} />,
                      },
                      {
                        label: "Needs Attention",
                        count: ph.needsAttention,
                        total: ph.total,
                        color: "#E8A020",
                        icon: <IconClock size={14} />,
                      },
                      {
                        label: "At Risk",
                        count: ph.atRisk,
                        total: ph.total,
                        color: "#E05C5C",
                        icon: <IconAlertTriangle size={14} />,
                      },
                    ].map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ color: s.color, display: "flex" }}>{s.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <span style={{ fontSize: 11, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                              {s.label}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: s.color,
                                fontFamily: "var(--font)",
                              }}
                            >
                              {s.count}/{s.total}
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: 4,
                              borderRadius: 2,
                              background: "rgba(255,255,255,0.06)",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round((s.count / Math.max(s.total, 1)) * 100)}%`,
                                height: "100%",
                                borderRadius: 2,
                                background: s.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
