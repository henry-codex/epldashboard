"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlumniLayout } from "@/components/epl/alumni-layout";
import { OrgTree, type OrgTreeNode } from "@/components/epl/org-tree";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { SlidePanel } from "@/components/epl/slide-panel";
import { useHomePath } from "@/hooks/use-home-path";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";
import { trpc } from "@/utils/trpc";
import {
  IconMail,
  IconBrandLinkedin,
  IconBuildingBank,
  IconLayoutGrid,
  IconBinaryTree,
  IconLoader2,
  IconPhone,
  IconUser,
  IconMapPin,
} from "@tabler/icons-react";

type HubMeta = {
  id: string;
  name: string;
  countryCode: string;
  flag: string;
  iso2: string;
  color: string;
};

type ExecutiveRow = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  organization: string | null;
  country: HubMeta | null;
  cohortLabel: string | null;
  parentId: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  sortOrder: number;
  status: "active" | "archived";
};

type TreeExec = ExecutiveRow & { children: TreeExec[] };

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function HubFlag({ country, size = 14 }: { country: HubMeta; size?: number }) {
  const code = resolveIso2({
    countryCode: country.countryCode,
    iso2: country.iso2,
    flag: country.flag,
  });
  if (!code) {
    return (
      <span style={{ fontSize: 10, fontWeight: 800 }}>
        {(country.countryCode || "?").slice(0, 2)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagImageUrl(code, 40)}
      alt=""
      width={size}
      height={Math.round(size * 0.72)}
      style={{ borderRadius: 2, display: "block" }}
    />
  );
}

function buildBoardTree(executives: ExecutiveRow[]): OrgTreeNode | null {
  if (executives.length === 0) return null;

  const sorted = [...executives].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName),
  );

  const nodes = new Map<string, TreeExec>(sorted.map((row) => [row.id, { ...row, children: [] }]));
  const roots: TreeExec[] = [];

  for (const row of sorted) {
    const node = nodes.get(row.id)!;
    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const mapNode = (row: TreeExec): OrgTreeNode => ({
    id: row.id,
    name: row.fullName,
    role: row.role,
    tier: row.parentId ? 1 : 0,
    cohortLabel: row.cohortLabel,
    region: row.country?.name ?? null,
    badgeLabel: "EXECUTIVE",
    children: row.children.map(mapNode),
  });

  if (roots.length === 1) return mapNode(roots[0]!);

  return {
    id: "__board_root__",
    name: "Alumni Executive Board",
    role: "Continental steering committee",
    tier: 0,
    badgeLabel: "BOARD",
    children: roots.map(mapNode),
  };
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="epl-slide-field">
      <span>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>
        {icon}
        {value}
      </div>
    </div>
  );
}

export default function ExecutivesPage() {
  const [viewMode, setViewMode] = useState<"grid" | "tree">("tree");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const home = useHomePath();
  const canManage = home.capabilities.globalOperations;

  const listQuery = useQuery(trpc.alumniExecutives.list.queryOptions());
  const executives = useMemo(
    () => ((listQuery.data?.items ?? []) as ExecutiveRow[]).filter((row) => row.status === "active"),
    [listQuery.data?.items],
  );
  const treeData = useMemo(() => buildBoardTree(executives), [executives]);
  const selected = useMemo(
    () => executives.find((row) => row.id === selectedId) ?? null,
    [executives, selectedId],
  );
  const reportsTo = useMemo(
    () => (selected?.parentId ? executives.find((row) => row.id === selected.parentId) : null),
    [executives, selected],
  );

  function openProfile(id: string) {
    if (id === "__board_root__") return;
    setSelectedId(id);
  }

  return (
    <AlumniLayout activePage="executives" pageTitle="Executive Hub">
      <div
        style={{
          marginBottom: "2.5rem",
          maxWidth: 900,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "var(--ewhite)",
              margin: "0 0 12px 0",
              fontFamily: "var(--font)",
            }}
          >
            Alumni Executive Board
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              color: "var(--emuted)",
              fontFamily: "var(--font)",
              lineHeight: 1.6,
            }}
          >
            The steering committee guiding continental strategy, cross-border partnerships, and
            ongoing professional development for the EPL Africa alumni network.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "rgba(255,255,255,0.05)",
              padding: 4,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              style={{
                padding: "8px 12px",
                background: viewMode === "tree" ? "rgba(255,255,255,0.1)" : "transparent",
                color: viewMode === "tree" ? "var(--ewhite)" : "var(--emuted)",
                border: "none",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                fontWeight: 600,
                fontFamily: "var(--font)",
                transition: "all 0.2s",
              }}
            >
              <IconBinaryTree size={16} /> Tree
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              style={{
                padding: "8px 12px",
                background: viewMode === "grid" ? "rgba(255,255,255,0.1)" : "transparent",
                color: viewMode === "grid" ? "var(--ewhite)" : "var(--emuted)",
                border: "none",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                fontWeight: 600,
                fontFamily: "var(--font)",
                transition: "all 0.2s",
              }}
            >
              <IconLayoutGrid size={16} /> Grid
            </button>
          </div>
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="rm-state">
          <IconLoader2 size={18} className="animate-spin" /> Loading executive board…
        </div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : executives.length === 0 ? (
        <CountrySectionEmpty
          title="No executive board yet"
          description={
            canManage
              ? "Add board members in Settings → Alumni Board. They will appear here in tree and grid view."
              : "The continental executive board has not been published yet."
          }
          accent="#2EC27E"
        />
      ) : viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 24,
            paddingBottom: 60,
          }}
        >
          {executives.map((exec) => {
            const color = exec.country?.color ?? "#2EC27E";
            return (
              <div
                key={exec.id}
                className="gc"
                role="button"
                tabIndex={0}
                onClick={() => openProfile(exec.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openProfile(exec.id);
                  }
                }}
                style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                      border: `1px solid ${color}50`,
                      color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 800,
                      fontFamily: "var(--font)",
                      boxShadow: `0 8px 24px ${color}30`,
                    }}
                  >
                    {getInitials(exec.firstName, exec.lastName)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "var(--ewhite)",
                        fontFamily: "var(--font)",
                        marginBottom: 4,
                      }}
                    >
                      {exec.fullName}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontFamily: "var(--font)",
                      }}
                    >
                      {exec.role}
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, width: "100%", background: "rgba(255,255,255,0.06)" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {exec.organization && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--emuted)" }}>
                      <IconBuildingBank size={16} />
                      <span style={{ fontSize: 14, fontFamily: "var(--font)" }}>{exec.organization}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {exec.country && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "rgba(255,255,255,0.05)",
                          padding: "4px 8px",
                          borderRadius: 6,
                        }}
                      >
                        <HubFlag country={exec.country} />
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--ewhite)",
                            fontWeight: 600,
                            fontFamily: "var(--font)",
                          }}
                        >
                          {exec.country.name}
                        </span>
                      </div>
                    )}
                    {exec.cohortLabel && (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "var(--emuted)",
                          fontWeight: 600,
                          fontFamily: "var(--font)",
                        }}
                      >
                        {exec.cohortLabel}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto", paddingTop: 8 }}>
                  {exec.email ? (
                    <a
                      href={`mailto:${exec.email}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "var(--ewhite)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        textDecoration: "none",
                      }}
                    >
                      <IconMail size={16} />
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font)" }}>Contact</span>
                    </a>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "var(--emuted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <IconMail size={16} />
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font)" }}>No email</span>
                    </div>
                  )}
                  {exec.linkedinUrl ? (
                    <a
                      href={exec.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: "10px",
                        borderRadius: 8,
                        background: "rgba(59,139,235,0.15)",
                        border: "1px solid rgba(59,139,235,0.3)",
                        color: "#3B8BEB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconBrandLinkedin size={18} stroke={2.5} />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="gc" style={{ padding: 40, overflowX: "auto", minHeight: 600, display: "flex", justifyContent: "center" }}>
          {treeData ? (
            <OrgTree
              data={treeData}
              onNodeClick={(node) => openProfile(node.id)}
            />
          ) : null}
        </div>
      )}

      <SlidePanel
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.fullName ?? "Board member"}
        description={selected?.role}
        width={480}
        footer={
          selected ? (
            <div className="epl-slide-actions">
              <button type="button" className="rm-ghost" onClick={() => setSelectedId(null)}>
                Close
              </button>
              {selected.email ? (
                <a href={`mailto:${selected.email}`} className="rm-primary" style={{ textDecoration: "none" }}>
                  <IconMail size={15} /> Email
                </a>
              ) : null}
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconUser size={16} /> Profile
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${(selected.country?.color ?? "#2EC27E")}20, ${(selected.country?.color ?? "#2EC27E")}40)`,
                    border: `1px solid ${(selected.country?.color ?? "#2EC27E")}50`,
                    color: selected.country?.color ?? "#2EC27E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    fontFamily: "var(--font)",
                  }}
                >
                  {getInitials(selected.firstName, selected.lastName)}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                    {selected.fullName}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: selected.country?.color ?? "#2EC27E",
                      marginTop: 4,
                    }}
                  >
                    {selected.role}
                  </div>
                </div>
              </div>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconBuildingBank size={16} /> Details
              </div>
              {selected.organization ? (
                <DetailRow label="Organization / placement" value={selected.organization} icon={<IconBuildingBank size={15} />} />
              ) : null}
              {selected.country ? (
                <DetailRow
                  label="Country"
                  value={selected.country.name}
                  icon={<HubFlag country={selected.country} size={16} />}
                />
              ) : null}
              {selected.cohortLabel ? (
                <DetailRow label="Cohort" value={selected.cohortLabel} />
              ) : null}
              {reportsTo ? (
                <DetailRow label="Reports to" value={`${reportsTo.fullName} · ${reportsTo.role}`} icon={<IconBinaryTree size={15} />} />
              ) : (
                <DetailRow label="Reports to" value="Top of the board" icon={<IconMapPin size={15} />} />
              )}
              {!selected.organization && !selected.country && !selected.cohortLabel ? (
                <p style={{ margin: 0, fontSize: 13, color: "var(--emuted)" }}>No additional details yet.</p>
              ) : null}
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconMail size={16} /> Contact
              </div>
              {selected.email ? (
                <a href={`mailto:${selected.email}`} className="epl-slide-field" style={{ textDecoration: "none", color: "inherit" }}>
                  <span>Email</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>
                    <IconMail size={15} />
                    {selected.email}
                  </div>
                </a>
              ) : (
                <DetailRow label="Email" value="Not provided" />
              )}
              {selected.phone ? (
                <a href={`tel:${selected.phone}`} className="epl-slide-field" style={{ textDecoration: "none", color: "inherit" }}>
                  <span>Phone</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "var(--ewhite)" }}>
                    <IconPhone size={15} />
                    {selected.phone}
                  </div>
                </a>
              ) : (
                <DetailRow label="Phone" value="Not provided" />
              )}
              {selected.linkedinUrl ? (
                <a
                  href={selected.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="epl-slide-field"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <span>LinkedIn</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#3B8BEB" }}>
                    <IconBrandLinkedin size={16} />
                    Open profile
                  </div>
                </a>
              ) : (
                <DetailRow label="LinkedIn" value="Not provided" />
              )}
            </section>
          </div>
        ) : null}
      </SlidePanel>
    </AlumniLayout>
  );
}
