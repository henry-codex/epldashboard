"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { COUNTRIES, UPCOMING_EVENTS } from "@/lib/mock-data";

export default function EventsPage() {
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

  const allEvents = COUNTRIES.flatMap((c) =>
    c.events.map((e) => ({ ...e, country: c.name, countryId: c.id, flag: c.flag, color: c.color }))
  );

  return (
    <AppShell
      activePage="events"
      pageTitle="Events"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Events" }]}
      user={user}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Upcoming Events</div>
          <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            {allEvents.length} events across the continent
          </div>
        </div>

        {/* Featured upcoming */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {UPCOMING_EVENTS.map((e) => (
            <div key={e.id} className="gc" style={{ padding: "16px 18px" }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: e.color, fontFamily: "var(--font)",
                marginBottom: 6,
              }}>{e.date}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", marginBottom: 4 }}>{e.title}</div>
              <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{e.country}</div>
            </div>
          ))}
        </div>

        {/* All events by country */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {COUNTRIES.map((c) => (
            <div key={c.id} className="gc" style={{ padding: "18px 20px" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer" }}
                onClick={() => router.push(`/dashboard/countries/${c.id}/events`)}
              >
                <span style={{ fontSize: 20 }}>{c.flag}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                    {c.events.length} upcoming events
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {c.events.map((e, i) => (
                  <div key={i} style={{
                    flex: "1 1 200px", padding: "12px 16px", borderRadius: 10,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                  }} onClick={() => router.push(`/dashboard/countries/${c.id}/events`)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        background: `${c.color}18`, border: `1px solid ${c.color}30`,
                      }}>
                        <span style={{ fontSize: 8, fontWeight: 700, color: c.color, fontFamily: "var(--font)", lineHeight: 1 }}>
                          {e.date.split(",")[0]?.split(" ")[0]}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: c.color, fontFamily: "var(--font)", lineHeight: 1 }}>
                          {e.date.split(",")[0]?.split(" ")[1] || "—"}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{e.title}</div>
                        <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>{e.date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
