"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { NestedShell } from "@/components/epl/nested-shell";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import { trpc } from "@/utils/trpc";
import { useHomePath } from "@/hooks/use-home-path";
import { isCountryWorkspaceRole } from "@/lib/home-path";
import { isNetworkManager } from "@/lib/network-access";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";
import type { UserRole } from "@epl-fellows-platform/auth/permissions";
import type { SubNavItem } from "@/components/epl/sub-sidebar";
import {
  IconLayoutDashboard,
  IconUsers,
  IconSchool,
  IconStack2,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconSettings,
  IconHeartHandshake,
  IconBuildingBank,
  IconLoader2,
  IconChartBar,
} from "@tabler/icons-react";

function getCountryNav(id: string, options?: { includeSettings?: boolean }): SubNavItem[] {
  const base = `/dashboard/countries/${id}`;
  const items: SubNavItem[] = [
    { key: "overview", label: "Overview", icon: <IconLayoutDashboard size={20} />, href: base },
    { key: "fellows", label: "Network", icon: <IconUsers size={20} />, href: `${base}/fellows` },
    { key: "programs", label: "Programs", icon: <IconSchool size={20} />, href: `${base}/programs` },
    { key: "cohorts", label: "Cohorts", icon: <IconStack2 size={20} />, href: `${base}/cohorts` },
    { key: "stats", label: "Country Stats", icon: <IconChartBar size={20} />, href: `${base}/stats` },
    { key: "institutions", label: "Placement Institutions", icon: <IconBuildingBank size={20} />, href: `${base}/institutions` },
    { key: "partners", label: "Partners", icon: <IconHeartHandshake size={20} />, href: `${base}/partners` },
    { key: "alumni", label: "Alumni Leaders", icon: <IconBuildingCommunity size={20} />, href: `${base}/alumni` },
    { key: "events", label: "Events", icon: <IconCalendarEvent size={20} />, href: `${base}/events` },
  ];
  if (options?.includeSettings !== false) {
    items.push({ key: "settings", label: "Settings", icon: <IconSettings size={20} />, href: `${base}/settings` });
  }
  return items;
}

interface Props {
  children: React.ReactNode;
  activePage: string;
  pageTitle: string;
}

export function CountryLayout({ children, activePage, pageTitle }: Props) {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();

  const mock = COUNTRIES_MAP[id as CountryId];
  const liveQuery = useQuery({
    ...trpc.tenants.get.queryOptions({ id }),
    enabled: Boolean(id) && !mock && Boolean(session?.user),
    retry: false,
  });

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (home.isLoading || home.role === "super_admin") return;
    if (isCountryWorkspaceRole(home.role) && home.tenant?.id && id && id !== home.tenant.id) {
      router.replace(`/dashboard/countries/${home.tenant.id}` as never);
    }
  }, [home.isLoading, home.role, home.tenant?.id, id, router]);

  if (isPending || !session?.user) return null;

  if (!mock && liveQuery.isLoading) {
    return (
      <div style={{ padding: 48, display: "flex", justifyContent: "center", color: "var(--emuted)", gap: 10 }}>
        <IconLoader2 size={18} className="animate-spin" />
        Opening country hub…
      </div>
    );
  }

  const live = liveQuery.data;
  if (!mock && !live) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--emuted)" }}>
        Country hub not found or you don’t have access.{" "}
        <button
          type="button"
          onClick={() => router.push(home.path as never)}
          style={{ color: "#3B8BEB", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          Go back
        </button>
      </div>
    );
  }

  const name = mock?.name ?? live!.name;
  const color = mock?.color ?? live!.color;
  const iso2 = mock
    ? id
    : resolveIso2({
        countryCode: live!.countryCode,
        iso2: live!.iso2,
        flag: live!.flag,
      });
  const flagNode = iso2 ? (
    <span className="rm-cp-flag" style={{ width: 32, height: 21, borderRadius: 5 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flagImageUrl(iso2, 80)} alt="" />
    </span>
  ) : (
    <span>{mock?.flag ?? live!.flag ?? name.slice(0, 2)}</span>
  );
  const subtitle = mock
    ? `${mock.activePrograms} programs · ${mock.fellows} fellows`
    : `${live!.countryCode} · Hub ready for data`;

  const canBrowseAllCountries = home.role === "super_admin";
  const isManager = isNetworkManager((home.role ?? "viewer") as UserRole);
  const includeSettings = isManager;
  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <NestedShell
      backLabel={canBrowseAllCountries ? "Back to Countries" : undefined}
      backHref={canBrowseAllCountries ? "/dashboard/countries" : undefined}
      sectionTitle={name}
      sectionIcon={flagNode}
      sectionSubtitle={subtitle}
      accent={color}
      navItems={getCountryNav(id, { includeSettings })}
      activePage={activePage}
      pageTitle={pageTitle}
      breadcrumbs={[
        { label: name, href: `/dashboard/countries/${id}` },
      ]}
      user={user}
    >
      {children}
    </NestedShell>
  );
}
