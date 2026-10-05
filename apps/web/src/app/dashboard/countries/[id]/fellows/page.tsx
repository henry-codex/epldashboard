"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { NetworkAggregateView } from "@/components/epl/network-aggregate-view";
import { NetworkManager } from "@/components/epl/network-manager";
import { NetworkMetricCards, NetworkInsightStats } from "@/components/epl/network-metrics";
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
  const demographicsQuery = useQuery({
    ...trpc.fellows.demographics.queryOptions({ tenantId: hub?.id ?? "" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });
  const cohortsAggQuery = useQuery({
    ...trpc.cohorts.aggregates.queryOptions({ tenantId: hub?.id ?? "" }),
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
            alumniLeaders={mock.alumni}
            totalNetwork={mock.fellows + mock.alumni}
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
    incomingFellows: 0,
    mcfFellows: 0,
    totalNetwork: 0,
  };
  const demographics = demographicsQuery.data;
  // Scoped to the current roster (active + incoming), matching what this
  // page's default view and the tiles below actually count — not blended
  // with historical alumni.
  // Breakdowns only list values that occur, so a missing entry means zero
  // once the data has loaded — e.g. an all-male roster is 0% female, not "—".
  const genderCount = (name: string) =>
    demographics ? (demographics.currentGender.find((g) => g.name === name)?.count ?? 0) : null;
  const femaleCount = genderCount("Female");
  const maleCount = genderCount("Male");
  // "—" only when nobody's disability status is recorded at all.
  const disabilityRecorded = demographics?.currentDisability.some((d) => d.name !== "Not specified") ?? false;
  const pwdCount = disabilityRecorded
    ? (demographics?.currentDisability.find((d) => d.name === "Yes")?.count ?? 0)
    : null;
  const scholarCount = demographics?.currentScholars ?? 0;
  const cohortsAgg = cohortsAggQuery.data;
  const metricsLoading = aggregatesQuery.isLoading || cohortsAggQuery.isLoading;

  const metricCards = (
    <NetworkMetricCards
      activeFellows={aggregates.activeFellows}
      // "Alumni" = graduates from cohort stats, not the fellows-roster
      // alumni-status count — most hubs never enter individual alumni rows,
      // so that count would read as a near-permanent false zero.
      alumniLeaders={cohortsAgg?.totalGraduated ?? 0}
      // "Total Network" = total ever recruited across all cohorts, matching
      // the Country Stats Summary panel, not active+alumni.
      totalNetwork={cohortsAgg?.totalFellows ?? 0}
      accent={hub.color}
    />
  );

  const insightStats = (
    <NetworkInsightStats
      incomingFellows={aggregates.incomingFellows}
      mcfFellows={scholarCount}
      totalCurrent={aggregates.activeFellows + aggregates.incomingFellows}
      femaleCount={femaleCount}
      maleCount={maleCount}
      pwdCount={pwdCount}
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
            {!metricsLoading && insightStats}
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
              alumniLeaders={cohortsAgg?.totalGraduated ?? 0}
              totalNetwork={cohortsAgg?.totalFellows ?? 0}
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
