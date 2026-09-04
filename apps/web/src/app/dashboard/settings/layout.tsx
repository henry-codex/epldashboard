"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NestedShell } from "@/components/epl/nested-shell";
import { useHomePath } from "@/hooks/use-home-path";
import type { SubNavItem } from "@/components/epl/sub-sidebar";
import {
  IconUserCircle,
  IconUsers,
  IconWorld,
  IconShieldLock,
  IconSettings,
  IconStar,
  IconCalendarEvent,
} from "@tabler/icons-react";

const TITLE_BY_KEY: Record<string, string> = {
  profile: "Personal Profile",
  users: "Users & Roles",
  countries: "Regional Hubs",
  executives: "Alumni Board",
  events: "Events",
  security: "Security",
};

function activeKeyFromPath(pathname: string) {
  if (pathname.includes("/settings/users")) return "users";
  if (pathname.includes("/settings/countries")) return "countries";
  if (pathname.includes("/settings/executives")) return "executives";
  if (pathname.includes("/settings/events")) return "events";
  if (pathname.includes("/settings/security")) return "security";
  return "profile";
}

export default function SettingsSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();

  const isPlatformAdmin = home.role === "super_admin";

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (home.isLoading || isPlatformAdmin) return;
    if (
      pathname.includes("/settings/countries") ||
      pathname.includes("/settings/executives") ||
      pathname.includes("/settings/events")
    ) {
      router.replace("/dashboard/settings/users");
    }
  }, [home.isLoading, isPlatformAdmin, pathname, router]);

  const navItems: SubNavItem[] = useMemo(() => {
    const items: SubNavItem[] = [
      { key: "profile", label: "My Profile", icon: <IconUserCircle size={18} />, href: "/dashboard/settings/profile" },
      { key: "users", label: "Users & Roles", icon: <IconUsers size={18} />, href: "/dashboard/settings/users" },
    ];
    if (isPlatformAdmin) {
      items.push({
        key: "countries",
        label: "Regional Hubs",
        icon: <IconWorld size={18} />,
        href: "/dashboard/settings/countries",
      });
      items.push({
        key: "executives",
        label: "Alumni Board",
        icon: <IconStar size={18} />,
        href: "/dashboard/settings/executives",
      });
      items.push({
        key: "events",
        label: "Events",
        icon: <IconCalendarEvent size={18} />,
        href: "/dashboard/settings/events",
      });
    }
    items.push({
      key: "security",
      label: "Security",
      icon: <IconShieldLock size={18} />,
      href: "/dashboard/settings/security",
    });
    return items;
  }, [isPlatformAdmin]);

  const activePage = useMemo(() => activeKeyFromPath(pathname), [pathname]);
  const pageTitle = TITLE_BY_KEY[activePage] ?? "Settings";

  if (isPending || !session?.user || home.isLoading) return null;

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <NestedShell
      backLabel={home.tenant ? `Back to ${home.tenant.name}` : "Back to Dashboard"}
      backHref={home.path}
      sectionTitle="Settings"
      sectionIcon={<IconSettings size={18} />}
      sectionSubtitle={
        home.tenant ? `${home.tenant.name} administration` : "Platform administration"
      }
      accent={home.tenant?.color ?? "#4150A3"}
      navItems={navItems}
      activePage={activePage}
      pageTitle={pageTitle}
      breadcrumbs={[
        { label: home.tenant?.name ?? "Dashboard", href: home.path },
        { label: "Settings" },
      ]}
      user={user}
    >
      {children}
    </NestedShell>
  );
}
