"use client";

import { IconBuildingBank, IconHeartHandshake, IconUsers } from "@tabler/icons-react";

type OrgKind = "placement" | "partner";

type Props = {
  kind: OrgKind;
  totalPartners: number;
  activePartners: number;
  fellowsAtActivePartners: number;
  funders?: number;
  accent: string;
  readOnly?: boolean;
};

export function PartnersMetricCards({
  kind,
  totalPartners,
  activePartners,
  fellowsAtActivePartners,
  funders = 0,
  accent,
  readOnly = false,
}: Props) {
  const cards =
    kind === "partner"
      ? readOnly
        ? [
            { label: "Active partners", value: activePartners, accent, icon: <IconHeartHandshake size={22} />, hint: "Funders and collaborating organizations" },
            { label: "Funders", value: funders, accent: "#E8A020", icon: <IconBuildingBank size={22} />, hint: "Active funding partners" },
          ]
        : [
            { label: "Total partners", value: totalPartners, accent, icon: <IconHeartHandshake size={22} />, hint: "Funders and other partners" },
            { label: "Active", value: activePartners, accent: "#2EC27E", icon: <IconBuildingBank size={22} />, hint: "Currently active" },
            { label: "Funders", value: funders, accent: "#E8A020", icon: <IconUsers size={22} />, hint: "Marked as funders" },
          ]
      : readOnly
        ? [
            { label: "Active institutions", value: activePartners, accent, icon: <IconBuildingBank size={22} />, hint: "Organizations currently hosting fellows" },
            { label: "Fellows serving", value: fellowsAtActivePartners, accent: "#2EC27E", icon: <IconUsers size={22} />, hint: "Active fellows at these institutions" },
          ]
        : [
            { label: "Total institutions", value: totalPartners, accent, icon: <IconHeartHandshake size={22} />, hint: "All placement institution records" },
            { label: "Active", value: activePartners, accent: "#2EC27E", icon: <IconBuildingBank size={22} />, hint: "Currently active" },
            { label: "Fellows serving", value: fellowsAtActivePartners, accent: "#3B8BEB", icon: <IconUsers size={22} />, hint: "From Network assignments" },
          ];

  return (
    <div
      className="pt-metrics"
      style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="gc pt-metric"
          style={{ ["--pt-accent" as string]: card.accent }}
        >
          <div className="pt-metric-icon">{card.icon}</div>
          <div className="pt-metric-copy">
            <div className="pt-metric-value">{card.value}</div>
            <div className="pt-metric-label">{card.label}</div>
            <div className="pt-metric-hint">{card.hint}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
