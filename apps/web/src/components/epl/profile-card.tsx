interface ProfileRow {
  label: string;
  value: string;
}

const ROWS: ProfileRow[] = [
  { label: "Email",      value: "g.asante@epl.org" },
  { label: "Location",   value: "Accra, Ghana" },
  { label: "Access",     value: "Super Admin" },
  { label: "Last login", value: "Today, 08:14" },
];

export function ProfileCard() {
  return (
    <div className="gc" style={{ padding: "18px 16px", textAlign: "center" }}>
      {/* Avatar */}
      <div
        style={{
          width: 52, height: 52, borderRadius: "50%", margin: "0 auto 10px",
          background: "rgba(59,139,235,0.25)",
          border: "2px solid rgba(59,139,235,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, color: "#B5D4F4",
        }}
      >
        GA
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)" }}>Grace Asante</div>
      <div
        style={{
          display: "inline-block", marginTop: 5, padding: "2px 10px",
          borderRadius: "var(--rf)", fontSize: 9, fontWeight: 600,
          background: "rgba(59,139,235,0.18)", color: "var(--eblue)",
        }}
      >
        Super Admin
      </div>

      {/* divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "14px 0" }} />

      {/* info rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
        {ROWS.map((row) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--emuted)", flexShrink: 0 }}>{row.label}</span>
            <span style={{ fontSize: 10, color: "var(--ewhite)", textAlign: "right", minWidth: 0, wordBreak: "break-all" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
