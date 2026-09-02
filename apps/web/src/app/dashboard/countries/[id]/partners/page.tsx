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

export default function CountryPartnersPage() {
  const { hub, mock, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);
  const readOnly = isPlatformViewer(role);

  const aggregatesQuery = useQuery({
    ...trpc.partners.aggregates.queryOptions({ tenantId: hub?.id ?? "", kind: "partner" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  if (isLoading || home.isLoading) {
    return (
      <CountryLayout activePage="partners" pageTitle="Partners">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="partners" pageTitle="Partners">
        <div className="rm-state rm-state-error">{error?.message ?? "Country hub not found"}</div>
      </CountryLayout>
    );
  }

  if (mock) {
    return (
      <CountryLayout activePage="partners" pageTitle="Partners">
        <div className="gc" style={{ padding: 24 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Demo hub — partner management is available on live country hubs like Côte d&apos;Ivoire.
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
    <CountryLayout activePage="partners" pageTitle="Partners">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        <Header hubName={hub.name} canManage={canManage} readOnly={readOnly} />

        {aggregatesQuery.isLoading ? (
          <CountrySectionSkeleton accent={hub.color} />
        ) : (
          <PartnersMetricCards
            kind="partner"
            totalPartners={aggregates.totalPartners}
            activePartners={aggregates.activePartners}
            fellowsAtActivePartners={aggregates.fellowsAtActivePartners}
            funders={aggregates.funders}
            accent={hub.color}
            readOnly={readOnly}
          />
        )}

        <PartnersManager
          tenantId={hub.id}
          hubName={hub.name}
          accent={hub.color}
          kind="partner"
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
        {hubName} Partners
      </h2>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        {canManage
          ? "Funders, government, NGOs, corporates, and other collaborators — separate from placement institutions."
          : readOnly
            ? "Active funders and collaborating partners for this country hub."
            : "Partners for this country hub."}
      </p>
    </div>
  );
}
