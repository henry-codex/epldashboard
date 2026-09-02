"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { ProgramsManager } from "@/components/epl/programs-manager";
import { ProgramsMetricCards } from "@/components/epl/programs-metrics";
import MockPrograms from "./programs-mock";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { isNetworkManager, isPlatformViewer } from "@/lib/network-access";
import { trpc } from "@/utils/trpc";

export default function CountryProgramsPage() {
  const { hub, mock, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);
  const readOnly = isPlatformViewer(role);

  const aggregatesQuery = useQuery({
    ...trpc.programs.aggregates.queryOptions({ tenantId: hub?.id ?? "" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  if (isLoading || home.isLoading) {
    return (
      <CountryLayout activePage="programs" pageTitle="Programs">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="programs" pageTitle="Programs">
        <div className="rm-state rm-state-error">
          {error?.message ?? "Country hub not found"}
        </div>
      </CountryLayout>
    );
  }

  if (mock) {
    return (
      <CountryLayout activePage="programs" pageTitle="Programs">
        <MockPrograms country={mock} />
      </CountryLayout>
    );
  }

  const aggregates = aggregatesQuery.data ?? {
    totalPrograms: 0,
    activePrograms: 0,
    activeFellows: 0,
    alumniFellows: 0,
    totalFellows: 0,
    healthSummary: { onTrack: 0, needsAttention: 0, atRisk: 0 },
  };

  return (
    <CountryLayout activePage="programs" pageTitle="Programs">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        <Header hubName={hub.name} canManage={canManage} readOnly={readOnly} />

        {aggregatesQuery.isLoading ? (
          <CountrySectionSkeleton accent={hub.color} />
        ) : (
          <ProgramsMetricCards
            totalPrograms={aggregates.totalPrograms}
            activePrograms={aggregates.activePrograms}
            activeFellows={aggregates.activeFellows}
            accent={hub.color}
            healthSummary={aggregates.healthSummary}
          />
        )}

        <ProgramsManager
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
        {hubName} Programs
      </h2>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        {canManage
          ? "Create and manage the EPL programs this country hub runs — title, description, fellows target, and status."
          : readOnly
            ? "View-only program portfolio for this hub. Country managers add and edit programs."
            : "Programs running in this country hub."}
      </p>
    </div>
  );
}
