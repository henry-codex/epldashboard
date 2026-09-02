"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { AlumniLeadersManager } from "@/components/epl/alumni-leaders-manager";
import { AlumniLeadersMetricCards } from "@/components/epl/alumni-leaders-metrics";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { isNetworkManager, isPlatformViewer } from "@/lib/network-access";
import { trpc } from "@/utils/trpc";

export default function CountryAlumniPage() {
  const { hub, mock, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);
  const readOnly = isPlatformViewer(role);

  const aggregatesQuery = useQuery({
    ...trpc.alumniLeaders.aggregates.queryOptions({ tenantId: hub?.id ?? "" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  const networkQuery = useQuery({
    ...trpc.fellows.aggregates.queryOptions({ tenantId: hub?.id ?? "" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  if (isLoading || home.isLoading) {
    return (
      <CountryLayout activePage="alumni" pageTitle="Alumni Leaders">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="alumni" pageTitle="Alumni Leaders">
        <div className="rm-state rm-state-error">{error?.message ?? "Country hub not found"}</div>
      </CountryLayout>
    );
  }

  if (mock) {
    return (
      <CountryLayout activePage="alumni" pageTitle="Alumni Leaders">
        <div className="gc" style={{ padding: 24 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Demo hub — alumni leader profiles are available on live country hubs like Côte d&apos;Ivoire.
          </p>
        </div>
      </CountryLayout>
    );
  }

  const aggregates = aggregatesQuery.data ?? {
    totalLeaders: 0,
    activeLeaders: 0,
    representatives: 0,
  };

  return (
    <CountryLayout activePage="alumni" pageTitle="Alumni Leaders">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        <Header hubName={hub.name} canManage={canManage} readOnly={readOnly} />

        {aggregatesQuery.isLoading ? (
          <CountrySectionSkeleton accent={hub.color} />
        ) : (
          <AlumniLeadersMetricCards
            totalLeaders={aggregates.totalLeaders}
            activeLeaders={aggregates.activeLeaders}
            representatives={aggregates.representatives}
            networkAlumni={networkQuery.data?.alumniLeaders}
            accent={hub.color}
            readOnly={readOnly}
          />
        )}

        <AlumniLeadersManager
          tenantId={hub.id}
          hubName={hub.name}
          accent={hub.color}
          readOnly={!canManage}
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
        {hubName} Alumni Leaders
      </h2>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        {canManage
          ? "Create featured alumni profiles, build the leadership tree, and mark country representatives."
          : readOnly
            ? "Active alumni leaders and representatives for this country hub."
            : "Featured alumni leaders for this country hub."}
      </p>
    </div>
  );
}
