"use client";

import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { CountrySettingsShell } from "@/components/epl/country-settings-shell";
import { useCountryHub } from "@/hooks/use-country-hub";
import { useHomePath } from "@/hooks/use-home-path";
import { canManageHubUsers, isNetworkManager } from "@/lib/network-access";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";

function activeTabFromPath(pathname: string): "users" | "profile" {
  if (pathname.includes("/settings/users")) return "users";
  return "profile";
}

export default function CountrySettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const hubId = params?.id as string;
  const { hub, mock, isLoading, isError, error } = useCountryHub();
  const home = useHomePath();
  const role = (home.role ?? "viewer") as UserRole;
  const isManager = isNetworkManager(role);
  const canManage = canManageHubUsers(role) && isManager;
  const activeTab = activeTabFromPath(pathname);
  const pageTitle = activeTab === "users" ? "Country Managers" : "My Profile";

  useEffect(() => {
    if (home.isLoading) return;
    if (!isManager && hubId) {
      router.replace(`/dashboard/countries/${hubId}` as never);
    }
  }, [home.isLoading, hubId, isManager, router]);

  useEffect(() => {
    if (home.isLoading || mock || !hub?.isLive || !isManager) return;
    if (activeTab === "users" && !canManage) {
      router.replace(`/dashboard/countries/${hubId}/settings/profile` as never);
    }
  }, [activeTab, canManage, home.isLoading, hub?.isLive, hubId, isManager, mock, router]);

  if (isLoading || home.isLoading || !isManager) {
    return (
      <CountryLayout activePage="settings" pageTitle="Settings">
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage="settings" pageTitle="Settings">
        <div className="rm-state rm-state-error">{error?.message ?? "Country hub not found"}</div>
      </CountryLayout>
    );
  }

  if (mock) {
    return (
      <CountryLayout activePage="settings" pageTitle="Settings">
        <div className="gc" style={{ padding: 24 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Demo hub — settings are available on live country hubs like Côte d&apos;Ivoire.
          </p>
        </div>
      </CountryLayout>
    );
  }

  return (
    <CountryLayout activePage="settings" pageTitle={pageTitle}>
      <div style={{ paddingBottom: 40 }}>
        <CountrySettingsShell
          hubId={hub.id}
          activeTab={activeTab}
          accent={hub.color}
          canManageUsers={canManage}
        >
          {children}
        </CountrySettingsShell>
      </div>
    </CountryLayout>
  );
}
