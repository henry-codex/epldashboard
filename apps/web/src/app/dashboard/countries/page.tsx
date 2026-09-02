"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { trpc } from "@/utils/trpc";
import { useHomePath } from "@/hooks/use-home-path";
import { isCountryWorkspaceRole } from "@/lib/home-path";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";
import {
  IconChevronRight,
  IconLoader2,
  IconMapPin,
  IconWorld,
} from "@tabler/icons-react";

export default function CountriesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();
  const listQuery = useQuery(trpc.tenants.list.queryOptions());

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (home.isLoading) return;
    if (isCountryWorkspaceRole(home.role)) {
      router.replace(home.path as never);
    }
  }, [home.isLoading, home.path, home.role, router]);

  const countries = useMemo(
    () => (listQuery.data ?? []).filter((c) => c.isActive),
    [listQuery.data],
  );

  if (isPending || !session?.user || home.isLoading || isCountryWorkspaceRole(home.role)) return null;

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <AppShell
      activePage="countries"
      pageTitle="Countries"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Countries" }]}
      user={user}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "4px 0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--emuted)" }}>
              Active hubs
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", maxWidth: 420 }}>
              Live partner nations from the database — open a hub to enter its country portal.
            </p>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--emuted)" }}>
            {listQuery.isFetching ? "Syncing…" : `${countries.length}`}
          </span>
        </div>

        {listQuery.isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading countries…
          </div>
        )}

        {listQuery.isError && (
          <div className="rm-state rm-state-error">
            Could not load countries: {listQuery.error.message}
          </div>
        )}

        {!listQuery.isLoading && !listQuery.isError && countries.length === 0 && (
          <div className="rm-empty">
            <div className="rm-empty-icon">
              <IconMapPin size={28} />
            </div>
            <h3>No active countries yet</h3>
            <p>
              Create a regional hub under Settings → Regional Hubs. Only active hubs appear here.
            </p>
            <button
              type="button"
              className="rm-primary"
              onClick={() => router.push("/dashboard/settings/countries" as never)}
            >
              <IconWorld size={16} /> Go to Regional Hubs
            </button>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {countries.map((c) => {
            const iso2 = resolveIso2({
              countryCode: c.countryCode,
              iso2: c.iso2,
              flag: c.flag,
            });
            const flagSrc = iso2 ? flagImageUrl(iso2, 80) : "";

            return (
              <button
                key={c.id}
                type="button"
                className="gc"
                onClick={() => router.push(`/dashboard/countries/${c.id}` as never)}
                style={{
                  position: "relative",
                  padding: 22,
                  cursor: "pointer",
                  textAlign: "left",
                  border: "1px solid transparent",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  overflow: "hidden",
                  fontFamily: "var(--font)",
                  background: "var(--eglass)",
                  transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = `${c.color}55`;
                  e.currentTarget.style.boxShadow = `0 12px 32px ${c.color}18`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 140,
                    height: 140,
                    background: `radial-gradient(circle at top right, ${c.color}22 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: `2px solid ${c.color}40`,
                        background: "var(--eglass)",
                        boxShadow: `0 0 16px ${c.color}28`,
                        flexShrink: 0,
                      }}
                    >
                      {flagSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={flagSrc}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 12,
                            color: "var(--ewhite)",
                          }}
                        >
                          {c.countryCode.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: "var(--ewhite)",
                          letterSpacing: "-0.02em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 600, marginTop: 2 }}>
                        {c.countryCode} · Live hub
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconChevronRight size={16} style={{ color: "var(--emuted)" }} />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    paddingTop: 14,
                    borderTop: "1px dashed rgba(128,128,128,0.2)",
                    zIndex: 1,
                  }}
                >
                  <span className="rm-pill">
                    <i style={{ background: "#2EC27E" }} />
                    Active
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
