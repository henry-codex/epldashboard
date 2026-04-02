"use client";
import { useState } from "react";

const navItems = ["Dashboard", "Fellows", "Check-ins", "Map", "Reports"];

export function EPLTopbar() {
  const [active, setActive] = useState("Dashboard");

  return (
    <div className="epl-topbar">
      {/* Logo */}
      <div
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: "var(--eblue)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
        }}
      >
        E
      </div>

      {/* Nav links */}
      <nav style={{ display: "flex", gap: 2, flex: 1 }}>
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => setActive(item)}
            style={{
              padding: "5px 12px",
              borderRadius: "var(--rf)",
              fontSize: 12,
              color: active === item ? "var(--ewhite)" : "var(--emuted)",
              background: active === item ? "rgba(255,255,255,0.1)" : "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font)",
              fontWeight: active === item ? 500 : 400,
              transition: "all 0.15s",
            }}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Search */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid var(--gborder)",
          borderRadius: "var(--rf)",
          fontSize: 12, color: "var(--emuted)",
          minWidth: 160,
        }}
      >
        <span>⌕</span> Search fellows...
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "rgba(65, 80, 163, 0.35)",
          border: "1px solid rgba(65, 80, 163, 0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color: "#D1D9FF", flexShrink: 0,
        }}
      >
        GA
      </div>

      {/* User info */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ewhite)" }}>Grace Asante</div>
        <div style={{ fontSize: 10, color: "var(--emuted)" }}>Super Admin</div>
      </div>
    </div>
  );
}
