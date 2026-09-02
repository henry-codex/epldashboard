"use client";

import { useRouter } from "next/navigation";
import { IconLock, IconArrowLeft } from "@tabler/icons-react";

/** Phase 1: individual fellow profiles are not available (aggregate-only beta). */
export default function FellowProfilePage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "60vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16, padding: 40,
      fontFamily: "var(--font)",
    }}>
      <IconLock size={32} style={{ color: "var(--emuted)" }} />
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--ewhite)" }}>
        Individual profiles — Phase 2
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)", textAlign: "center", maxWidth: 420, lineHeight: 1.5 }}>
        Phase 1 shows aggregate network data only. Person-level profiles return once access tiers and privacy controls are in place.
      </p>
      <button
        onClick={() => router.push("/dashboard/fellows")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          marginTop: 8, padding: "10px 16px", borderRadius: 8,
          border: "1px solid var(--gborder)", background: "var(--gb)",
          color: "var(--ewhite)", cursor: "pointer", fontFamily: "var(--font)", fontSize: 12,
        }}
      >
        <IconArrowLeft size={14} /> Back to Network
      </button>
    </div>
  );
}
