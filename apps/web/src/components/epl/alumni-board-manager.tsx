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
  IconBuildingBank,
  IconSearch,
  IconArchive,
  IconUser,
  IconMail,
  IconStar,
  IconBinaryTree,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { queryClient, trpc } from "@/utils/trpc";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";

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
  tenantId: string | null;
  country: HubMeta | null;
  cohortLabel: string | null;
  parentId: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  notes: string | null;
  sortOrder: number;
  status: "active" | "archived";
};

type ExecutiveForm = {
  firstName: string;
  lastName: string;
  role: string;
  organization: string;
  tenantId: string;
  cohortLabel: string;
  parentId: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  notes: string;
};

const EMPTY_FORM: ExecutiveForm = {
  firstName: "",
  lastName: "",
  role: "",
  organization: "",
  tenantId: "",
  cohortLabel: "",
  parentId: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  notes: "",
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function HubFlag({ country, size = 18 }: { country: HubMeta; size?: number }) {
  const code = resolveIso2({
    countryCode: country.countryCode,
    iso2: country.iso2,
    flag: country.flag,
  });
  if (!code) {
    return (
      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ewhite)" }}>
        {(country.countryCode || "?").slice(0, 2)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flagImageUrl(code, 40)} alt="" width={size} height={Math.round(size * 0.72)} style={{ borderRadius: 2, display: "block" }} />
  );
}

export function AlumniBoardManager() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExecutiveForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const listQuery = useQuery(
    trpc.alumniExecutives.list.queryOptions({
      includeArchived: showArchived,
      search: search.trim() || undefined,
    }),
  );
  const tenantsQuery = useQuery(trpc.tenants.list.queryOptions());

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.alumniExecutives.list.queryKey() });
  }, []);

  const createMutation = useMutation(
    trpc.alumniExecutives.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Board member added");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.alumniExecutives.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Board member updated");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const archiveMutation = useMutation(
    trpc.alumniExecutives.archive.mutationOptions({
      onSuccess: async () => {
        toast.success("Board member archived");
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.alumniExecutives.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Board member removed");
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const executives = useMemo(
    () => (listQuery.data?.items ?? []) as ExecutiveRow[],
    [listQuery.data?.items],
  );

  const hubOptions = useMemo(
    () =>
      (tenantsQuery.data ?? []).map((hub) => ({
        value: hub.id,
        label: hub.name,
        hint: hub.countryCode,
      })),
    [tenantsQuery.data],
  );

  const parentOptions = useMemo(
    () =>
      executives
        .filter((row) => row.id !== editingId && row.status !== "archived")
        .map((row) => ({ value: row.id, label: row.fullName, hint: row.role })),
    [executives, editingId],
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

  function openEdit(row: ExecutiveRow) {
    setEditingId(row.id);
    setForm({
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      organization: row.organization ?? "",
      tenantId: row.tenantId ?? "",
      cohortLabel: row.cohortLabel ?? "",
      parentId: row.parentId ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      linkedinUrl: row.linkedinUrl ?? "",
      notes: row.notes ?? "",
    });
    setPanelOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.role.trim()) {
      toast.error("First name, last name, and board role are required");
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role.trim(),
      organization: form.organization.trim() || undefined,
      tenantId: form.tenantId || null,
      cohortLabel: form.cohortLabel.trim() || undefined,
      parentId: form.parentId || null,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ ...payload, id: editingId });
    } else {
      createMutation.mutate(payload);
    }
  }

  function archiveExecutive(row: ExecutiveRow) {
    if (!window.confirm(`Archive ${row.fullName}? They will be hidden from Executive Hub.`)) return;
    archiveMutation.mutate({ id: row.id });
  }

  function deleteExecutive(row: ExecutiveRow) {
    if (!window.confirm(`Permanently delete ${row.fullName}?`)) return;
    deleteMutation.mutate({ id: row.id });
  }

  const isPending =
    createMutation.isPending || updateMutation.isPending || archiveMutation.isPending || deleteMutation.isPending;

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={isPending}>
        Cancel
      </button>
      <button type="submit" form="alumni-board-form" className="rm-primary" disabled={isPending}>
        {isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editingId ? "Save changes" : "Add to board"}
      </button>
    </div>
  );

  return (
    <div className="rm-page">
      <header className="rm-header">
        <div>
          <p className="rm-kicker">Settings · Alumni Network</p>
          <h1 className="rm-title">Alumni Executive Board</h1>
          <p className="rm-sub">
            Create the continental steering committee. People added here appear on Alumni Network → Executive Hub.
          </p>
        </div>
        <div className="rm-header-actions">
          <div className="rm-search">
            <IconSearch size={15} />
            <input
              type="text"
              placeholder="Search board members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`nm-row-action${showArchived ? " is-active" : ""}`}
            onClick={() => setShowArchived((value) => !value)}
          >
            <IconArchive size={14} /> Archived
          </button>
          <button type="button" className="rm-primary" onClick={openCreate}>
            <IconPlus size={16} /> Add board member
          </button>
        </div>
      </header>

      {listQuery.isLoading ? (
        <div className="rm-state">Loading executive board…</div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : executives.length === 0 ? (
        <CountrySectionEmpty
          title="No board members yet"
          description="Add the President, VPs, and other continental officers. They will show on Executive Hub as soon as you save."
          accent="#2EC27E"
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {executives.map((row) => {
            const accent = row.country?.color ?? "#2EC27E";
            const reportsTo = executives.find((item) => item.id === row.parentId);
            return (
              <div key={row.id} className="gc" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
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
                    }}
                  >
                    {getInitials(row.firstName, row.lastName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                        {row.fullName}
                      </div>
                      {row.status === "archived" && <span className="nm-status-pill is-alumni">Archived</span>}
                    </div>
                    <div style={{ fontSize: 13, color: accent, fontWeight: 700, lineHeight: 1.4 }}>{row.role}</div>
                  </div>
                </div>

                <div style={{ height: 1, width: "100%", background: "rgba(255,255,255,0.06)" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {row.organization && (
                    <div style={{ fontSize: 13, color: "var(--emuted)", display: "flex", gap: 8, alignItems: "center" }}>
                      <IconBuildingBank size={15} /> {row.organization}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {row.country && (
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
                        <HubFlag country={row.country} />
                        {row.country.name}
                      </span>
                    )}
                    {row.cohortLabel && (
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
                        {row.cohortLabel}
                      </span>
                    )}
                    {reportsTo && (
                      <span
                        style={{
                          display: "inline-flex",
                          gap: 6,
                          alignItems: "center",
                          background: "rgba(255,255,255,0.05)",
                          padding: "4px 10px",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "var(--emuted)",
                          fontWeight: 600,
                        }}
                      >
                        <IconBinaryTree size={13} /> Reports to {reportsTo.fullName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="nm-row-actions" style={{ marginTop: "auto" }}>
                  <button type="button" className="nm-row-action" onClick={() => openEdit(row)}>
                    <IconPencil size={14} /> Edit
                  </button>
                  {row.status !== "archived" && (
                    <button type="button" className="nm-row-action" onClick={() => archiveExecutive(row)}>
                      <IconArchive size={14} /> Archive
                    </button>
                  )}
                  <button type="button" className="nm-row-action is-danger" onClick={() => deleteExecutive(row)}>
                    <IconTrash size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editingId ? "Edit board member" : "Add board member"}
        description="Shown on Alumni Network → Executive Hub"
        footer={footer}
        width={540}
      >
        <form id="alumni-board-form" onSubmit={handleSubmit} className="rm-panel-form">
          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconUser size={16} /> Profile
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>First name</span>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="epl-slide-field">
                <span>Last name</span>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="epl-slide-field">
              <span>Board role</span>
              <input
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                placeholder="e.g. President, Global Alumni Board"
                required
              />
              <p className="rm-panel-hint">Their title on the continental executive board — not their day job.</p>
            </div>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconStar size={16} /> Background
            </div>
            <div className="epl-slide-field">
              <span>Current organization / placement</span>
              <input
                value={form.organization}
                onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
                placeholder="e.g. Director, Ministry of Finance"
              />
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>Home country hub</span>
                <SlideSelect
                  value={form.tenantId}
                  onChange={(value) => setForm((p) => ({ ...p, tenantId: value }))}
                  options={hubOptions}
                  placeholder="Optional"
                  allowEmpty
                  emptyLabel="No country"
                  searchable
                  searchPlaceholder="Search hubs…"
                />
              </div>
              <div className="epl-slide-field">
                <span>Cohort</span>
                <input
                  value={form.cohortLabel}
                  onChange={(e) => setForm((p) => ({ ...p, cohortLabel: e.target.value }))}
                  placeholder="e.g. Cohort 3"
                />
              </div>
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
                searchable
                searchPlaceholder="Search board…"
              />
            </div>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconMail size={16} /> Contact
            </div>
            <div className="epl-slide-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="epl-slide-field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="epl-slide-field">
              <span>LinkedIn URL</span>
              <input
                value={form.linkedinUrl}
                onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="epl-slide-field">
              <span>Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional internal notes"
                rows={3}
              />
            </div>
          </section>
        </form>
      </SlidePanel>
    </div>
  );
}
