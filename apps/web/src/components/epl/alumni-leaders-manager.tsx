"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconPlus,
  IconLoader2,
  IconPencil,
  IconTrash,
  IconCheck,
  IconBuildingCommunity,
  IconMapPin,
  IconMail,
  IconPhoneCall,
  IconArchive,
  IconSearch,
  IconStar,
  IconBriefcase,
  IconUser,
  IconLayoutGrid,
  IconBinaryTree,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { ProgramSelect } from "@/components/epl/program-select";
import { CohortSelect } from "@/components/epl/cohort-select";
import { SlideToggle } from "@/components/epl/slide-toggle";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { OrgTree, type OrgTreeNode } from "@/components/epl/org-tree";
import { queryClient, trpc } from "@/utils/trpc";

type LeaderRow = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  organization: string | null;
  cohortId: string | null;
  cohortYear: number | null;
  cohortLabel: string | null;
  program: string | null;
  region: string | null;
  parentId: string | null;
  tier: number;
  isRepresentative: boolean;
  status: "active" | "inactive" | "archived";
  sortOrder: number;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  notes?: string | null;
};

type LeaderForm = {
  firstName: string;
  lastName: string;
  role: string;
  organization: string;
  cohortId: string;
  program: string;
  region: string;
  parentId: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  isRepresentative: boolean;
  notes: string;
};

const EMPTY_FORM: LeaderForm = {
  firstName: "",
  lastName: "",
  role: "",
  organization: "",
  cohortId: "",
  program: "",
  region: "",
  parentId: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  isRepresentative: false,
  notes: "",
};

type Props = {
  tenantId: string;
  hubName: string;
  accent: string;
  readOnly?: boolean;
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

type TreeLeader = LeaderRow & { children: TreeLeader[] };

function buildLeaderTree(leaders: LeaderRow[], hubName: string): OrgTreeNode | null {
  if (leaders.length === 0) return null;

  const sorted = [...leaders].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
  );

  const nodes = new Map<string, TreeLeader>(
    sorted.map((leader) => [leader.id, { ...leader, children: [] }]),
  );

  const roots: TreeLeader[] = [];
  for (const leader of sorted) {
    const node = nodes.get(leader.id)!;
    if (leader.parentId && nodes.has(leader.parentId)) {
      nodes.get(leader.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const mapNode = (leader: TreeLeader): OrgTreeNode => ({
    id: leader.id,
    name: leader.fullName,
    role: leader.role,
    tier: leader.isRepresentative ? 0 : leader.tier,
    cohortLabel: leader.cohortLabel ?? (leader.cohortYear != null ? `Cohort ${leader.cohortYear}` : null),
    region: leader.region,
    badgeLabel: leader.isRepresentative ? "REPRESENTATIVE" : "EXECUTIVE",
    children: leader.children.map(mapNode),
  });

  if (roots.length === 1) return mapNode(roots[0]!);

  return {
    id: "__alumni_root__",
    name: hubName,
    role: "Alumni leadership",
    tier: 0,
    badgeLabel: "EXECUTIVE",
    children: roots.map(mapNode),
  };
}

function EnhancedLeaderCard({
  leader,
  accent,
  readOnly,
  onEdit,
  onArchive,
  onDelete,
}: {
  leader: LeaderRow;
  accent: string;
  readOnly: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const initials = getInitials(leader.firstName, leader.lastName);

  return (
    <div className="gc" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            flexShrink: 0,
            background: `${accent}18`,
            border: `2px solid ${accent}`,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
            fontFamily: "var(--font)",
            position: "relative",
          }}
        >
          {initials}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#94a3b8",
              border: "2px solid var(--ebase)",
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              {leader.fullName}
            </div>
            {leader.isRepresentative && (
              <span className="nm-status-pill is-active" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <IconStar size={12} /> Rep
              </span>
            )}
            {leader.status === "archived" && !readOnly && (
              <span className="nm-status-pill is-alumni">Archived</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: accent, fontWeight: 700, lineHeight: 1.4 }}>{leader.role}</div>
        </div>
      </div>

      <div style={{ height: 1, width: "100%", background: "rgba(255,255,255,0.06)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {leader.organization && (
          <div style={{ fontSize: 13, color: "var(--emuted)", display: "flex", gap: 8, alignItems: "center" }}>
            <IconBriefcase size={15} /> {leader.organization}
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {leader.region && (
            <span
              style={{
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                background: "rgba(255,255,255,0.05)",
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--ewhite)",
                fontWeight: 600,
              }}
            >
              <IconMapPin size={13} /> {leader.region}
            </span>
          )}
          {(leader.cohortLabel || leader.cohortYear != null) && (
            <span
              style={{
                background: "rgba(255,255,255,0.05)",
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--emuted)",
                fontWeight: 600,
              }}
            >
              {leader.cohortLabel ?? `Cohort ${leader.cohortYear}`}
            </span>
          )}
          {leader.program && (
            <span
              style={{
                background: "rgba(255,255,255,0.05)",
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--emuted)",
                fontWeight: 600,
              }}
            >
              {leader.program}
            </span>
          )}
        </div>
      </div>

      {!readOnly && (leader.email || leader.phone) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--emuted)" }}>
          {leader.email && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <IconMail size={14} /> {leader.email}
            </div>
          )}
          {leader.phone && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <IconPhoneCall size={14} /> {leader.phone}
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="nm-row-actions" style={{ marginTop: "auto" }}>
          <button type="button" className="nm-row-action" onClick={onEdit}>
            <IconPencil size={14} /> Edit
          </button>
          {leader.status !== "archived" && (
            <button type="button" className="nm-row-action" onClick={onArchive}>
              <IconArchive size={14} /> Archive
            </button>
          )}
          <button type="button" className="nm-row-action is-danger" onClick={onDelete}>
            <IconTrash size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function AlumniLeadersManager({ tenantId, hubName, accent, readOnly = false }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeaderForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [repFilter, setRepFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "cards">("tree");

  const listQuery = useQuery(
    trpc.alumniLeaders.list.queryOptions({
      tenantId,
      includeArchived: !readOnly && showArchived,
      search: search.trim() || undefined,
      representativesOnly: repFilter,
    }),
  );

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.alumniLeaders.list.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.alumniLeaders.aggregates.queryKey({ tenantId }) }),
    ]);
  }, [tenantId]);

  const createMutation = useMutation(
    trpc.alumniLeaders.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Alumni leader added");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.alumniLeaders.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Alumni leader updated");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const archiveMutation = useMutation(
    trpc.alumniLeaders.archive.mutationOptions({
      onSuccess: async () => {
        toast.success("Alumni leader archived");
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.alumniLeaders.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Alumni leader removed");
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const leaders = useMemo(() => (listQuery.data?.items ?? []) as LeaderRow[], [listQuery.data?.items]);
  const treeData = useMemo(() => buildLeaderTree(leaders, hubName), [leaders, hubName]);

  const parentOptions = useMemo(
    () =>
      leaders
        .filter((leader) => leader.id !== editingId && leader.status !== "archived")
        .map((leader) => ({ value: leader.id, label: leader.fullName, hint: leader.role })),
    [leaders, editingId],
  );

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPanelOpen(true);
  }

  function openEdit(row: LeaderRow) {
    setEditingId(row.id);
    setForm({
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      organization: row.organization ?? "",
      cohortId: row.cohortId ?? "",
      program: row.program ?? "",
      region: row.region ?? "",
      parentId: row.parentId ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      linkedinUrl: row.linkedinUrl ?? "",
      isRepresentative: row.isRepresentative,
      notes: row.notes ?? "",
    });
    setPanelOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.role.trim()) {
      toast.error("First name, last name, and role are required");
      return;
    }

    const payload = {
      tenantId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role.trim(),
      organization: form.organization.trim() || undefined,
      cohortId: form.cohortId || null,
      program: form.program.trim() || undefined,
      region: form.region.trim() || undefined,
      parentId: form.parentId || null,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      isRepresentative: form.isRepresentative,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ ...payload, id: editingId });
    } else {
      createMutation.mutate(payload);
    }
  }

  function archiveLeader(row: LeaderRow) {
    if (!window.confirm(`Archive ${row.fullName}?`)) return;
    archiveMutation.mutate({ tenantId, id: row.id });
  }

  function deleteLeader(row: LeaderRow) {
    if (!window.confirm(`Permanently delete ${row.fullName}?`)) return;
    deleteMutation.mutate({ tenantId, id: row.id });
  }

  const isPending =
    createMutation.isPending || updateMutation.isPending || archiveMutation.isPending || deleteMutation.isPending;

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={isPending}>
        Cancel
      </button>
      <button type="submit" form="alumni-leader-form" className="rm-primary" disabled={isPending}>
        {isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editingId ? "Save changes" : "Add leader"}
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {!readOnly && (
          <button type="button" className="rm-primary" onClick={openCreate}>
            <IconPlus size={16} /> Add alumni leader
          </button>
        )}

        <div
          style={{
            display: "flex",
            gap: 4,
            background: "rgba(255,255,255,0.05)",
            padding: 4,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            marginLeft: readOnly ? 0 : "auto",
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
            }}
          >
            <IconBinaryTree size={16} /> Tree
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            style={{
              padding: "8px 12px",
              background: viewMode === "cards" ? "rgba(255,255,255,0.1)" : "transparent",
              color: viewMode === "cards" ? "var(--ewhite)" : "var(--emuted)",
              border: "none",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "var(--font)",
            }}
          >
            <IconLayoutGrid size={16} /> Cards
          </button>
        </div>
      </div>

      <div className="nm-filter-bar">
        <div className="rm-search" style={{ flex: 1, minWidth: 200 }}>
          <IconSearch size={16} />
          <input placeholder="Search leaders…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!readOnly && (
          <>
            <button
              type="button"
              className={`nm-row-action${showArchived ? " is-active" : ""}`}
              onClick={() => setShowArchived((value) => !value)}
            >
              <IconArchive size={14} /> Archived
            </button>
            <button
              type="button"
              className={`nm-row-action${repFilter ? " is-active" : ""}`}
              onClick={() => setRepFilter((value) => !value)}
            >
              <IconStar size={14} /> Representatives
            </button>
          </>
        )}
      </div>

      {listQuery.isLoading ? (
        <div className="rm-state">Loading alumni leaders…</div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : leaders.length === 0 ? (
        <CountrySectionEmpty
          title={readOnly ? "No active alumni leaders" : "No alumni leaders yet"}
          description={
            readOnly
              ? "Active alumni leaders for this hub will appear here."
              : `Add featured alumni and country representatives for ${hubName}.`
          }
          accent={accent}
        />
      ) : viewMode === "tree" && treeData ? (
        <div className="gc" style={{ padding: 32, overflowX: "auto", minHeight: 480 }}>
          <OrgTree
            data={treeData}
            cardVariant="alumni"
            searchPlaceholder="Search alumni leaders…"
            onNodeClick={readOnly ? undefined : (node) => {
              if (node.id === "__alumni_root__") return;
              const leader = leaders.find((item) => item.id === node.id);
              if (leader) openEdit(leader);
            }}
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {leaders.map((leader) => (
            <EnhancedLeaderCard
              key={leader.id}
              leader={leader}
              accent={accent}
              readOnly={readOnly}
              onEdit={() => openEdit(leader)}
              onArchive={() => archiveLeader(leader)}
              onDelete={() => deleteLeader(leader)}
            />
          ))}
        </div>
      )}

      {!readOnly && (
        <SlidePanel
          open={panelOpen}
          onClose={closePanel}
          title={editingId ? "Edit alumni leader" : "Add alumni leader"}
          description={`${hubName} — highlight alumni leaders for this hub`}
          footer={footer}
          width={540}
        >
          <form id="alumni-leader-form" onSubmit={handleSubmit} className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconUser size={16} /> Profile
              </div>
              <div className="rm-panel-row">
                <div className="epl-slide-field">
                  <span>First name</span>
                  <input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required />
                </div>
                <div className="epl-slide-field">
                  <span>Last name</span>
                  <input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required />
                </div>
              </div>
              <div className="epl-slide-field">
                <span>Their title / role</span>
                <input
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  placeholder="e.g. Chapter President, Alumni Board Member"
                  required
                />
                <p className="rm-panel-hint">
                  Their alumni leadership title — not their day job.
                </p>
              </div>
              <SlideToggle
                checked={form.isRepresentative}
                onChange={(checked) => setForm((p) => ({ ...p, isRepresentative: checked }))}
                label="Official country representative"
                description={`Turn on if this person is the official EPL contact / face for ${hubName}. Leave off for other featured alumni leaders.`}
              />
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconBuildingCommunity size={16} /> Background
              </div>
              <div className="epl-slide-field">
                <span>Current organization / role</span>
                <input
                  value={form.organization}
                  onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="rm-panel-row">
                <div className="epl-slide-field">
                  <span>Cohort</span>
                  <CohortSelect
                    tenantId={tenantId}
                    value={form.cohortId}
                    onChange={(cohortId) => setForm((p) => ({ ...p, cohortId }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="epl-slide-field">
                  <span>Region</span>
                  <input
                    value={form.region}
                    onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                    placeholder="Optional — e.g. Abidjan"
                  />
                </div>
              </div>
              <div className="epl-slide-field">
                <span>Program</span>
                <ProgramSelect
                  tenantId={tenantId}
                  value={form.program}
                  onChange={(value) => setForm((p) => ({ ...p, program: value }))}
                  placeholder="Select hub program"
                />
              </div>
              <div className="epl-slide-field">
                <span>Reports to</span>
                <SlideSelect
                  value={form.parentId}
                  onChange={(value) => setForm((p) => ({ ...p, parentId: value }))}
                  options={parentOptions}
                  placeholder="Top level (no parent)"
                  allowEmpty
                  emptyLabel="Top level"
                />
              </div>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconMail size={16} /> Contact
              </div>
              <div className="epl-slide-field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="epl-slide-field">
                <span>Phone</span>
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="epl-slide-field">
                <span>LinkedIn URL</span>
                <input value={form.linkedinUrl} onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))} placeholder="Optional" />
              </div>
            </section>
          </form>
        </SlidePanel>
      )}
    </div>
  );
}
