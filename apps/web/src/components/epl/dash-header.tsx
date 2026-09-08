"use client";

import Link from "next/link";
import {
  IconBell,
  IconSun,
  IconMoon,
  IconChevronRight,
  IconSearch,
} from "@tabler/icons-react";
import type { Theme } from "@/hooks/use-theme";
import { NavProfileMenu } from "./nav-profile-menu";

type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  minimal?: boolean;
  breadcrumbs?: Crumb[];
  logoHref?: string;
  searchPlaceholder?: string;
  theme: Theme;
  onThemeToggle: () => void;
  user?: { name?: string; email?: string; image?: string } | null;
};

export function DashHeader({
  title,
  minimal = false,
  breadcrumbs = [],
  logoHref = "/dashboard",
  searchPlaceholder = "Search for fellows, programs, or regions...",
  theme,
  onThemeToggle,
  user,
}: Props) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <header className="epl-dash-header">
      {/* Left: EPL logo + breadcrumbs + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <Link href={logoHref as never} className="epl-nav-brand epl-nav-brand-logo-only" title="EPL">
          <span className="epl-nav-brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/EPL_logo_square-block.webp" alt="EPL" />
          </span>
        </Link>
        {(breadcrumbs.length > 0 || title) && <span className="epl-nav-brand-divider" aria-hidden />}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {breadcrumbs.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--e-text-sec)" }}>
              {breadcrumbs.map((b, i) => (
                <span key={`${b.label}-${i}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {b.href ? (
                    <a href={b.href} style={{ color: "var(--e-text-sec)", textDecoration: "none" }}>{b.label}</a>
                  ) : (
                    <span>{b.label}</span>
                  )}
                  {(i < breadcrumbs.length - 1 || title) && <IconChevronRight size={12} />}
                </span>
              ))}
            </div>
          )}
          {title && (
            <h1 style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--e-text-pri)",
              margin: 0,
              fontFamily: "var(--font)",
              whiteSpace: "nowrap",
            }}>
              {title}
            </h1>
          )}
        </div>
      </div>

      {/* Center: Search Bar */}
      {!minimal && <div style={{ flex: 1, maxWidth: 400, margin: "0 24px", position: "relative" }}>
        <IconSearch size={16} style={{ 
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: "var(--e-text-sec)", pointerEvents: "none"
        }} />
        <input 
          type="text" 
          placeholder={searchPlaceholder}
          style={{
            width: "100%",
            height: 34,
            padding: "0 12px 0 36px",
            background: "rgba(120, 150, 255, 0.08)",
            border: "1px solid rgba(120, 150, 255, 0.15)",
            borderRadius: "var(--r1)",
            fontSize: 12,
            color: "var(--e-text-pri)",
            outline: "none",
            transition: "all 0.2s ease",
            fontFamily: "var(--font)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = "rgba(120, 150, 255, 0.12)";
            e.currentTarget.style.borderColor = "rgba(65, 80, 163, 0.45)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(65, 80, 163, 0.15)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = "rgba(120, 150, 255, 0.08)";
            e.currentTarget.style.borderColor = "rgba(120, 150, 255, 0.15)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>}

      {/* Right: date, bell, theme toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Date chip */}
        {!minimal && <><div style={{
          padding: "3px 10px",
          borderRadius: "6px",
          background: "rgba(120, 150, 255, 0.12)",
          border: "1px solid rgba(120, 150, 255, 0.20)",
          fontSize: 11,
          color: "var(--e-text-pri)",
          fontFamily: "var(--font)",
          display: "flex",
          alignItems: "center",
          fontWeight: 600
        }}> {dateStr}
        </div>

        {/* Notification bell */}
        <button className="epl-icon-btn" title="Notifications" style={{ 
          position: "relative",
          background: "transparent",
          color: "var(--e-text-pri)",
          borderColor: "rgba(128, 128, 128, 0.20)"
        }}>
          <IconBell size={16} />
          {/* Notification dot */}
          <span style={{
            position: "absolute",
            top: 7, right: 7,
            width: 6, height: 6,
            borderRadius: "50%",
            background: "#4150A3",
            border: "1.5px solid #FFF",
            boxShadow: "0 0 4px #4150A3",
          }} />
        </button></>}

        {/* Theme toggle */}
        <button
          className="epl-icon-btn"
          onClick={onThemeToggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{ 
            color: theme === "light" ? "var(--egold)" : "var(--e-text-pri)",
            background: "transparent",
            borderColor: "rgba(128, 128, 128, 0.20)"
          }}
        >
          {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>

        <NavProfileMenu user={user} />
      </div>
    </header>
  );
}
