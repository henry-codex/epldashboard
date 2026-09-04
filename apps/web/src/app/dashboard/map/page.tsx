"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import AfricaMap, { type FellowCountry } from "@/components/epl/AfricaMap";
import { useHomePath } from "@/hooks/use-home-path";
import { isCountryWorkspaceRole } from "@/lib/home-path";
import { trpc } from "@/utils/trpc";
import { flagImageUrl, iso2ToNumeric, resolveIso2 } from "@/lib/world-countries";
import { IconChevronRight, IconLoader2 } from "@tabler/icons-react";

type MapCountry = {
  id: string;
  name: string;
  flag: string;
  iso2: string;
  color: string;
  activeFellows: number;
  alumniLeaders: number;
  institutions: number;
  numericId: number | null;
};

export default function MapPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();
  const overviewQuery = useQuery({
    ...trpc.platform.overview.queryOptions(),
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

  const countries = useMemo<MapCountry[]>(() => {
    return (overviewQuery.data?.countries ?? []).map((c) => {
      const iso2 = resolveIso2({ countryCode: c.countryCode, flag: c.flag, iso2: c.iso2 });
      return {
        id: c.id,
        name: c.name,
        flag: c.flag,
        iso2,
        color: c.color,
        activeFellows: c.activeFellows,
        alumniLeaders: c.alumniLeaders,
        institutions: c.institutions,
        numericId: iso2ToNumeric(iso2),
      };
    });
  }, [overviewQuery.data?.countries]);

  const mapData: FellowCountry[] = useMemo(
    () =>
      countries
        .filter((c) => c.numericId != null)
        .map((c) => ({
          countryId: c.numericId!,
          name: c.name,
          fellows: c.activeFellows,
          alumni: c.alumniLeaders,
          institutions: c.institutions,
          cohort: "",
          color: c.color,
        })),
    [countries],
  );

  const idByNumeric = useMemo(
    () => new Map(countries.filter((c) => c.numericId != null).map((c) => [c.numericId!, c.id])),
    [countries],
  );

  if (isPending || !session?.user || home.isLoading || isCountryWorkspaceRole(home.role)) {
    return null;
  }

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  function handleCountryClick(fc: FellowCountry) {
    const id = idByNumeric.get(fc.countryId);
    if (id) router.push(`/dashboard/countries/${id}`);
  }

  return (
    <AppShell
      activePage="map"
      pageTitle="Map"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Map" }]}
      user={user}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--ewhite)",
                fontFamily: "var(--font)",
                letterSpacing: "-0.02em",
              }}
            >
              Network Map
            </div>
            <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 3 }}>
              Total Network — active fellows and alumni leaders. Click a country for detail.
            </div>
          </div>
          {!overviewQuery.isLoading && countries.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {countries.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(`/dashboard/countries/${c.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--emuted)",
                    fontSize: 11,
                    fontFamily: "var(--font)",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = c.color)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--emuted)")}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: c.color,
                      boxShadow: `0 0 6px ${c.color}50`,
                    }}
                  />
                  {c.iso2 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={flagImageUrl(c.iso2, 20)}
                      alt=""
                      width={16}
                      height={12}
                      style={{ borderRadius: 2, objectFit: "cover" }}
                    />
                  ) : (
                    c.flag && <span>{c.flag}</span>
                  )}
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {overviewQuery.isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading network map…
          </div>
        )}

        {overviewQuery.isError && (
          <div className="rm-state rm-state-error">
            Could not load map data. {overviewQuery.error.message}
          </div>
        )}

        {!overviewQuery.isLoading && !overviewQuery.isError && (
          <>
            <div className="gc" style={{ padding: 0, overflow: "hidden", borderRadius: "var(--r3)" }}>
              <AfricaMap data={mapData} height={560} onCountryClick={handleCountryClick} />
            </div>

            {countries.length === 0 ? (
              <div className="rm-state">
                No active country hubs yet. Add a country hub to see it on the map.
              </div>
            ) : (
              <section
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                {countries.map((c) => {
                  const flagSrc = c.iso2 ? flagImageUrl(c.iso2, 40) : "";
                  return (
                    <div
                      key={c.id}
                      className="gc"
                      onClick={() => router.push(`/dashboard/countries/${c.id}`)}
                      style={{
                        padding: "16px 18px",
                        cursor: "pointer",
                        transition: "border-color 0.2s, transform 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = `${c.color}40`;
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "";
                        (e.currentTarget as HTMLDivElement).style.transform = "";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        {flagSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={flagSrc}
                            alt=""
                            width={22}
                            height={16}
                            style={{ borderRadius: 3, objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: 22 }}>{c.flag}</span>
                        )}
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--ewhite)",
                            fontFamily: "var(--font)",
                          }}
                        >
                          {c.name}
                        </div>
                        <IconChevronRight size={12} style={{ color: "var(--emuted)", marginLeft: "auto" }} />
                      </div>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: c.color,
                              fontFamily: "var(--font)",
                            }}
                          >
                            {c.activeFellows}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                            Fellows
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "var(--ewhite)",
                              fontFamily: "var(--font)",
                            }}
                          >
                            {c.alumniLeaders}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                            Alumni
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "var(--ewhite)",
                              fontFamily: "var(--font)",
                            }}
                          >
                            {c.institutions}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                            Inst.
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
