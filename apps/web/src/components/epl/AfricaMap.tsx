"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import type { Topology, Objects } from "topojson-specification";

/* ─── Types ───────────────────────────────────────────────── */
export interface FellowCountry {
  countryId: number;   // ISO 3166-1 numeric
  name: string;
  fellows: number;
  alumni?: number;
  institutions: number;
  cohort: string;
  color?: string;
}

interface Props {
  data: FellowCountry[];
  height?: number;
  onCountryClick?: (country: FellowCountry) => void;
}

/* ─── All ISO-numeric codes for African countries ─────────── */
const AFRICA_IDS = new Set([
  12, 24, 204, 72, 854, 108, 120, 132, 140, 148, 174, 175, 178, 180,
  262, 818, 231, 232, 266, 270, 288, 324, 384, 404, 426, 430, 434,
  450, 454, 466, 478, 480, 504, 508, 516, 562, 566, 624, 638, 646,
  678, 686, 694, 706, 710, 716, 728, 729, 732, 748, 768, 788, 800,
  818, 834, 894,
]);

const DEFAULT_HUB_COLOR = "#4150A3";

function hubColor(country: FellowCountry) {
  return country.color ?? DEFAULT_HUB_COLOR;
}

/* Module-level cache so we only fetch once per session */
let cachedWorld: Topology<Objects> | null = null;

export default function AfricaMap({ data, height = 480, onCountryClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; d: FellowCountry;
  } | null>(null);

  const dataMap = new Map(data.map((d) => [d.countryId, d]));

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl) return;

    let cancelled = false;

    async function render() {
      // Fetch / use cached world atlas
      if (!cachedWorld) {
        const res = await fetch(
          "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
        );
        cachedWorld = await res.json();
      }
      if (cancelled || !cachedWorld) return;

      const width = container!.clientWidth || 440;

      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();

      // ── Geo setup ────────────────────────────────────────
      const countries = topojson.feature(
        cachedWorld,
        (cachedWorld as any).objects.countries
      );
      const africaFeatures = (countries as unknown as GeoJSON.FeatureCollection).features.filter(
        (f) => AFRICA_IDS.has(Number(f.id))
      );
      const africaCollection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: africaFeatures,
      };

      const projection = d3
        .geoMercator()
        .fitSize([width, height], africaCollection);
      const path = d3.geoPath().projection(projection);

      // ── Defs — dot grid + per-pin glow gradients ─────────
      const defs = svg.append("defs");

      const pat = defs
        .append("pattern")
        .attr("id", "amap-dots")
        .attr("x", 0).attr("y", 0)
        .attr("width", 8).attr("height", 8)
        .attr("patternUnits", "userSpaceOnUse");
      pat.append("circle")
        .attr("cx", 1).attr("cy", 1).attr("r", 0.8)
        .attr("fill", "rgba(255,255,255,0.06)");

      // ── Solid dark base so map has contrast in both themes ─
      svg.append("rect")
        .attr("width", width).attr("height", height)
        .attr("rx", 12)
        .attr("fill", "#050505");

      // ── Dot grid on top of base ───────────────────────────
      svg.append("rect")
        .attr("width", width).attr("height", height)
        .attr("fill", "url(#amap-dots)");

      // ── All African countries ─────────────────────────────
      svg.append("g")
        .selectAll<SVGPathElement, GeoJSON.Feature>("path")
        .data(africaFeatures)
        .join("path")
        .attr("d", path as any)
        .attr("fill", (f) => {
          const country = dataMap.get(Number(f.id));
          if (!country) return "rgba(255,255,255,0.07)";
          return `${hubColor(country)}55`;
        })
        .attr("stroke", (f) => {
          const country = dataMap.get(Number(f.id));
          if (!country) return "rgba(255,255,255,0.22)";
          return hubColor(country);
        })
        .attr("stroke-width", (f) =>
          dataMap.has(Number(f.id)) ? 2 : 0.6
        )
        .attr("cursor", (f) => (dataMap.has(Number(f.id)) ? "pointer" : "default"))
        .on("mouseenter", function (event, f) {
          const id = Number(f.id);
          const country = dataMap.get(id);
          if (!country) return;
          const c = hubColor(country);
          d3.select(this).attr("fill", `${c}99`);
          const rect = container!.getBoundingClientRect();
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            d: country,
          });
        })
        .on("mousemove", function (event) {
          const rect = container!.getBoundingClientRect();
          setTooltip((prev) =>
            prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : prev
          );
        })
        .on("mouseleave", function (_, f) {
          const country = dataMap.get(Number(f.id));
          if (country) d3.select(this).attr("fill", `${hubColor(country)}55`);
          setTooltip(null);
        })
        .on("click", (_, f) => {
          const country = dataMap.get(Number(f.id));
          if (country && onCountryClick) onCountryClick(country);
        });

      // ── Pins for EPL countries ────────────────────────────
      data.forEach((cd, i) => {
        const feature = africaFeatures.find((f) => Number(f.id) === cd.countryId);
        if (!feature) return;
        const centroid = path.centroid(feature as any);
        if (!centroid || isNaN(centroid[0])) return;

        const [cx, cy] = centroid;
        const color = hubColor(cd);
        const gId = `glow-${cd.countryId}`;

        // Radial glow
        const grad = defs.append("radialGradient")
          .attr("id", gId)
          .attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.75);
        grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);

        const pinGroup = svg.append("g").style("pointer-events", "none");

        pinGroup.append("ellipse")
          .attr("cx", cx).attr("cy", cy)
          .attr("rx", 32).attr("ry", 32)
          .attr("fill", `url(#${gId})`);

        // Animated pulse ring
        const ring = pinGroup.append("circle")
          .attr("cx", cx).attr("cy", cy)
          .attr("r", 6)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("opacity", 1);

        const pulse = () => {
          ring
            .attr("r", 6).attr("opacity", 1)
            .transition()
            .duration(2000)
            .delay(i * 380)
            .ease(d3.easeLinear)
            .attr("r", 28)
            .attr("opacity", 0)
            .on("end", pulse);
        };
        setTimeout(pulse, i * 380);

        // Pin dot (outer halo ring)
        pinGroup.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 7).attr("fill", color).attr("opacity", 0.22);
        // Pin dot solid
        pinGroup.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 5.5).attr("fill", color);
        pinGroup.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 3).attr("fill", "#fff").attr("opacity", 0.95);


      });
    }

    render().catch(console.error);

    // Rerender on resize
    const ro = new ResizeObserver(() => render().catch(console.error));
    ro.observe(container);

    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [data, height, onCountryClick]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height,
        background: "#000000",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <svg
        ref={svgRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {tooltip && (() => {
        const accent = hubColor(tooltip.d);
        return (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 16,
            top: tooltip.y - 70,
            background: "rgba(10, 16, 45, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${accent}50`,
            borderRadius: 14,
            padding: "14px 18px",
            pointerEvents: "none",
            zIndex: 30,
            minWidth: 160,
            boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 20px ${accent}20 inset`,
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            transform: "translateY(0)",
            transition: "all 0.1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: accent,
              fontFamily: "var(--font, 'DM Sans', sans-serif)",
              marginBottom: "2px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              textShadow: `0 0 10px ${accent}60`
            }}
          >
            <span style={{
               display: "block",
               width: 8, height: 8, borderRadius: "50%",
               backgroundColor: accent,
               boxShadow: `0 0 8px ${accent}`,
            }} />
            {tooltip.d.name}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font, 'DM Sans', sans-serif)", fontWeight: 500 }}>Active Fellows</span>
             <span style={{ fontSize: 13, color: "rgba(255,255,255,0.95)", fontFamily: "var(--font, 'DM Sans', sans-serif)", fontWeight: 700 }}>{tooltip.d.fellows}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font, 'DM Sans', sans-serif)", fontWeight: 500 }}>Alumni</span>
             <span style={{ fontSize: 13, color: "rgba(255,255,255,0.95)", fontFamily: "var(--font, 'DM Sans', sans-serif)", fontWeight: 700 }}>{tooltip.d.alumni ?? 0}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font, 'DM Sans', sans-serif)", fontWeight: 500 }}>Total Network</span>
             <span style={{ fontSize: 13, color: "rgba(255,255,255,0.95)", fontFamily: "var(--font, 'DM Sans', sans-serif)", fontWeight: 700 }}>{tooltip.d.fellows + (tooltip.d.alumni ?? 0)}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font, 'DM Sans', sans-serif)", fontWeight: 500 }}>Institutions</span>
             <span style={{ fontSize: 13, color: "rgba(255,255,255,0.95)", fontFamily: "var(--font, 'DM Sans', sans-serif)", fontWeight: 700 }}>{tooltip.d.institutions}</span>
          </div>
          
          <div style={{
            marginTop: "6px",
            paddingTop: "6px",
            borderTop: "1px dashed rgba(255,255,255,0.15)",
            fontSize: 10,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "var(--font, 'DM Sans', sans-serif)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            Cohort • {tooltip.d.cohort}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
