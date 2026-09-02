"use client";

import Link from "next/link";
import {
  IconLayoutDashboard,
  IconUsers,
  IconMapPin,
  IconChartBar,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconSchool,
  IconFlag,
  IconUser,
} from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { userAvatarUrl } from "@/lib/user-avatar";

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Overview", icon: <IconLayoutDashboard size={18} />, href: "/dashboard" },
  { key: "countries", label: "Countries", icon: <IconFlag size={18} />, href: "/dashboard/countries" },
  { key: "map", label: "Map", icon: <IconMapPin size={18} />, href: "/dashboard/map" },
  { key: "fellows", label: "Network", icon: <IconUsers size={18} />, href: "/dashboard/fellows" },
  { key: "programs", label: "Programs", icon: <IconSchool size={18} />, href: "/dashboard/programs" },
  { key: "reports", label: "Data", icon: <IconChartBar size={18} />, href: "/dashboard/reports" },
  { key: "alumni", label: "Alumni Network", icon: <IconBuildingCommunity size={18} />, href: "/dashboard/alumni" },
  { key: "events", label: "Events", icon: <IconCalendarEvent size={18} />, href: "/dashboard/events" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: "settings", label: "Settings", icon: <IconSettings size={18} />, href: "/dashboard/settings" },
];

type Props = {
  collapsed: boolean;
  onCollapse: () => void;
  activePage: string;
  user?: { name?: string; email?: string; image?: string } | null;
  ready?: boolean;
};

export function EPLSidebar({ collapsed, onCollapse, activePage, user, ready = true }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  const displayName = user?.name?.trim() || "Admin";
  const email = user?.email ?? "";
  const avatarSrc = user ? userAvatarUrl(user, 96) : "";

  return (
    <aside
      className={`epl-sidebar${collapsed ? " epl-collapsed" : ""}${ready ? " epl-ready" : ""}`}
      style={{ fontFamily: "var(--font)" }}
    >
      <div className="epl-sidebar-brand">
        <div className="epl-sidebar-logo-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/EPL_logo_square-block.webp" alt="EPL Global Logo" />
        </div>
        {!collapsed && (
          <div className="epl-sidebar-logo-text">
            <div className="epl-sidebar-logo-title">EPL Global</div>
            <div className="epl-sidebar-logo-sub">Fellows Platform</div>
          </div>
        )}
        <button
          type="button"
          className="epl-sidebar-collapse"
          onClick={onCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
        </button>
      </div>

      <nav className="epl-sidebar-nav">
        {!collapsed && <div className="epl-nav-section">Main</div>}
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href as never}
            className={`epl-nav-item${activePage === item.key ? " epl-active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <span className="epl-nav-icon">{item.icon}</span>
            {!collapsed && <span className="epl-nav-label">{item.label}</span>}
          </Link>
        ))}

        {!collapsed && <div className="epl-nav-section epl-nav-section-spaced">System</div>}
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href as never}
            className={`epl-nav-item${activePage === item.key ? " epl-active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <span className="epl-nav-icon">{item.icon}</span>
            {!collapsed && <span className="epl-nav-label">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="epl-sidebar-footer">
        <div className={`epl-sidebar-profile${collapsed ? " is-collapsed" : ""}`}>
          <Link
            href={"/dashboard/settings/profile" as never}
            className="epl-sidebar-user"
            title={collapsed ? displayName : "Open profile settings"}
          >
            <div className="epl-sidebar-avatar">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            {!collapsed && (
              <div className="epl-sidebar-user-meta">
                <div className="epl-sidebar-user-name">{displayName}</div>
                <div className="epl-sidebar-user-email">{email || "Account"}</div>
              </div>
            )}
            {!collapsed && (
              <span className="epl-sidebar-user-action" aria-hidden>
                <IconUser size={13} />
              </span>
            )}
          </Link>
          <button
            type="button"
            className="epl-sidebar-signout"
            onClick={handleSignOut}
            title={collapsed ? "Sign out" : undefined}
          >
            <IconLogout size={15} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
