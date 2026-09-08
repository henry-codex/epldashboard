"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { EventsManager } from "@/components/epl/events-manager";
import { EventsMetricCards } from "@/components/epl/events-metrics";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { isNetworkManager, isPlatformViewer } from "@/lib/network-access";
import { trpc } from "@/utils/trpc";

export default function CountryEventsPage() {
  const { hub, mock, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);
  const readOnly = isPlatformViewer(role);

  const aggregatesQuery = useQuery({
    ...trpc.events.aggregates.queryOptions({ tenantId: hub?.id ?? "" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  if (isLoading || home.isLoading) {
    return (
      <CountryLayout activePage="events" pageTitle="Events">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="events" pageTitle="Events">
        <div className="rm-state rm-state-error">{error?.message ?? "Country hub not found"}</div>
      </CountryLayout>
    );
  }

  if (mock) {
    return (
      <CountryLayout activePage="events" pageTitle="Events">
        <div className="gc" style={{ padding: 24 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Demo hub — event scheduling is available on live country hubs like Côte d&apos;Ivoire.
          </p>
        </div>
      </CountryLayout>
    );
  }

  const aggregates = aggregatesQuery.data ?? {
    upcoming: 0,
    past: 0,
    thisMonth: 0,
    total: 0,
  };

  return (
    <CountryLayout activePage="events" pageTitle="Events">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        <Header hubName={hub.name} canManage={canManage} readOnly={readOnly} />

        {aggregatesQuery.isLoading ? (
          <CountrySectionSkeleton accent={hub.color} />
        ) : (
          <EventsMetricCards
            upcoming={aggregates.upcoming}
            past={aggregates.past}
            thisMonth={aggregates.thisMonth}
            accent={hub.color}
          />
        )}

        <EventsManager
          tenantId={hub.id}
          hubName={hub.name}
          accent={hub.color}
          readOnly={!canManage}
          isSuperAdmin={home.capabilities.globalOperations}
        />
      </div>
    </CountryLayout>
  );
}

function Header({
  hubName,
  canManage,
  readOnly,
}: {
  hubName: string;
  canManage: boolean;
  readOnly: boolean;
}) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
        {hubName} Events
      </h2>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        {canManage
          ? "Schedule country events with title, description, venue, and online links — view upcoming and past events in list or calendar view."
          : readOnly
            ? "Upcoming and past events for this country hub."
            : "Country program events and orientations."}
      </p>
    </div>
  );
}
