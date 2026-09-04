"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { CohortsMetricCards, CohortsBreakdownTable } from "@/components/epl/cohorts-metrics";
import { CohortsManager } from "@/components/epl/cohorts-manager";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { isNetworkManager, isPlatformViewer } from "@/lib/network-access";
import { trpc } from "@/utils/trpc";

export default function CountryCohortsPage() {
  const { hub, mock, id, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);
  const readOnly = isPlatformViewer(role);

  const aggregatesQuery = useQuery({
    ...trpc.cohorts.aggregates.queryOptions({ tenantId: hub?.id ?? "" }),
    enabled: Boolean(hub?.isLive && hub.id),
  });

  if (isLoading || home.isLoading) {
    return (
      <CountryLayout activePage="cohorts" pageTitle="Cohorts">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="cohorts" pageTitle="Cohorts">
        <div className="rm-state rm-state-error">
          {error?.message ?? "Country hub not found"}
        </div>
      </CountryLayout>
    );
  }

  if (mock) {
    const totalFellows = mock.cohorts.reduce((sum, cohort) => sum + cohort.fellows, 0);
    const totalGrad = mock.cohorts.reduce((sum, cohort) => sum + cohort.graduated, 0);

    return (
      <CountryLayout activePage="cohorts" pageTitle="Cohorts">
        <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
          <Header hubName={mock.name} readOnly={false} />
          <CohortsMetricCards
            cohortCount={mock.cohorts.length}
            totalAlumni={totalGrad}
            totalFellows={totalFellows}
            accent={mock.color}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mock.cohorts.map((cohort) => {
              const gradPct = cohort.fellows > 0 ? Math.round((cohort.graduated / cohort.fellows) * 100) : 0;
              return (
                <div key={String(cohort.year)} className="gc" style={{ padding: "20px 24px" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", marginBottom: 8, fontFamily: "var(--font)" }}>
                    {cohort.year}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--emuted)", marginBottom: 12, fontFamily: "var(--font)" }}>
                    {cohort.fellows} fellows
                    {cohort.graduated > 0 ? ` · ${gradPct}% graduated` : ""}
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                    <div style={{ width: `${gradPct}%`, height: "100%", borderRadius: 3, background: mock.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CountryLayout>
    );
  }

  const aggregates = aggregatesQuery.data ?? {
    cohortCount: 0,
    totalFellows: 0,
    totalGraduated: 0,
    inProgressCohorts: 0,
    fellowsInProgress: 0,
  };

  return (
    <CountryLayout activePage="cohorts" pageTitle="Cohorts">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
        <Header hubName={hub.name} readOnly={readOnly} />

        {aggregatesQuery.isLoading ? (
          <CountrySectionSkeleton accent={hub.color} />
        ) : (
          <CohortsMetricCards
            cohortCount={aggregates.cohortCount}
            totalAlumni={aggregates.totalGraduated}
            totalFellows={aggregates.totalFellows}
            inProgressCohorts={aggregates.inProgressCohorts}
            fellowsInProgress={aggregates.fellowsInProgress}
            accent={hub.color}
            showPipeline={readOnly}
          />
        )}

        <CohortsManager
          tenantId={hub.id}
          hubName={hub.name}
          accent={hub.color}
          countryId={id}
          readOnly={!canManage}
        />
      </div>
    </CountryLayout>
  );
}

function Header({ hubName, readOnly }: { hubName: string; readOnly: boolean }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
        {hubName} Cohorts
      </h2>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
        {readOnly
          ? "Cohort-by-cohort view for this hub — started, in fellowship, alumni, and retention after graduation."
          : "Add cohort records for each class. Historic cohorts use manual counts; current cohorts can link to Network."}
      </p>
    </div>
  );
}
