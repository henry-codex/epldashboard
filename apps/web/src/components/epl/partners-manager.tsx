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
  IconMapPin,
  IconUserCircle,
  IconPhoneCall,
  IconMail,
  IconArchive,
  IconSearch,
  IconUsers,
  IconHeartHandshake,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { queryClient, trpc } from "@/utils/trpc";

const STATUS_FILTER = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
] as const;

const FORM_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

const PARTNER_TYPES = [
  { value: "funder", label: "Funder" },
  { value: "government", label: "Government" },
  { value: "ngo", label: "NGO" },
  { value: "corporate", label: "Corporate" },
  { value: "other", label: "Other" },
] as const;

type OrgKind = "placement" | "partner";
type PartnerType = (typeof PARTNER_TYPES)[number]["value"];

type PartnerRow = {
  id: string;
  name: string;
  kind?: OrgKind;
  partnerType?: PartnerType | null;
  partnerTypeLabel?: string | null;
  region: string | null;
  fellowCount: number;
  status: "active" | "inactive" | "archived";
  statusLabel: string;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
};

type PartnerForm = {
  name: string;
  partnerType: PartnerType;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  region: string;
  fellowCount: string;
  status: "active" | "inactive";
  notes: string;
};

const EMPTY_FORM: PartnerForm = {
  name: "",
  partnerType: "funder",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  region: "",
  fellowCount: "0",
  status: "active",
  notes: "",
};

type Props = {
  tenantId: string;
  hubName: string;
  accent: string;
  kind?: OrgKind;
  readOnly?: boolean;
};

function statusPillClass(status: PartnerRow["status"]) {
  if (status === "active") return "nm-status-pill is-active";
  if (status === "archived") return "nm-status-pill is-alumni";
  return "nm-status-pill is-inactive";
}

function copyFor(kind: OrgKind) {
  if (kind === "partner") {
    return {
      add: "Add partner",
      added: "Partner added",
      updated: "Partner updated",
      statusUpdated: "Partner status updated",
      removed: "Partner removed",
      search: "Search partners…",
      searchReadonly: "Search active partners…",
      loading: "Loading partners…",
      empty: "No partners yet",
      emptyReadonly: "No active partners",
      emptyDesc: (hub: string) => `Add funders, government, NGO, and other partners for ${hub}.`,
      emptyReadonlyDesc: "Active funders and collaborating organizations for this hub will appear here.",
      panelCreate: "Add partner",
      panelEdit: "Edit partner",
      panelDesc: (hub: string) => `${hub} — funders and other partners (not placement hosts)`,
      archiveConfirm: (name: string) => `Archive ${name}? It will be hidden from active lists.`,
      deleteConfirm: (name: string) => `Permanently delete ${name}?`,
      nameRequired: "Partner name is required",
      typeRequired: "Select a partner type",
    };
  }
  return {
    add: "Add institution",
    added: "Placement institution added",
    updated: "Placement institution updated",
    statusUpdated: "Institution status updated",
    removed: "Institution removed",
    search: "Search institutions…",
    searchReadonly: "Search active institutions…",
    loading: "Loading placement institutions…",
    empty: "No placement institutions yet",
    emptyReadonly: "No active institutions",
    emptyDesc: (hub: string) => `Add host organizations where fellows serve in ${hub}.`,
    emptyReadonlyDesc: "Active placement institutions for this hub will appear here.",
    panelCreate: "Add placement institution",
    panelEdit: "Edit placement institution",
    panelDesc: (hub: string) => `${hub} — host organization where fellows serve`,
    archiveConfirm: (name: string) => `Archive ${name}? It will be hidden from active lists.`,
    deleteConfirm: (name: string) => `Permanently delete ${name}?`,
    nameRequired: "Institution name is required",
    typeRequired: "",
  };
}

export function PartnersManager({ tenantId, hubName, accent, kind = "placement", readOnly = false }: Props) {
  const copy = copyFor(kind);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTER)[number]["value"]>("all");

  const listQuery = useQuery(
    trpc.partners.list.queryOptions({
      tenantId,
      kind,
      status: readOnly ? "active" : statusFilter,
      search: search.trim() || undefined,
    }),
  );

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.partners.list.queryKey({ tenantId, kind }) }),
      queryClient.invalidateQueries({ queryKey: trpc.partners.aggregates.queryKey({ tenantId, kind }) }),
    ]);
  }, [tenantId, kind]);

  const createMutation = useMutation(
    trpc.partners.create.mutationOptions({
      onSuccess: async () => {
        toast.success(copy.added);
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.partners.update.mutationOptions({
      onSuccess: async () => {
        toast.success(copy.updated);
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const statusMutation = useMutation(
    trpc.partners.setStatus.mutationOptions({
      onSuccess: async () => {
        toast.success(copy.statusUpdated);
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.partners.delete.mutationOptions({
      onSuccess: async () => {
        toast.success(copy.removed);
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const partners = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);

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

  function openEdit(row: PartnerRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      partnerType: row.partnerType ?? "funder",
      contactPerson: row.contactPerson ?? "",
      contactEmail: row.contactEmail ?? "",
      contactPhone: row.contactPhone ?? "",
      region: row.region ?? "",
      fellowCount: String(row.fellowCount),
      status: row.status === "inactive" ? "inactive" : "active",
      notes: row.notes ?? "",
    });
    setPanelOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(copy.nameRequired);
      return;
    }
    if (kind === "partner" && !form.partnerType) {
      toast.error(copy.typeRequired);
      return;
    }

    const payload = {
      tenantId,
      kind,
      name: form.name.trim(),
      partnerType: kind === "partner" ? form.partnerType : undefined,
      contactPerson: form.contactPerson.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      region: form.region.trim() || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ ...payload, id: editingId });
    } else {
      createMutation.mutate({ ...payload, fellowCount: 0 });
    }
  }

  function toggleActive(row: PartnerRow) {
    const next = row.status === "active" ? "inactive" : "active";
    statusMutation.mutate({ tenantId, id: row.id, status: next });
  }

  function archivePartner(row: PartnerRow) {
    if (!window.confirm(copy.archiveConfirm(row.name))) return;
    statusMutation.mutate({ tenantId, id: row.id, status: "archived" });
  }

  function deletePartner(row: PartnerRow) {
    if (!window.confirm(copy.deleteConfirm(row.name))) return;
    deleteMutation.mutate({ tenantId, id: row.id });
  }

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    statusMutation.isPending ||
    deleteMutation.isPending;

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={isPending}>
        Cancel
      </button>
      <button type="submit" form="partner-form" className="rm-primary" disabled={isPending}>
        {isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editingId ? "Save changes" : copy.add}
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!readOnly && (
        <div className="nm-toolbar gc">
          <button type="button" className="rm-primary" onClick={openCreate}>
            <IconPlus size={16} /> {copy.add}
          </button>
        </div>
      )}

      <div className="nm-filter-bar">
        <div className="rm-search" style={{ flex: 1, minWidth: 200 }}>
          <IconSearch size={16} />
          <input
            placeholder={readOnly ? copy.searchReadonly : copy.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!readOnly && (
          <div style={{ width: 160 }}>
            <SlideSelect
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as typeof statusFilter)}
              options={STATUS_FILTER.map((item) => ({ value: item.value, label: item.label }))}
            />
          </div>
        )}
      </div>

      {listQuery.isLoading ? (
        <div className="rm-state">{copy.loading}</div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : partners.length === 0 ? (
        <CountrySectionEmpty
          title={readOnly ? copy.emptyReadonly : copy.empty}
          description={readOnly ? copy.emptyReadonlyDesc : copy.emptyDesc(hubName)}
          accent={accent}
        />
      ) : (
        <div className="pt-grid">
          {partners.map((partner) => {
            const initial = partner.name.trim().charAt(0).toUpperCase() || "P";
            return (
              <article
                key={partner.id}
                className={`gc pt-card${readOnly ? " is-readonly" : ""}`}
                style={{ ["--pt-accent" as string]: accent }}
              >
                <div className="pt-card-top">
                  <div className="pt-card-mark" aria-hidden>
                    {initial}
                  </div>
                  <div className="pt-card-identity">
                    <div className="pt-card-title-row">
                      <h3 className="pt-card-name">{partner.name}</h3>
                      {!readOnly && (
                        <span className={statusPillClass(partner.status)}>{partner.statusLabel}</span>
                      )}
                    </div>
                    {partner.region ? (
                      <div className="pt-card-region">
                        <IconMapPin size={13} />
                        <span>{partner.region}</span>
                      </div>
                    ) : (
                      <div className="pt-card-region is-empty">Region not set</div>
                    )}
                  </div>
                </div>

                {kind === "placement" ? (
                  <div className="pt-card-stat">
                    <div className="pt-card-stat-icon">
                      <IconUsers size={18} />
                    </div>
                    <div className="pt-card-stat-copy">
                      <strong>{partner.fellowCount}</strong>
                      <span>
                        {partner.fellowCount === 1
                          ? "active fellow serving here"
                          : "active fellows serving here"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-card-stat">
                    <div className="pt-card-stat-icon">
                      <IconHeartHandshake size={18} />
                    </div>
                    <div className="pt-card-stat-copy">
                      <strong>{partner.partnerTypeLabel ?? "Partner"}</strong>
                      <span>Partner type</span>
                    </div>
                  </div>
                )}

                {!readOnly && (partner.contactPerson || partner.contactEmail || partner.contactPhone) && (
                  <div className="pt-card-contacts">
                    {partner.contactPerson && (
                      <div>
                        <IconUserCircle size={14} /> {partner.contactPerson}
                      </div>
                    )}
                    {partner.contactEmail && (
                      <div>
                        <IconMail size={14} /> {partner.contactEmail}
                      </div>
                    )}
                    {partner.contactPhone && (
                      <div>
                        <IconPhoneCall size={14} /> {partner.contactPhone}
                      </div>
                    )}
                  </div>
                )}

                {!readOnly && (
                  <div className="nm-row-actions pt-card-actions">
                    <button type="button" className="nm-row-action" onClick={() => openEdit(partner)}>
                      <IconPencil size={14} /> Edit
                    </button>
                    {partner.status !== "archived" && (
                      <button type="button" className="nm-row-action" onClick={() => toggleActive(partner)}>
                        {partner.status === "active" ? "Set inactive" : "Set active"}
                      </button>
                    )}
                    {partner.status !== "archived" && (
                      <button type="button" className="nm-row-action" onClick={() => archivePartner(partner)}>
                        <IconArchive size={14} /> Archive
                      </button>
                    )}
                    <button type="button" className="nm-row-action is-danger" onClick={() => deletePartner(partner)}>
                      <IconTrash size={14} /> Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!readOnly && (
        <SlidePanel
          open={panelOpen}
          onClose={closePanel}
          title={editingId ? copy.panelEdit : copy.panelCreate}
          description={copy.panelDesc(hubName)}
          footer={footer}
          width={520}
        >
          <form id="partner-form" onSubmit={handleSubmit} className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconBuildingBank size={16} /> Organization
              </div>
              <div className="epl-slide-field">
                <span>Organization name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              {kind === "partner" && (
                <div className="epl-slide-field">
                  <span>Partner type</span>
                  <SlideSelect
                    value={form.partnerType}
                    onChange={(value) => setForm((p) => ({ ...p, partnerType: value as PartnerType }))}
                    options={PARTNER_TYPES.map((item) => ({ value: item.value, label: item.label }))}
                  />
                </div>
              )}
              <div className="epl-slide-field">
                <span>Region</span>
                <input
                  value={form.region}
                  onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                  placeholder="e.g. Abidjan, Northern region"
                />
              </div>
              {kind === "placement" && (
                <div className="epl-slide-field">
                  <span>Active fellows serving here</span>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "var(--ewhite)",
                      fontFamily: "var(--font)",
                    }}
                  >
                    {editingId ? form.fellowCount : "0"}
                  </div>
                  <p className="rm-panel-hint">
                    Auto-counted from Network when fellows select this institution under &quot;Where they
                    serve&quot;.
                  </p>
                </div>
              )}
              <div className="epl-slide-field">
                <span>Status</span>
                <SlideSelect
                  value={form.status}
                  onChange={(value) => setForm((p) => ({ ...p, status: value as PartnerForm["status"] }))}
                  options={FORM_STATUSES.map((item) => ({ value: item.value, label: item.label }))}
                />
              </div>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconUserCircle size={16} /> Contact person
              </div>
              <div className="epl-slide-field">
                <span>Name</span>
                <input
                  value={form.contactPerson}
                  onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="epl-slide-field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="epl-slide-field">
                <span>Phone</span>
                <input
                  value={form.contactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </section>
          </form>
        </SlidePanel>
      )}
    </div>
  );
}
