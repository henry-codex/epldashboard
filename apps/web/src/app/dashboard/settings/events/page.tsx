"use client";

import { useQuery } from "@tanstack/react-query";
import { ContinentalEventsView } from "@/components/epl/continental-events-view";
import { trpc } from "@/utils/trpc";

export default function SettingsEventsPage() {
  const eventsQuery = useQuery(trpc.platform.eventPortfolio.queryOptions());

  const totals = eventsQuery.data?.totals ?? {
    ongoing: 0,
    upcoming: 0,
    past: 0,
    thisMonth: 0,
    total: 0,
    countries: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 60 }}>
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--ewhite)",
            margin: "0 0 8px 0",
            fontFamily: "var(--font)",
          }}
        >
          Schedule & manage events
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 680 }}>
          Create global events (visible on every country hub and the Dashboard → Events page) or
          hub-specific sessions. Anything scheduled here shows up immediately across the network.
        </p>
      </div>

      {eventsQuery.isError && (
        <div className="rm-state rm-state-error">
          Could not load events. {eventsQuery.error.message}
        </div>
      )}

      {!eventsQuery.isError && (
        <ContinentalEventsView
          totals={totals}
          events={eventsQuery.data?.events ?? []}
          isLoading={eventsQuery.isLoading}
        />
      )}
    </div>
  );
}
