"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconChevronRight,
  IconChevronLeft,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PROFILE_PATH } from "@/lib/account-settings";
import { queryClient } from "@/utils/trpc";
import { toast } from "sonner";
import { userAvatarUrl } from "@/lib/user-avatar";

export interface SubNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string | number;
}

interface Props {
  backLabel?: string;
  backHref?: string;
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("epl-sub-sidebar-collapsed");
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        sessionStorage.setItem("epl-sub-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function handleSignOut() {
    try {
      const result = await authClient.signOut();
      if (result.error) { toast.error("Could not sign out. Please try again."); return; }
      queryClient.clear();
      router.replace("/login");
    } catch { toast.error("Could not reach the server. Please try again."); }
  }

  const displayName = user?.name?.trim() || "Admin";
  const email = user?.email ?? "";
  const avatarSrc = user ? userAvatarUrl(user, 96) : "";
  const settingsHref = PROFILE_PATH;
  const showBack = Boolean(backLabel && backHref);

  const collapseBtn = (
    <button
      type="button"
      className="epl-sub-collapse"
      onClick={toggleCollapsed}
      title={collapsed ? "Expand" : "Collapse"}
    >
      {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
    </button>
  );

  return (
    <aside
      className={`epl-sub-sidebar${collapsed ? " epl-collapsed" : ""}${ready ? " epl-ready" : ""}${showBack ? "" : " epl-sub-no-back"}`}
      style={{ fontFamily: "var(--font)", ["--sub-accent" as string]: accent }}
    >
      {showBack && (
        <div className="epl-sub-header">
          <button
            type="button"
            className="epl-sub-back"
            onClick={() => router.push(backHref as never)}
            title={backLabel}
          >
            <IconArrowLeft size={14} />
            {!collapsed && <span>{backLabel}</span>}
          </button>
          {collapseBtn}
        </div>
      )}

      <div className="epl-sub-brand">
        {titleIcon && <div className="epl-sub-brand-icon">{titleIcon}</div>}
        {!collapsed && (
          <div className="epl-sub-brand-text">
            <div className="epl-sub-brand-title">{title}</div>
            {subtitle && <div className="epl-sub-brand-sub">{subtitle}</div>}
          </div>
        )}
        {!showBack && collapseBtn}
      </div>

      <nav className="epl-sub-nav">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href as never}
            className={`epl-sub-nav-item${activePage === item.key ? " epl-sub-active" : ""}`}
            title={collapsed ? item.label : undefined}
          >
            <span className="epl-sub-nav-icon">{item.icon}</span>
            {!collapsed && <span className="epl-sub-nav-label">{item.label}</span>}
            {!collapsed && item.badge != null && (
              <span className="epl-sub-nav-badge">{item.badge}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="epl-sub-footer">
        <div className={`epl-sub-profile${collapsed ? " is-collapsed" : ""}`}>
          <Link
            href={settingsHref as never}
            className="epl-sub-user"
            title={collapsed ? displayName : "Open profile settings"}
          >
            <div className="epl-sub-avatar">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            {!collapsed && (
              <div className="epl-sub-user-meta">
                <div className="epl-sub-user-name">{displayName}</div>
                <div className="epl-sub-user-email">{email || "Account"}</div>
              </div>
            )}
            {!collapsed && (
              <span className="epl-sub-user-action" aria-hidden>
                <IconUser size={13} />
              </span>
            )}
          </Link>
          <button
            type="button"
            className="epl-sub-signout"
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
