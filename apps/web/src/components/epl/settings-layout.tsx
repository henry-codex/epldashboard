"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NestedShell } from "@/components/epl/nested-shell";
import type { SubNavItem } from "@/components/epl/sub-sidebar";
import {
  IconUserCircle,
  IconUsers,
  IconWorld,
  IconShieldLock,
  IconSettings,
} from "@tabler/icons-react";

const SETTINGS_NAV: SubNavItem[] = [
  { key: "profile", label: "My Profile", icon: <IconUserCircle size={18} />, href: "/dashboard/settings/profile" },
  { key: "users", label: "Users & Roles", icon: <IconUsers size={18} />, href: "/dashboard/settings/users" },
  { key: "countries", label: "Regional Hubs", icon: <IconWorld size={18} />, href: "/dashboard/settings/countries" },
  { key: "security", label: "Security", icon: <IconShieldLock size={18} />, href: "/dashboard/settings/security" },
];

interface Props {
  children: React.ReactNode;
  activePage: string;
  pageTitle: string;
}

export function SettingsLayout({ children, activePage, pageTitle }: Props) {
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
      sectionTitle="Settings"
      sectionIcon={<IconSettings size={18} />}
      sectionSubtitle="Platform administration"
      accent="#4150A3"
      navItems={SETTINGS_NAV}
      activePage={activePage}
      pageTitle={pageTitle}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings" },
      ]}
      user={user}
    >
      {children}
    </NestedShell>
  );
}
