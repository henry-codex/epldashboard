"use client";

import { useEffect, useState } from "react";
import { EPLSidebar } from "./sidebar";
import { DashHeader } from "./dash-header";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  children: React.ReactNode;
  activePage?: string;
  pageTitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  user?: { name?: string; email?: string; image?: string } | null;
};

export function AppShell({
  children,
  activePage = "overview",
  pageTitle = "Overview",
  breadcrumbs,
  user,
}: Props) {
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("epl-sidebar-collapsed");
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try {
        sessionStorage.setItem("epl-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div
      className={`epl-shell${theme === "light" ? " epl-light" : ""}`}
    >
      {/* Ambient orbs — provide colors for glass to reflect */}
      <div className="epl-orb" style={{ width: 500, height: 500, top: -120, left: 160,  background: "rgba(65, 80, 163, 0.25)",  zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 400, height: 400, bottom: -60, right: 80,  background: "rgba(46,194,126,0.15)",  zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 280, height: 280, top: "38%", right: "28%", background: "rgba(155,89,182,0.13)", zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 200, height: 200, top: "60%", left: "15%",  background: "rgba(244, 189, 18, 0.15)",  zIndex: 0 }} />

      {/* App layout */}
      <div className="epl-app" style={{ position: "relative", zIndex: 1 }}>

        {/* Sidebar */}
        <EPLSidebar
          collapsed={collapsed}
          onCollapse={handleCollapse}
          activePage={activePage}
          user={user}
          ready={ready}
        />

        {/* Main */}
        <div className="epl-main">
          <DashHeader
            title={pageTitle}
            breadcrumbs={breadcrumbs}
            theme={theme}
            onThemeToggle={toggle}
            user={user}
          />
          <main className="epl-page">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
