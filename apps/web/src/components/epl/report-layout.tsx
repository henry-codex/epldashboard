"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NestedShell } from "@/components/epl/nested-shell";
import type { SubNavItem } from "@/components/epl/sub-sidebar";
import {
  IconLayoutDashboard,
  IconFlag,
  IconSchool,
  IconStack2,
  IconChartBar,
} from "@tabler/icons-react";

const REPORT_NAV: SubNavItem[] = [
  { key: "overview", label: "Overview",   icon: <IconLayoutDashboard size={20} />, href: "/dashboard/reports" },
  { key: "country",  label: "By Country", icon: <IconFlag size={20} />,            href: "/dashboard/reports/country" },
  { key: "program",  label: "By Program", icon: <IconSchool size={20} />,          href: "/dashboard/reports/program" },
  { key: "cohort",   label: "By Cohort",  icon: <IconStack2 size={20} />,          href: "/dashboard/reports/cohort" },
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

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session?.user) return null;

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <NestedShell
      backLabel="Back to Dashboard"
      backHref="/dashboard"
      sectionTitle="Reports"
      sectionIcon={<IconChartBar size={16} />}
      sectionSubtitle="Analytics & insights"
      accent="#3B8BEB"
      navItems={REPORT_NAV}
      activePage={activePage}
      pageTitle={pageTitle}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Reports" },
      ]}
      user={user}
    >
      {children}
    </NestedShell>
  );
}
