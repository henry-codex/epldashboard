"use client";

import Link from "next/link";
import {
  IconLayoutDashboard,
  IconUsers,
  IconCalendarCheck,
  IconMapPin,
  IconChartBar,
  IconSettings,
  IconChevronLeft,
  IconLogout,
  IconGlobe,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconSchool,
  IconFlag,
} from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "overview",    label: "Overview",      icon: <IconLayoutDashboard size={18} />, href: "/dashboard" },
  { key: "countries",   label: "Countries",     icon: <IconFlag size={18} />,            href: "/dashboard/countries" },
  { key: "map",          label: "Map",           icon: <IconMapPin size={18} />,          href: "/dashboard/map" },
  { key: "fellows",     label: "Fellows",       icon: <IconUsers size={18} />,           href: "/dashboard/fellows" },
  { key: "programs",    label: "Programs",      icon: <IconSchool size={18} />,          href: "/dashboard/programs" },
  { key: "checkins",    label: "Check-ins",     icon: <IconCalendarCheck size={18} />,   href: "/dashboard/checkins" },
  { key: "reports",     label: "Reports",       icon: <IconChartBar size={18} />,        href: "/dashboard/reports" },
  { key: "alumni",      label: "Alumni Network",icon: <IconBuildingCommunity size={18}/>,href: "/dashboard/alumni" },
  { key: "events",      label: "Events",        icon: <IconCalendarEvent size={18} />,   href: "/dashboard/events" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: "settings",  label: "Settings",   icon: <IconSettings size={18} />,        href: "/dashboard/settings" },
];

type Props = {
  collapsed: boolean;
  onCollapse: () => void;
  activePage: string;
  user?: { name?: string; email?: string; image?: string } | null;
};

export function EPLSidebar({ collapsed, onCollapse, activePage, user }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <aside className={`epl-sidebar${collapsed ? " epl-collapsed" : ""}`}
      style={{ fontFamily: "var(--font)" }}>

      {/* ── Logo ──────────────────────────────────────────── */}
      <div style={{ padding: "16px 12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo mark */}
          <div style={{
            width: 48, height: 48,
            borderRadius: 14,
            overflow: "hidden", 
            background: "#fff", 
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            border: "2.5px solid #FFFFFF",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35), 0 0 15px rgba(255, 255, 255, 0.15)",
          }}>
            <img 
              src="/EPL_logo_square-block.webp" 
              alt="EPL Global Logo" 
              style={{ width: "88%", height: "88%", objectFit: "contain" }} 
            />
          </div>

          <div className="epl-sidebar-logo-text">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2 }}>
              EPL Global
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
              Fellows Platform
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        <div className="epl-nav-section">Main</div>

        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href as never}
            className={`epl-nav-item${activePage === item.key ? " epl-active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
            <span className="epl-nav-label">{item.label}</span>
          </Link>
        ))}

        <div className="epl-nav-section" style={{ marginTop: 14 }}>System</div>

        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href as never}
            className={`epl-nav-item${activePage === item.key ? " epl-active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
            <span className="epl-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* ── User + Sign out ───────────────────────────────── */}
      <div style={{
        padding: "10px 12px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* User row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6, overflow: "hidden" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#2D3985",
            border: "1px solid rgba(255, 255, 255, 0.20)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            fontSize: 12, fontWeight: 600, color: "#fff",
          }}>
            {initial}
          </div>
          <div className="epl-sidebar-bottom-text" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ewhite)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name ?? "Admin"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.60)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email ?? ""}
            </div>
          </div>
        </div>

        {/* Sign out + collapse */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleSignOut}
            className="epl-nav-item"
            title={collapsed ? "Sign out" : undefined}
            style={{ flex: 1, justifyContent: collapsed ? "center" : "flex-start", cursor: "pointer" }}
          >
            <span style={{ flexShrink: 0, display: "flex" }}><IconLogout size={16} /></span>
            <span className="epl-nav-label" style={{ fontSize: 12 }}>Sign out</span>
          </button>

          <button
            onClick={onCollapse}
            className="epl-collapse-btn"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconChevronLeft size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
