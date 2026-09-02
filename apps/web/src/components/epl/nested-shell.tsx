"use client";

import { SubSidebar, type SubNavItem } from "./sub-sidebar";
import { DashHeader } from "./dash-header";
import { useTheme } from "@/hooks/use-theme";

interface Props {
  children: React.ReactNode;
  /* Sub-sidebar config */
  backLabel?: string;
  backHref?: string;
  sectionTitle: string;
  sectionIcon?: React.ReactNode;
  sectionSubtitle?: string;
  accent?: string;
  navItems: SubNavItem[];
  activePage: string;
  /* Header config */
  pageTitle: string;
  breadcrumbs?: { label: string; href?: string }[];
  user?: { name?: string; email?: string; image?: string } | null;
}

export function NestedShell({
  children,
  backLabel,
  backHref,
  sectionTitle,
  sectionIcon,
  sectionSubtitle,
  accent,
  navItems,
  activePage,
  pageTitle,
  breadcrumbs,
  user,
}: Props) {
  const { theme, toggle } = useTheme();

  return (
    <div className={`epl-shell${theme === "light" ? " epl-light" : ""}`}>
      {/* Ambient orbs */}
      <div className="epl-orb" style={{ width: 500, height: 500, top: -120, left: 160,  background: "rgba(59,139,235,0.22)",  zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 400, height: 400, bottom: -60, right: 80,  background: "rgba(46,194,126,0.15)",  zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 280, height: 280, top: "38%", right: "28%", background: "rgba(155,89,182,0.13)", zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 200, height: 200, top: "60%", left: "15%",  background: "rgba(232,160,32,0.10)",  zIndex: 0 }} />

      <div className="epl-app" style={{ position: "relative", zIndex: 1 }}>
        {/* Section-specific sub-sidebar */}
        <SubSidebar
          backLabel={backLabel}
          backHref={backHref}
          title={sectionTitle}
          titleIcon={sectionIcon}
          subtitle={sectionSubtitle}
          accent={accent}
          navItems={navItems}
          activePage={activePage}
          user={user}
        />

        {/* Main content */}
        <div className="epl-main">
          <DashHeader
            title={pageTitle}
            breadcrumbs={breadcrumbs}
            logoHref={navItems.find((item) => item.key === "overview")?.href ?? backHref ?? "/dashboard"}
            searchPlaceholder={`Search in ${sectionTitle}…`}
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
