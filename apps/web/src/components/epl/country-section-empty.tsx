"use client";

type Props = {
  title: string;
  description?: string;
  accent?: string;
};

/** Empty / zero-state panel for live country hub sections with no data yet. */
export function CountrySectionEmpty({
  title,
  description = "No records yet for this hub. Data will appear here once your team enters or syncs it.",
  accent = "#4150A3",
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "56px 24px",
        borderRadius: 14,
        border: "1px dashed rgba(255,255,255,0.12)",
        background: `radial-gradient(ellipse at 50% 0%, ${accent}18, transparent 55%), rgba(255,255,255,0.02)`,
        textAlign: "center",
        minHeight: 220,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 800,
          color: "var(--ewhite)",
          fontFamily: "var(--font)",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: "var(--emuted)",
          maxWidth: 380,
          lineHeight: 1.5,
          fontFamily: "var(--font)",
        }}
      >
        {description}
      </p>
    </div>
  );
}

export function CountrySectionSkeleton({ accent = "#4150A3" }: { accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} aria-busy="true">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="gc" style={{ padding: 18, height: 72 }}>
            <div className="co-skel" style={{ width: "40%", height: 14, borderRadius: 6, marginBottom: 10 }} />
            <div className="co-skel" style={{ width: "55%", height: 20, borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div className="gc" style={{ padding: 20, minHeight: 240 }}>
        <div className="co-skel" style={{ width: 160, height: 14, borderRadius: 6, marginBottom: 16 }} />
        <div className="co-skel" style={{ width: "100%", height: 180, borderRadius: 12 }} />
      </div>
      <span style={{ display: "none" }}>{accent}</span>
    </div>
  );
}
