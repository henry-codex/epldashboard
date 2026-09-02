"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { NetworkAggregateView } from "@/components/epl/network-aggregate-view";
import { NetworkManager } from "@/components/epl/network-manager";
import { NetworkMetricCards } from "@/components/epl/network-metrics";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { isNetworkManager, isPlatformViewer } from "@/lib/network-access";
import { trpc } from "@/utils/trpc";
import { IconLock } from "@tabler/icons-react";

export default function CountryFellowsPage() {
  const { hub, mock, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);
  const aggregateOnly = isPlatformViewer(role);

  const aggregatesQuery = useQuery({
    ...trpc.fellows.aggregates.queryOptions({ tenantId: hub?.id ?? "" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  const partnersQuery = useQuery({
    ...trpc.partners.aggregates.queryOptions({ tenantId: hub?.id ?? "", kind: "placement" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  if (isLoading || home.isLoading) {
    return (
      <CountryLayout activePage="fellows" pageTitle="Network">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="fellows" pageTitle="Network">
        <div className="rm-state rm-state-error">
          {error?.message ?? "Country hub not found"}
        </div>
      </CountryLayout>
    );
  }

  if (mock) {
    return (
      <CountryLayout activePage="fellows" pageTitle="Network">
        <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
          <Header hubName={mock.name} canManage={false} aggregateOnly />
          <NetworkMetricCards
            activeFellows={mock.fellows}
            mcfFellows={0}
            activePartners={mock.institutions}
            accent={mock.color}
          />
          <div className="gc" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emuted)" }}>
              <IconLock size={16} />
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font)" }}>Privacy — Phase 1 demo</span>
            </div>
          </div>
        </div>
      </CountryLayout>
    );
  }

  const aggregates = aggregatesQuery.data ?? {
    activeFellows: 0,
    alumniLeaders: 0,
    inactiveFellows: 0,
    mcfFellows: 0,
    totalNetwork: 0,
  };
  const activePartners = partnersQuery.data?.activePartners ?? 0;
  const metricsLoading = aggregatesQuery.isLoading || partnersQuery.isLoading;

  const metricCards = (
    <NetworkMetricCards
      activeFellows={aggregates.activeFellows}
      mcfFellows={aggregates.mcfFellows}
      activePartners={activePartners}
      accent={hub.color}
    />
  );

  return (
    <CountryLayout activePage="fellows" pageTitle="Network">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        <Header hubName={hub.name} canManage={canManage} aggregateOnly={aggregateOnly} />

        {canManage ? (
          <>
            {metricsLoading ? <CountrySectionSkeleton accent={hub.color} /> : metricCards}
            <NetworkManager tenantId={hub.id} hubName={hub.name} accent={hub.color} />
          </>
        ) : aggregateOnly ? (
          metricsLoading ? (
            <CountrySectionSkeleton accent={hub.color} />
          ) : (
            <NetworkAggregateView
              tenantId={hub.id}
              accent={hub.color}
              activeFellows={aggregates.activeFellows}
              alumniLeaders={aggregates.alumniLeaders}
              totalNetwork={aggregates.totalNetwork}
            />
          )
        ) : metricsLoading ? (
          <CountrySectionSkeleton accent={hub.color} />
        ) : (
          metricCards
        )}
      </div>
    </CountryLayout>
  );
}

function Header({
  hubName,
  canManage,
  aggregateOnly,
}: {
  hubName: string;
  canManage: boolean;
  aggregateOnly: boolean;
}) {
  return (
    <div style={{ maxWidth: aggregateOnly ? 980 : undefined, margin: aggregateOnly ? "0 auto" : undefined, width: "100%" }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
        {hubName} Network
      </h2>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        {canManage
          ? "Manage fellows for this hub — add, edit, import, and export your network roster."
          : aggregateOnly
            ? "Aggregate network intelligence — gender, disability, and cohort breakdowns without individual names."
            : "Aggregate metrics for this country hub."}
      </p>
    </div>
  );
}
