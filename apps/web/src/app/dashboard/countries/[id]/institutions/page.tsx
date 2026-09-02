"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { PartnersManager } from "@/components/epl/partners-manager";
import { PartnersMetricCards } from "@/components/epl/partners-metrics";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { isNetworkManager, isPlatformViewer } from "@/lib/network-access";
import { trpc } from "@/utils/trpc";

export default function CountryInstitutionsPage() {
  const { hub, mock, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);
  const readOnly = isPlatformViewer(role);

  const aggregatesQuery = useQuery({
    ...trpc.partners.aggregates.queryOptions({ tenantId: hub?.id ?? "", kind: "placement" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  if (isLoading || home.isLoading) {
    return (
      <CountryLayout activePage="institutions" pageTitle="Placement Institutions">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="institutions" pageTitle="Placement Institutions">
        <div className="rm-state rm-state-error">{error?.message ?? "Country hub not found"}</div>
      </CountryLayout>
    );
  }

  if (mock) {
    return (
      <CountryLayout activePage="institutions" pageTitle="Placement Institutions">
        <div className="gc" style={{ padding: 24 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Demo hub — placement institutions are available on live country hubs like Côte d&apos;Ivoire.
          </p>
        </div>
      </CountryLayout>
    );
  }

  const aggregates = aggregatesQuery.data ?? {
    totalPartners: 0,
    activePartners: 0,
    fellowsAtActivePartners: 0,
    funders: 0,
  };

  return (
    <CountryLayout activePage="institutions" pageTitle="Placement Institutions">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        <Header hubName={hub.name} canManage={canManage} readOnly={readOnly} />

        {aggregatesQuery.isLoading ? (
          <CountrySectionSkeleton accent={hub.color} />
        ) : (
          <PartnersMetricCards
            kind="placement"
            totalPartners={aggregates.totalPartners}
            activePartners={aggregates.activePartners}
            fellowsAtActivePartners={aggregates.fellowsAtActivePartners}
            accent={hub.color}
            readOnly={readOnly}
          />
        )}

        <PartnersManager
          tenantId={hub.id}
          hubName={hub.name}
          accent={hub.color}
          kind="placement"
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
        {hubName} Placement Institutions
      </h2>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        {canManage
          ? "Host organizations where fellows serve. Fellow counts come from Network assignments (Where they serve)."
          : readOnly
            ? "Active placement institutions and Network-assigned fellow counts for this country hub."
            : "Placement institutions for this country hub."}
      </p>
    </div>
  );
}
