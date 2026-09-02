"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NestedShell } from "@/components/epl/nested-shell";
import { useHomePath } from "@/hooks/use-home-path";
import { isCountryWorkspaceRole } from "@/lib/home-path";
import type { SubNavItem } from "@/components/epl/sub-sidebar";
import {
  IconLayoutDashboard,
  IconFlag,
  IconSchool,
  IconChartBar,
} from "@tabler/icons-react";

const REPORT_NAV: SubNavItem[] = [
  { key: "overview", label: "Overview",   icon: <IconLayoutDashboard size={20} />, href: "/dashboard/reports" },
  { key: "country",  label: "By Country", icon: <IconFlag size={20} />,            href: "/dashboard/reports/country" },
  { key: "program",  label: "By Program", icon: <IconSchool size={20} />,          href: "/dashboard/reports/program" },
  { key: "impact",   label: "Impact",     icon: <IconChartBar size={20} />,        href: "/dashboard/reports/impact" },
];

interface Props {
  children: React.ReactNode;
  activePage: string;
  pageTitle: string;
}

export function ReportLayout({ children, activePage, pageTitle }: Props) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (home.isLoading) return;
    if (isCountryWorkspaceRole(home.role)) {
      router.replace(home.path as never);
    }
  }, [home.isLoading, home.path, home.role, router]);

  if (isPending || !session?.user || home.isLoading || isCountryWorkspaceRole(home.role)) {
    return null;
  }

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <NestedShell
      backLabel="Back to Dashboard"
      backHref="/dashboard"
      sectionTitle="Data"
      sectionIcon={<IconChartBar size={16} />}
      sectionSubtitle="Performance by country & cohort"
      accent="#3B8BEB"
      navItems={REPORT_NAV}
      activePage={activePage}
      pageTitle={pageTitle}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Data" },
      ]}
      user={user}
    >
      {children}
    </NestedShell>
  );
}
