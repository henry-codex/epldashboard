"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconArrowLeft,
  IconChevronRight,
  IconChevronLeft
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { IconLogout } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";

export interface SubNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string | number;
}

interface Props {
  backLabel: string;
  backHref: string;
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: string;
  accent?: string;
  navItems: SubNavItem[];
  activePage: string;
  user?: { name?: string; email?: string; image?: string } | null;
}

export function SubSidebar({
  backLabel,
  backHref,
  title,
  titleIcon,
  subtitle,
  accent = "#4150A3",
  navItems,
  activePage,
  user,
}: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <aside className={`epl-sub-sidebar ${collapsed ? 'epl-collapsed' : ''}`} style={{ fontFamily: "var(--font)" }}>
      {/* ── Back button ──────────────────────────────── */}
      <button
        onClick={() => router.push(backHref as never)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(0,0,0,0.45)", fontSize: 11, fontFamily: "var(--font)",
          padding: "14px 16px 10px", width: "100%",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#111827")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(0,0,0,0.45)")}
      >
        <IconArrowLeft size={13} />
        {backLabel}
      </button>

      {/* ── Title / header ───────────────────────────── */}
      <div style={{
        padding: "8px 16px 14px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        position: "relative"
      }}>
        <button 
           onClick={() => setCollapsed(!collapsed)}
           style={{
              position: "absolute", top: 12, right: collapsed ? '50%' : 12, transform: collapsed ? 'translateX(50%)' : 'none',
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%",
              width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
               cursor: "pointer", color: "rgba(0,0,0,0.40)", zIndex: 10
           }}
        >
           {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
        </button>

        <div className="epl-sub-sidebar-title-block" style={{ display: "flex", alignItems: "center", gap: 10, transition: "opacity 0.2s", opacity: collapsed ? 0 : 1, pointerEvents: collapsed ? "none" : "auto" }}>
          {titleIcon && (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${accent}18`, border: `1px solid ${accent}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: accent, fontSize: 18,
            }}>
              {titleIcon}
            </div>
          )}
          <div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.2,
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: 10, color: "rgba(0,0,0,0.40)", marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Nav items ────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "16px 0", overflowY: "auto" }}>
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href as never}
            className={`epl-sub-nav-item ${activePage === item.key ? " epl-sub-active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
            {!collapsed && <span className="epl-sub-nav-label" style={{ flex: 1 }}>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* ── User + Sign out (copied from main Sidebar) ───── */}
      <div style={{
        padding: "10px 12px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        marginTop: "auto"
      }}>
        {/* User row */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6, overflow: "hidden" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#4150A3",
            border: "1px solid rgba(255, 255, 255, 0.20)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            fontSize: 12, fontWeight: 600, color: "#fff",
          }}>
            {initial}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name ?? "Admin"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(0,0,0,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email ?? ""}
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="epl-sub-nav-item"
          title={collapsed ? "Sign out" : undefined}
          style={{ 
            width: "100%", padding: "8px 12px", margin: "2px 0",
            display: "flex", alignItems: "center", gap: 10,
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(0,0,0,0.50)", fontSize: 12, fontWeight: 600,
            justifyContent: collapsed ? "center" : "flex-start"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#E05C5C")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(0,0,0,0.50)")}
        >
          <IconLogout size={16} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
