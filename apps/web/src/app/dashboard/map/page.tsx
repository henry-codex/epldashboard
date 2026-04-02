"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import AfricaMap, { type FellowCountry } from "@/components/epl/AfricaMap";
import { COUNTRIES, COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import {
  IconUsers,
  IconChevronRight,
} from "@tabler/icons-react";

/* Map ISO-numeric → our country ID */
const ISO_TO_ID: Record<number, CountryId> = {
  288: "gh", 404: "ke", 430: "lr", 454: "mw", 694: "sl",
};

const MAP_DATA: FellowCountry[] = COUNTRIES.map((c) => {
  const iso = Object.entries(ISO_TO_ID).find(([, v]) => v === c.id)?.[0];
  return {
    countryId: Number(iso),
    name: c.name,
    fellows: c.fellows,
    institutions: c.institutions,
    cohort: `${c.cohorts.length} cohorts`,
  };
});

export default function MapPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session?.user) return null;

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  function handleCountryClick(fc: FellowCountry) {
    const id = ISO_TO_ID[fc.countryId];
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
        {/* Header */}
        <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{
              fontSize: 20, fontWeight: 700, color: "var(--ewhite)",
              fontFamily: "var(--font)", letterSpacing: "-0.02em",
            }}>
              Fellows Placement Map
            </div>
            <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 3 }}>
              Click a country to view its detailed breakdown
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {COUNTRIES.map((c) => (
              <button
                key={c.id}
                onClick={() => router.push(`/dashboard/countries/${c.id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--emuted)", fontSize: 11, fontFamily: "var(--font)",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = c.color)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--emuted)")}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: c.color, boxShadow: `0 0 6px ${c.color}50`,
                }} />
                {c.flag} {c.name}
              </button>
            ))}
          </div>
        </section>

        {/* Full-size map */}
        <div className="gc" style={{ padding: 0, overflow: "hidden", borderRadius: "var(--r3)" }}>
          <AfricaMap
            data={MAP_DATA}
            height={560}
            onCountryClick={handleCountryClick}
          />
        </div>

        {/* Country quick stats row */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {COUNTRIES.map((c) => {
            const rate = Math.round((c.placed / c.fellows) * 100);
            return (
              <div
                key={c.id}
                className="gc"
                onClick={() => router.push(`/dashboard/countries/${c.id}`)}
                style={{
                  padding: "16px 18px", cursor: "pointer",
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
                  <span style={{ fontSize: 22 }}>{c.flag}</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                    {c.name}
                  </div>
                  <IconChevronRight size={12} style={{ color: "var(--emuted)", marginLeft: "auto" }} />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: c.color, fontFamily: "var(--font)" }}>
                      {c.fellows}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Fellows</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                      {rate}%
                    </div>
                    <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Placed</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                      {c.institutions}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>Inst.</div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}
