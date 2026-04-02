type FellowStatus = "active" | "pending" | "completed";

interface Fellow {
  id: number;
  initials: string;
  name: string;
  location: string;
  status: FellowStatus;
  avatarColor: string;
}

const FELLOWS: Fellow[] = [
  { id: 1, initials: "KM", name: "Kwame Mensah",   location: "Accra, GH",    status: "active",    avatarColor: "rgba(59,139,235,0.35)" },
  { id: 2, initials: "FA", name: "Fatima Diallo",  location: "Nairobi, KE",  status: "active",    avatarColor: "rgba(46,194,126,0.25)" },
  { id: 3, initials: "AK", name: "Amara Koroma",   location: "Freetown, SL", status: "pending",   avatarColor: "rgba(232,160,32,0.25)" },
  { id: 4, initials: "IS", name: "Ibrahim Sesay",  location: "Monrovia, LR", status: "completed", avatarColor: "rgba(155,89,182,0.25)" },
  { id: 5, initials: "NT", name: "Nana Twum",      location: "Blantyre, MW", status: "pending",   avatarColor: "rgba(224,92,92,0.25)" },
];

const STATUS_STYLE: Record<FellowStatus, { bg: string; color: string; label: string }> = {
  active:    { bg: "rgba(46,194,126,0.18)",  color: "#2EC27E",  label: "Active" },
  pending:   { bg: "rgba(232,160,32,0.18)",  color: "#E8A020",  label: "Pending" },
  completed: { bg: "rgba(59,139,235,0.18)",  color: "#3B8BEB",  label: "Done" },
};

export function FellowsList() {
  return (
    <div className="gc" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ewhite)" }}>Recent Fellows</div>
        <span style={{ fontSize: 9, color: "var(--eblue)", cursor: "pointer" }}>All →</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {FELLOWS.map((f) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {/* avatar */}
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: f.avatarColor,
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "var(--ewhite)",
              }}
            >
              {f.initials}
            </div>

            {/* name + location */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--ewhite)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {f.name}
              </div>
              <div style={{ fontSize: 9, color: "var(--emuted)" }}>{f.location}</div>
            </div>

            {/* status badge */}
            <span
              style={{
                padding: "2px 7px", borderRadius: "var(--rf)", fontSize: 9, fontWeight: 600, flexShrink: 0,
                background: STATUS_STYLE[f.status].bg,
                color: STATUS_STYLE[f.status].color,
              }}
            >
              {STATUS_STYLE[f.status].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
