"use client";

import Link from "next/link";
import { IconDatabaseX, IconShieldLock, IconUserCircle, IconUsers } from "@tabler/icons-react";

type Props = {
  hubId: string;
  activeTab: "users" | "profile" | "data";
  accent: string;
  canManageUsers: boolean;
  children: React.ReactNode;
};

export function CountrySettingsShell({ hubId, activeTab, accent, canManageUsers, children }: Props) {
  const base = `/dashboard/countries/${hubId}/settings`;

  const tabs = [
    ...(canManageUsers
      ? [{ key: "users" as const, label: "Country managers", hint: "Invite country administrators", icon: <IconUsers size={18} /> }]
      : []),
    { key: "profile" as const, label: "My profile", hint: "Your profile and account security", icon: <IconUserCircle size={18} /> },
    { key: "data" as const, label: "Clear hub data", hint: "Delete all of this hub's records", icon: <IconDatabaseX size={18} /> },
  ];

  return (
    <div
      className="cs-settings-grid"
      style={{ display: "grid", gridTemplateColumns: "minmax(220px, 260px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}
    >
      <aside className="gc" style={{ padding: 10, position: "sticky", top: 16 }}>
        <div style={{ padding: "10px 12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font)" }}>
            Hub settings
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Link
                key={tab.key}
                href={`${base}/${tab.key}` as never}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  background: active ? `${accent}18` : "transparent",
                  border: `1px solid ${active ? `${accent}40` : "transparent"}`,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ color: active ? accent : "var(--emuted)", marginTop: 1 }}>{tab.icon}</span>
                <span>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: active ? "var(--ewhite)" : "var(--emuted)", fontFamily: "var(--font)" }}>
                    {tab.label}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--emuted)", marginTop: 2, lineHeight: 1.35, fontFamily: "var(--font)" }}>
                    {tab.hint}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
        {canManageUsers && (
          <div style={{ marginTop: 14, padding: "12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: accent, marginBottom: 6 }}>
              <IconShieldLock size={16} />
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font)" }}>Access control</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "var(--emuted)", lineHeight: 1.45, fontFamily: "var(--font)" }}>
              Recipients get hub access after accepting their email invitation.
            </p>
          </div>
        )}
      </aside>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
