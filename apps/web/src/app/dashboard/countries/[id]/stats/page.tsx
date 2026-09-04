"use client";

import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { CountryStatsManager } from "@/components/epl/country-stats-manager";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { isNetworkManager, isPlatformViewer } from "@/lib/network-access";
import { IconLock } from "@tabler/icons-react";

export default function CountryStatsPage() {
  const { hub, mock, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);
  const readOnly = isPlatformViewer(role);

  if (isLoading || home.isLoading) {
    return (
      <CountryLayout activePage="stats" pageTitle="Country Stats">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="stats" pageTitle="Country Stats">
        <div className="rm-state rm-state-error">
          {error?.message ?? "Country hub not found"}
        </div>
      </CountryLayout>
    );
  }

  if (mock) {
    return (
      <CountryLayout activePage="stats" pageTitle="Country Stats">
        <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
          <Header hubName={mock.name} readOnly />
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

  return (
    <CountryLayout activePage="stats" pageTitle="Country Stats">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        <Header hubName={hub.name} readOnly={!canManage} />
        <CountryStatsManager tenantId={hub.id} hubName={hub.name} accent={hub.color} readOnly={readOnly || !canManage} />
      </div>
    </CountryLayout>
  );
}

function Header({ hubName, readOnly }: { hubName: string; readOnly: boolean }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
        {hubName} Country Stats
      </h2>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        {readOnly
          ? "Recruitment targets and attrition rates for each cohort — figures the program plans and tracks separately from the fellow roster."
          : "Import the workbook's All Stats or MCF_Stats sheet — only this hub's own country block is read from either."}
      </p>
    </div>
  );
}
