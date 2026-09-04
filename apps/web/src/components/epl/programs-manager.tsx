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
  IconBriefcase,
  IconUsers,
  IconTarget,
  IconCalendarEvent,
  IconCircleCheck,
  IconAlertTriangle,
  IconClock,
  IconMapPin,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { useConfirm } from "@/components/epl/confirm-dialog";
import { queryClient, trpc } from "@/utils/trpc";

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
] as const;

const START_YEARS = Array.from({ length: 12 }, (_, index) => {
  const year = new Date().getFullYear() - 4 + index;
  return { value: String(year), label: String(year) };
});

type ProgramRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "active" | "completed" | "planned";
  targetFellows: number;
  startYear: number | null;
  sortOrder: number;
  activeFellows: number;
  alumniFellows: number;
  totalFellows: number;
  progress: number;
  fillRate: number | null;
  checkInRate: number | null;
  placementRate: number | null;
  health: "on_track" | "needs_attention" | "at_risk" | "getting_started" | "completed";
  healthLabel: string;
  healthReasons: string[];
};

type ProgramForm = {
  title: string;
  description: string;
  status: "active" | "completed" | "planned";
  targetFellows: string;
  startYear: string;
  sortOrder: string;
};

const EMPTY_FORM: ProgramForm = {
  title: "",
  description: "",
  status: "active",
  targetFellows: "0",
  startYear: String(new Date().getFullYear()),
  sortOrder: "0",
};

type Props = {
  tenantId: string;
  hubName: string;
  accent: string;
  readOnly?: boolean;
};

function statusPillClass(status: ProgramRow["status"]) {
  if (status === "active") return "nm-status-pill is-active";
  if (status === "completed") return "nm-status-pill is-alumni";
  return "nm-status-pill is-inactive";
}

function healthPillClass(health: ProgramRow["health"]) {
  if (health === "on_track") return "pm-health-pill is-on-track";
  if (health === "needs_attention") return "pm-health-pill is-needs-attention";
  if (health === "at_risk") return "pm-health-pill is-at-risk";
  if (health === "completed") return "pm-health-pill is-completed";
  return "pm-health-pill is-getting-started";
}

function healthIcon(health: ProgramRow["health"]) {
  if (health === "on_track" || health === "completed") return <IconCircleCheck size={13} />;
  if (health === "needs_attention" || health === "getting_started") return <IconClock size={13} />;
  return <IconAlertTriangle size={13} />;
}

function formatRate(value: number | null) {
  return value === null ? "Pending" : `${value}%`;
}

export function ProgramsManager({ tenantId, hubName, accent, readOnly = false }: Props) {
  const confirm = useConfirm();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProgramForm>(EMPTY_FORM);

  const listQuery = useQuery(trpc.programs.list.queryOptions({ tenantId }));

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.programs.list.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.programs.aggregates.queryKey({ tenantId }) }),
    ]);
  }, [tenantId]);

  const createMutation = useMutation(
    trpc.programs.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Program added");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.programs.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Program updated");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.programs.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Program removed");
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const programs = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: String(programs.length) });
    setPanelOpen(true);
  }

  function openEdit(row: ProgramRow) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      description: row.description ?? "",
      status: row.status,
      targetFellows: String(row.targetFellows),
      startYear: row.startYear ? String(row.startYear) : String(new Date().getFullYear()),
      sortOrder: String(row.sortOrder),
    });
    setPanelOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Program title is required");
      return;
    }

    const targetFellows = Number.parseInt(form.targetFellows, 10);
    const startYear = form.startYear ? Number.parseInt(form.startYear, 10) : undefined;
    const sortOrder = Number.parseInt(form.sortOrder || "0", 10) || 0;

    if (Number.isNaN(targetFellows) || targetFellows < 0) {
      toast.error("Target fellows must be a valid number");
      return;
    }

    const payload = {
      tenantId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      targetFellows,
      startYear: startYear && !Number.isNaN(startYear) ? startYear : undefined,
      sortOrder,
    };

    if (editingId) {
      updateMutation.mutate({ ...payload, id: editingId });
    } else {
      createMutation.mutate(payload);
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={pending}>
        Cancel
      </button>
      <button type="submit" form="program-form" className="rm-primary" disabled={pending}>
        {pending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editingId ? "Save changes" : "Add program"}
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {!readOnly && (
        <div className="nm-toolbar gc">
          <button type="button" className="rm-primary" onClick={openCreate}>
            <IconPlus size={16} /> Add program
          </button>
        </div>
      )}

      {listQuery.isLoading ? (
        <div className="rm-state">Loading programs…</div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : programs.length === 0 ? (
        <CountrySectionEmpty
          title="No programs yet"
          description={`Add the EPL programs this country hub runs — title, description, target fellows, and status.`}
          accent={accent}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {programs.map((program) => (
            <div
              key={program.id}
              className="gc pm-card"
              style={{
                padding: 22,
                display: "grid",
                gridTemplateColumns: readOnly ? "auto 1fr 160px 180px" : "auto 1fr 160px 180px auto",
                gap: 24,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: `${accent}15`,
                  border: `1px solid ${accent}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accent,
                }}
              >
                <IconBriefcase size={28} />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                    {program.title}
                  </h3>
                  <span className={statusPillClass(program.status)}>{program.status}</span>
                  <span className={healthPillClass(program.health)}>
                    {healthIcon(program.health)}
                    {program.healthLabel}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--emuted)",
                    fontFamily: "var(--font)",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {program.description || "No description yet."}
                </p>
                <div className="pm-health-signals">
                  <span className="pm-health-signal">Fill {program.fillRate != null ? `${program.fillRate}%` : "—"}</span>
                  <span className="pm-health-signal">
                    <IconMapPin size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                    Placed {formatRate(program.placementRate)}
                  </span>
                </div>
                {program.healthReasons.filter((reason) => !/check-?in/i.test(reason)).length > 0 && (
                  <ul
                    className={`pm-health-reasons${
                      program.health === "at_risk"
                        ? " is-danger"
                        : program.health === "needs_attention" || program.health === "getting_started"
                          ? " is-warning"
                          : ""
                    }`}
                  >
                    {program.healthReasons
                      .filter((reason) => !/check-?in/i.test(reason))
                      .slice(0, 2)
                      .map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ paddingLeft: 20, borderLeft: "1px solid var(--eborder)" }}>
                <div style={{ fontSize: 11, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  Active fellows
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 8 }}>
                  {program.activeFellows}
                  <IconUsers size={18} style={{ color: accent }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--emuted)", marginTop: 4 }}>
                  {program.alumniFellows} alumni · {program.totalFellows} total
                </div>
              </div>

              <div style={{ paddingLeft: 20, borderLeft: "1px solid var(--eborder)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase" }}>Target</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>
                    {program.targetFellows > 0 ? `${program.progress}%` : "No target set"}
                  </span>
                </div>
                <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ width: `${program.targetFellows > 0 ? program.progress : 0}%`, height: "100%", background: accent, borderRadius: 10 }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--emuted)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <IconTarget size={12} /> {program.activeFellows} / {program.targetFellows || "—"} fellows
                  {program.startYear ? (
                    <>
                      <span>·</span>
                      <IconCalendarEvent size={12} /> {program.startYear}
                    </>
                  ) : null}
                </div>
              </div>

              {!readOnly && (
                <div className="nm-row-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <button type="button" className="nm-row-action" onClick={() => openEdit(program)}>
                    <IconPencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    className="nm-row-action is-danger"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Remove program?",
                        message: `Remove "${program.title}"?`,
                        confirmLabel: "Remove",
                        danger: true,
                      });
                      if (ok) deleteMutation.mutate({ tenantId, id: program.id });
                    }}
                  >
                    <IconTrash size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <SlidePanel
          open={panelOpen}
          onClose={closePanel}
          title={editingId ? "Edit program" : "Add program"}
          description={editingId ? `${hubName} — update program details` : `${hubName} — new EPL program for this hub`}
          footer={footer}
          width={540}
        >
          <form id="program-form" onSubmit={handleSubmit} className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconBriefcase size={16} /> Program details
              </div>
              <div className="epl-slide-field">
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Public Service Fellowship"
                  required
                />
              </div>
              <label className="epl-slide-field">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="What this program does in this country hub…"
                  rows={4}
                />
              </label>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconTarget size={16} /> Capacity & status
              </div>
              <div className="rm-panel-row">
                <div className="epl-slide-field">
                  <span>Status</span>
                  <SlideSelect
                    value={form.status}
                    onChange={(value) => setForm((p) => ({ ...p, status: value as ProgramForm["status"] }))}
                    options={STATUSES.map((status) => ({ value: status.value, label: status.label }))}
                    placeholder="Select status"
                  />
                </div>
                <div className="epl-slide-field">
                  <span>Start year</span>
                  <SlideSelect
                    value={form.startYear}
                    onChange={(value) => setForm((p) => ({ ...p, startYear: value }))}
                    options={START_YEARS}
                    placeholder="Select year"
                    allowEmpty
                    emptyLabel="Not set"
                  />
                </div>
              </div>
              <div className="rm-panel-row">
                <div className="epl-slide-field">
                  <span>Target fellows</span>
                  <input
                    type="number"
                    min={0}
                    value={form.targetFellows}
                    onChange={(e) => setForm((p) => ({ ...p, targetFellows: e.target.value }))}
                    placeholder="0"
                  />
                  <p className="rm-panel-hint">Used for deployment progress on the programs board.</p>
                </div>
                <div className="epl-slide-field">
                  <span>Sort order</span>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                  />
                </div>
              </div>
            </section>
          </form>
        </SlidePanel>
      )}
    </div>
  );
}
