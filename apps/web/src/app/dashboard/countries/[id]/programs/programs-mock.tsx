"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { type Project, type CountryData } from "@/lib/mock-data";
import {
  IconTarget,
  IconChartBar,
  IconUsers,
  IconBuildingBank,
  IconCalendarEvent,
  IconX,
  IconHeartHandshake,
  IconChartPie,
  IconTrendingUp,
  IconAward,
} from "@tabler/icons-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type ExtendedProject = Project & {
  description: string;
  impactMetrics: { key: string; val: string; icon: typeof IconUsers }[];
  cohortData: { name: string; placed: number; target: number }[];
};

export default function MockPrograms({ country }: { country: CountryData }) {
  const router = useRouter();
  const id = country.id;
  const [selectedProject, setSelectedProject] = useState<ExtendedProject | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedProject(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const getExtendedData = (p: Project): ExtendedProject => {
    if (p.name.includes("Women")) {
      return {
        ...p,
        description: "A transformative initiative addressing systemic barriers that prevent women from leadership in the Public Service.",
        impactMetrics: [
          { key: "Women Empowered", val: "45+", icon: IconUsers },
          { key: "Policy Briefs", val: "12", icon: IconTarget },
          { key: "Adoption Rate", val: "85%", icon: IconChartBar },
        ],
        cohortData: [
          { name: "2024", placed: 20, target: 20 },
          { name: "2025", placed: 22, target: 25 },
        ],
      };
    }
    if (p.name.includes("P.E.A.C.E")) {
      return {
        ...p,
        description: "Equipping security service professionals and community leaders with leadership and peacebuilding skills.",
        impactMetrics: [
          { key: "Trained Officers", val: "120", icon: IconUsers },
          { key: "Communities", val: "14", icon: IconBuildingBank },
          { key: "Conflict Res.", val: "94%", icon: IconHeartHandshake },
        ],
        cohortData: [
          { name: "2024", placed: 15, target: 15 },
          { name: "2025", placed: 30, target: 40 },
        ],
      };
    }
    return {
      ...p,
      description: "Our flagship one-year journey of growth, innovation, and leadership in public service.",
      impactMetrics: [
        { key: "Total Alumni", val: "142", icon: IconUsers },
        { key: "Gov Partners", val: "22", icon: IconBuildingBank },
        { key: "Retention", val: "91%", icon: IconTrendingUp },
      ],
      cohortData: [
        { name: "2022", placed: 18, target: 20 },
        { name: "2023", placed: 20, target: 20 },
        { name: "2024", placed: 22, target: 25 },
      ],
    };
  };

  const extendedProjects = country.projects.map(getExtendedData);
  const totalFellows = extendedProjects.reduce((acc, p) => acc + p.fellows, 0);

  return (
    <>
      <div className="gc" style={{ padding: 32, borderRadius: 24, marginBottom: 32, border: "1px solid var(--gborder)", position: "relative", overflow: "hidden", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ position: "absolute", top: -50, right: 100, width: 200, height: 200, background: `radial-gradient(circle, ${country.color}40 0%, transparent 70%)`, borderRadius: "50%", filter: "blur(40px)" }} />
        <div style={{ zIndex: 1 }}>
          <div style={{ fontSize: 13, color: country.color, fontWeight: 800, fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 }}>
            {country.name} Operations Hub
          </div>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Project Portfolio
          </h1>
        </div>
        <div style={{ zIndex: 1, display: "flex", gap: 24 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{totalFellows}</div>
            <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)", textTransform: "uppercase" }}>Active Personnel</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {extendedProjects.map((p) => {
          const progress = p.status === "completed" ? 100 : p.name.includes("P") ? 35 : p.name.includes("Women") ? 55 : 85;
          const PIcon = p.name.includes("Women") ? IconHeartHandshake : p.name.includes("P") ? IconTarget : IconAward;
          return (
            <div key={p.name} onClick={() => setSelectedProject(p)} className="gc" style={{ padding: 24, borderRadius: 20, cursor: "pointer", display: "grid", gridTemplateColumns: "auto 1fr 200px 200px", gap: 30, alignItems: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: `${country.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: country.color }}>
                <PIcon size={32} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{p.name}</h2>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>{p.description}</p>
              </div>
              <div style={{ paddingLeft: 24, borderLeft: "1px solid var(--gborder)" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{p.impactMetrics[0].val}</div>
              </div>
              <div style={{ paddingLeft: 24, borderLeft: "1px solid var(--gborder)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: country.color, fontFamily: "var(--font)", marginBottom: 8 }}>{progress}%</div>
                <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: country.color, borderRadius: 10 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedProject && (
        <div onClick={() => setSelectedProject(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 500, height: "100%", background: "var(--gbs)", borderLeft: "1px solid var(--gborder)", overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{selectedProject.name}</h2>
              <button type="button" onClick={() => setSelectedProject(null)} style={{ background: "transparent", border: "none", color: "var(--ewhite)", cursor: "pointer" }}><IconX size={18} /></button>
            </div>
            <p style={{ color: "var(--emuted)", fontSize: 13, lineHeight: 1.6 }}>{selectedProject.description}</p>
            <div style={{ height: 200, marginTop: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedProject.cohortData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gborder)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--emuted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--emuted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--gbs)", border: "1px solid var(--gborder)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="placed" name="Retained" fill={country.color} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" fill={`${country.color}40`} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <button type="button" onClick={() => router.push(`/dashboard/countries/${id}/programs/${selectedProject.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)} style={{ marginTop: 24, padding: "12px 20px", borderRadius: 10, border: "1px solid var(--gborder)", background: "transparent", color: "var(--ewhite)", cursor: "pointer" }}>
              More Details
            </button>
          </div>
        </div>
      )}
    </>
  );
}
