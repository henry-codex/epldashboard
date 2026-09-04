"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import { IconArrowLeft, IconUsers } from "@tabler/icons-react";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { CohortMembersList } from "@/components/epl/cohort-members-list";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { isNetworkManager } from "@/lib/network-access";
import { trpc } from "@/utils/trpc";

export default function CohortMembersPage() {
  const params = useParams();
  const router = useRouter();
  const hubId = params?.id as string;
  const cohortId = params?.cohortId as string;
  const { hub, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const canManage = isNetworkManager(role);

  const cohortQuery = useQuery({
    ...trpc.cohorts.get.queryOptions({ tenantId: hub?.id ?? "", cohortId }),
    enabled: Boolean(hub?.isLive && hub.id && cohortId && canManage),
  });

  useEffect(() => {
    if (home.isLoading) return;
    if (!canManage && hubId) {
      router.replace(`/dashboard/countries/${hubId}/cohorts` as never);
    }
  }, [canManage, home.isLoading, hubId, router]);

  if (isLoading || home.isLoading || !canManage) {
    return (
      <CountryLayout activePage="cohorts" pageTitle="Cohort members">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="cohorts" pageTitle="Cohort members">
        <div className="rm-state rm-state-error">{error?.message ?? "Country hub not found"}</div>
      </CountryLayout>
    );
  }

  const cohort = cohortQuery.data;
  const backHref = `/dashboard/countries/${params?.id}/cohorts` as Route;

  return (
    <CountryLayout activePage="cohorts" pageTitle={cohort?.label ?? "Cohort members"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
        <Link href={backHref} className="nm-row-action" style={{ width: "fit-content", textDecoration: "none" }}>
          <IconArrowLeft size={14} /> Back to cohorts
        </Link>

        {cohortQuery.isLoading ? (
          <CountrySectionSkeleton accent={hub.color} />
        ) : cohortQuery.isError || !cohort ? (
          <div className="rm-state rm-state-error">{cohortQuery.error?.message ?? "Cohort not found"}</div>
        ) : (
          <>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                {cohort.label}
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                {cohort.status === "completed"
                  ? `Alumni roster for this cohort${cohort.cohortYear != null ? ` · cohort year ${cohort.cohortYear}` : ""} · ${cohort.totalFellows} started · ${cohort.alumniFellows} alumni`
                  : `Member roster for this cohort${cohort.cohortYear != null ? ` · cohort year ${cohort.cohortYear}` : ""} · ${cohort.totalFellows} started · ${cohort.activeFellows} in fellowship · ${cohort.alumniFellows} alumni`}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {(cohort.status === "completed"
                ? [
                    { label: "Started", value: cohort.totalFellows, color: hub.color },
                    { label: "Alumni", value: cohort.alumniFellows, color: "#3B8BEB" },
                  ]
                : [
                    { label: "In fellowship", value: cohort.activeFellows, color: hub.color },
                    { label: "Alumni", value: cohort.alumniFellows, color: "#3B8BEB" },
                  ]
              ).map((stat) => (
                <div key={stat.label} className="gc" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${stat.color}18`,
                      border: `1px solid ${stat.color}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: stat.color,
                    }}
                  >
                    <IconUsers size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <CohortMembersList tenantId={hub.id} cohort={cohort} accent={hub.color} canManage={canManage} fullPage />
          </>
        )}
      </div>
    </CountryLayout>
  );
}
