"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  IconUsers,
  IconBuildingCommunity,
  IconGlobe,
  IconAccessible,
  IconSchool,
  IconAward,
} from "@tabler/icons-react";
import { CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { trpc } from "@/utils/trpc";

const GENDER_COLORS: Record<string, string> = {
  Female: "#7F77DD",
  Male: "#3B8BEB",
  Other: "#E8A020",
  "Not specified": "#64748B",
};

const DISABILITY_COLORS: Record<string, string> = {
  Yes: "#9B59B6",
  No: "#2EC27E",
  "Not specified": "#64748B",
};

const PROGRAM_COLORS = ["#4150A3", "#3B8BEB", "#2EC27E", "#E8A020", "#9B59B6", "#E05C5C"];

type BreakdownItem = { name: string; count: number };

type Props = {
  tenantId: string;
  accent: string;
  activeFellows: number;
  alumniLeaders: number;
  totalNetwork: number;
};

function ChartEmpty({ title, message }: { title: string; message: string }) {
  return (
    <div className="network-breakdown-empty">
      <div className="network-breakdown-empty-title">{title}</div>
      <div className="network-breakdown-empty-copy">{message}</div>
    </div>
  );
}

const chartTooltipStyle = {
  background: "var(--eglass)",
  border: "1px solid var(--eborder)",
  borderRadius: 10,
  color: "var(--ewhite)",
  fontFamily: "var(--font)",
};

function BreakdownPieChart({
  items,
  colors,
  innerRadius = 58,
}: {
  items: BreakdownItem[];
  colors: Record<string, string> | string[];
  innerRadius?: number;
}) {
  const pieData = items.map((item, index) => {
    const color = Array.isArray(colors)
      ? colors[index % colors.length]!
      : colors[item.name] ?? colors[Object.keys(colors)[0]!] ?? "#4150A3";
    return { name: item.name, value: item.count, color };
  });

  return (
    <div style={{ flex: 1, minHeight: 240 }}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={88}
            paddingAngle={pieData.length > 1 ? 4 : 0}
            dataKey="value"
            stroke="none"
          >
            {pieData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetworkAggregateView({
  tenantId,
  accent,
  activeFellows,
  alumniLeaders,
  totalNetwork,
}: Props) {
  const demographicsQuery = useQuery(
    trpc.fellows.demographics.queryOptions({ tenantId }),
  );

  const stats = [
    {
      label: "Active Fellows",
      value: activeFellows,
      accent,
      icon: <IconUsers size={24} />,
    },
    {
      label: "Alumni",
      value: alumniLeaders,
      accent: "#9B59B6",
      icon: <IconBuildingCommunity size={24} />,
    },
    {
      label: "Total Network",
      value: totalNetwork,
      accent: "#2EC27E",
      icon: <IconGlobe size={24} />,
    },
  ];

  const data = demographicsQuery.data;
  const total = data?.total ?? totalNetwork;
  const mcfFellows = data?.mcfFellows ?? 0;
  const programData = data?.programs ?? [];
  const genderData = data?.gender ?? [];
  const disabilityData = data?.disability ?? [];
  const statusData = data?.status ?? [];
  const cohortData = (data?.cohorts ?? []).map((item) => ({
    name: item.name,
    Fellows: item.count,
  }));

  const hasData = totalNetwork > 0;

  return (
    <div className="network-aggregate">
      <div className="network-aggregate-stats">
        {stats.map((item) => (
          <div key={item.label} className="gc network-aggregate-stat">
            <div
              className="network-aggregate-stat-icon"
              style={{
                background: `${item.accent}15`,
                borderColor: `${item.accent}30`,
                color: item.accent,
              }}
            >
              {item.icon}
            </div>
            <div>
              <div className="network-aggregate-stat-label">{item.label}</div>
              <div className="network-aggregate-stat-value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {demographicsQuery.isLoading ? (
        <CountrySectionSkeleton accent={accent} />
      ) : !hasData ? (
        <ChartEmpty
          title="Demographics will appear here"
          message="Once country managers add fellows with program, gender, and disability fields, aggregate charts will populate automatically."
        />
      ) : (
        <>
          <section className="gc network-aggregate-section">
            <div className="network-aggregate-section-head">
              <IconAward size={18} style={{ color: "#E8A020" }} />
              <div>
                <h3>Mastercard Foundation fellows</h3>
                <p>MCF-supported fellows in this hub — aggregate count only, no individual names.</p>
              </div>
            </div>
            <div className="network-mcf-cards">
              <div className="network-mcf-card network-mcf-card-primary" style={{ ["--card-accent" as string]: "#E8A020" }}>
                <div className="network-mcf-card-label">MCF fellows</div>
                <div className="network-mcf-card-value">{mcfFellows}</div>
                <div className="network-mcf-card-meta">
                  {total > 0 ? `${Math.round((mcfFellows / total) * 100)}% of total network` : "—"}
                </div>
              </div>
              <div className="network-mcf-card" style={{ ["--card-accent" as string]: accent }}>
                <div className="network-mcf-card-label">Other fellows</div>
                <div className="network-mcf-card-value">{Math.max(0, total - mcfFellows)}</div>
                <div className="network-mcf-card-meta">Non-MCF program track</div>
              </div>
            </div>
          </section>

          <section className="gc network-aggregate-section">
            <div className="network-aggregate-section-head">
              <IconSchool size={18} style={{ color: accent }} />
              <div>
                <h3>Fellows by program</h3>
                <p>How fellows are distributed across hub programs.</p>
              </div>
            </div>
            {programData.length === 0 ? (
              <ChartEmpty title="No program data" message="Program is set when fellows are added or imported." />
            ) : (
              <BreakdownPieChart items={programData} colors={PROGRAM_COLORS} innerRadius={0} />
            )}
          </section>

          <div className="network-aggregate-split">
            <section className="gc network-aggregate-section">
              <h3>Gender diversity</h3>
              {genderData.length === 0 ? (
                <ChartEmpty title="No gender data" message="Add gender when country managers enter fellows." />
              ) : (
                <BreakdownPieChart items={genderData} colors={GENDER_COLORS} />
              )}
            </section>

            <section className="gc network-aggregate-section">
              <div className="network-aggregate-section-head compact">
                <IconAccessible size={18} style={{ color: accent }} />
                <h3>Disability inclusion</h3>
              </div>
              {disabilityData.length === 0 ? (
                <ChartEmpty title="No disability data" message="Use the hasDisability column on import or add a disability field for fellows." />
              ) : (
                <BreakdownPieChart items={disabilityData} colors={DISABILITY_COLORS} />
              )}
            </section>
          </div>

          <div className="network-aggregate-split">
            <section className="gc network-aggregate-section">
              <h3>Network status</h3>
              {statusData.length === 0 ? (
                <ChartEmpty title="No status data" message="Fellow status counts will show here." />
              ) : (
                <BreakdownPieChart items={statusData} colors={[accent, "#9B59B6", "#64748B"]} innerRadius={0} />
              )}
            </section>

            <section className="gc network-aggregate-section">
              <h3>Fellows by cohort</h3>
              {cohortData.length === 0 ? (
                <ChartEmpty title="No cohort data" message="Cohort year on each fellow drives this chart." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cohortData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--emuted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--eborder)" }} />
                    <Bar dataKey="Fellows" fill={accent} radius={[4, 4, 0, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
