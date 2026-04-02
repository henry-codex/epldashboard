type EventType = "checkin" | "placement" | "review" | "alert";

interface ActivityEvent {
  id: number;
  type: EventType;
  text: string;
  time: string;
}

const EVENTS: ActivityEvent[] = [
  { id: 1, type: "checkin",   text: "Kwame Mensah submitted weekly check-in",        time: "2m ago" },
  { id: 2, type: "placement", text: "Fatima Diallo placed at BrightHive Energy, GH", time: "11m ago" },
  { id: 3, type: "review",    text: "Monthly cohort review completed — Sierra Leone", time: "34m ago" },
  { id: 4, type: "checkin",   text: "Amara Koroma submitted bi-weekly check-in",     time: "1h ago" },
  { id: 5, type: "alert",     text: "3 fellows missed deadline in Malawi",           time: "2h ago" },
  { id: 6, type: "placement", text: "Ibrahim Sesay placed at NovaTech Solutions, SL", time: "3h ago"},
];

const DOT_COLORS: Record<EventType, string> = {
  checkin:   "var(--eblue)",
  placement: "var(--egreen)",
  review:    "var(--egold)",
  alert:     "var(--ered)",
};

export function ActivityFeed() {
  return (
    <div className="gc" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)" }}>Activity Feed</div>
          <div style={{ fontSize: 10, color: "var(--emuted)" }}>All countries · real-time</div>
        </div>
        <span style={{ fontSize: 9, color: "var(--eblue)", cursor: "pointer" }}>View all →</span>
      </div>

      {/* events */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {EVENTS.map((ev, i) => (
          <div
            key={ev.id}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: 12,
              borderBottom: i < EVENTS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              marginBottom: i < EVENTS.length - 1 ? 12 : 0,
            }}
          >
            {/* dot */}
            <div
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: DOT_COLORS[ev.type],
                flexShrink: 0, marginTop: 3,
                boxShadow: `0 0 6px ${DOT_COLORS[ev.type]}`,
              }}
            />
            {/* text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--ewhite)", lineHeight: 1.4 }}>{ev.text}</div>
              <div style={{ fontSize: 10, color: "var(--ehint)", marginTop: 2 }}>{ev.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
