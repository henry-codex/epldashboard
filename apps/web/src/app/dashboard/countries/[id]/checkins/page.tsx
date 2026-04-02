"use client";

import { useParams } from "next/navigation";
import { CountryLayout } from "@/components/epl/country-layout";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import { IconCircleCheck, IconClock, IconAlertTriangle } from "@tabler/icons-react";

export default function CountryCheckinsPage() {
  const params = useParams();
  const id = params?.id as CountryId;
  const country = COUNTRIES_MAP[id];
  if (!country) return null;

  // Mock check-in data per institution
  const institutions = Array.from({ length: country.institutions }, (_, i) => ({
    name: `Institution ${i + 1}`,
    status: i < Math.floor(country.institutions * country.checkInRate / 100) ? "submitted" as const
      : i < country.institutions - 1 ? "late" as const : "overdue" as const,
    date: i < Math.floor(country.institutions * country.checkInRate / 100) ? "Mar 28, 2026" : "—",
  }));

  const submitted = institutions.filter(i => i.status === "submitted").length;
  const late = institutions.filter(i => i.status === "late").length;
  const overdue = institutions.filter(i => i.status === "overdue").length;

  return (
    <CountryLayout activePage="checkins" pageTitle="Check-ins">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Check-in Compliance — {country.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>
            {country.checkInRate}% compliance rate · {country.institutions} institutions
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Submitted", count: submitted, color: "#2EC27E", icon: <IconCircleCheck size={18} /> },
            { label: "Late", count: late, color: "#E8A020", icon: <IconClock size={18} /> },
            { label: "Overdue", count: overdue, color: "#E05C5C", icon: <IconAlertTriangle size={18} /> },
          ].map((s) => (
            <div key={s.label} className="gc" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${s.color}15`, border: `1px solid ${s.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center", color: s.color,
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{s.count}</div>
                <div style={{ fontSize: 10, color: "var(--emuted)", fontFamily: "var(--font)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Global progress bar */}
        <div className="gc" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)" }}>Overall Compliance</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: country.color, fontFamily: "var(--font)" }}>{country.checkInRate}%</span>
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ width: `${country.checkInRate}%`, height: "100%", borderRadius: 4, background: country.color }} />
          </div>
        </div>

        {/* Institution rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {institutions.map((inst, i) => (
            <div key={i} className="gc" style={{
              padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{inst.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{inst.date}</span>
                {inst.status === "submitted" && <IconCircleCheck size={16} style={{ color: "#2EC27E" }} />}
                {inst.status === "late" && <IconClock size={16} style={{ color: "#E8A020" }} />}
                {inst.status === "overdue" && <IconAlertTriangle size={16} style={{ color: "#E05C5C" }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </CountryLayout>
  );
}
