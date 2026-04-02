"use client";

import { AlumniLayout } from "@/components/epl/alumni-layout";
import { COUNTRIES } from "@/lib/mock-data";

export default function AlumniHighlightsPage() {
  const allAlumni = COUNTRIES.flatMap((c) =>
    c.alumniHighlights.map((a) => ({ ...a, country: c.name, flag: c.flag, color: c.color }))
  );

  return (
    <AlumniLayout activePage="highlights" pageTitle="Highlights">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Alumni Highlights</div>
          <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            Stories of impact from our alumni network
          </div>
        </div>

        {/* Featured alumni cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {allAlumni.map((a, i) => (
            <div key={i} className="gc" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${a.color}22`, color: a.color, fontSize: 16, fontWeight: 700, fontFamily: "var(--font)",
                  border: `2px solid ${a.color}44`,
                }}>
                  {a.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{a.role}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99, fontFamily: "var(--font)",
                  background: `${a.color}15`, color: a.color,
                }}>
                  {a.flag} {a.country}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99, fontFamily: "var(--font)",
                  background: "rgba(46,194,126,0.12)", color: "#2EC27E",
                }}>
                  Cohort {a.cohort}
                </span>
              </div>
              <div style={{
                marginTop: 12, padding: "10px 14px", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                fontSize: 11, lineHeight: 1.6, color: "var(--emuted)", fontFamily: "var(--font)",
              }}>
                A distinguished EPL Fellow alumnus from the Class of {a.cohort}, currently serving as {a.role}. Continues to contribute to the fellowship community through mentorship and advocacy.
              </div>
            </div>
          ))}
        </div>
      </div>
    </AlumniLayout>
  );
}
