"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconUserCircle, IconUsers, IconWorld, IconShieldLock, IconSettings, IconStar, IconCalendarEvent } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { NestedShell } from "@/components/epl/nested-shell";
import { useHomePath } from "@/hooks/use-home-path";
import { canAccessSettingsPage, PROFILE_PATH, SECURITY_PATH } from "@/lib/account-settings";
import type { SubNavItem } from "@/components/epl/sub-sidebar";

const NAV: SubNavItem[] = [
  { key: "audit", label: "Audit Log", icon: <IconShieldLock size={18} />, href: "/dashboard/settings/audit" },
  { key: "profile", label: "My Profile", icon: <IconUserCircle size={18} />, href: PROFILE_PATH },
  { key: "security", label: "Security", icon: <IconShieldLock size={18} />, href: SECURITY_PATH },
  { key: "users", label: "Users & Roles", icon: <IconUsers size={18} />, href: "/dashboard/settings/users" },
  { key: "countries", label: "Regional Hubs", icon: <IconWorld size={18} />, href: "/dashboard/settings/countries" },
  { key: "executives", label: "Alumni Board", icon: <IconStar size={18} />, href: "/dashboard/settings/executives" },
  { key: "events", label: "Events", icon: <IconCalendarEvent size={18} />, href: "/dashboard/settings/events" },
];

export default function SettingsSegmentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();
  const activePage = pathname.split("/settings/")[1]?.split("/")[0] || "profile";
  const allowed = canAccessSettingsPage(home.role, activePage, home.capabilities);
  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);
  useEffect(() => {
    if (!home.isLoading && !home.isError && !allowed) router.replace(PROFILE_PATH);
  }, [home.isLoading, home.isError, allowed, router]);

  if (isPending || !session?.user || home.isLoading) return <p className="rm-state" role="status">Loading account settings…</p>;
  if (home.isError) return <div className="rm-state"><p role="alert">Could not load account access.</p><button type="button" className="rm-ghost" onClick={() => { void home.refetch(); }}>Try again</button></div>;
  if (!allowed) return null;

  const navItems = NAV.filter((item) => canAccessSettingsPage(home.role, item.key, home.capabilities));
  return (
    <NestedShell
      accountSettings
      backLabel={home.tenant ? "Back to " + home.tenant.name : "Back to Dashboard"}
      backHref={home.path}
      sectionTitle="Settings"
      sectionIcon={<IconSettings size={18} />}
      sectionSubtitle="Your account"
      accent={home.tenant?.color ?? "#4150A3"}
      navItems={navItems}
      activePage={activePage}
      pageTitle={NAV.find((item) => item.key === activePage)?.label ?? "Settings"}
      breadcrumbs={[{ label: home.tenant?.name ?? "Dashboard", href: home.path }, { label: "Settings" }]}
      user={{ name: session.user.name, email: session.user.email, image: session.user.image ?? undefined }}
    >{children}</NestedShell>
  );
}
