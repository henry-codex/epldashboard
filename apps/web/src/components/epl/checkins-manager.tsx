"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconLoader2,
  IconPencil,
  IconCheck,
  IconChecklist,
  IconChevronLeft,
  IconChevronRight,
  IconMapPin,
  IconNotes,
  IconSearch,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { SlideToggle } from "@/components/epl/slide-toggle";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { formatPeriodLabel } from "@/components/epl/checkins-metrics";
import { queryClient, trpc } from "@/utils/trpc";

const PAGE_SIZE = 20;

const FILTER_STATUSES = [
  { value: "all", label: "All fellows" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
] as const;

type RosterRow = {
  fellowId: string;
  firstName: string;
  lastName: string;
  email: string;
  program: string;
  placementLabel: string | null;
  serviceLocationLabel?: string | null;
  formalPlacementLabel?: string | null;
  currentPlacementId: string | null;
  servicePartnerId?: string | null;
  isSubmitted: boolean;
  checkIn: {
    id: string;
    status: "pending" | "submitted" | "overdue";
    submittedAt: string | Date | null;
    stillAtPlacement: boolean | null;
    locationConfirmed: string | null;
    mainActivities: string | null;
    highlights: string | null;
    challenges: string | null;
    supportNeeded: string | null;
    careerMilestone: boolean;
    milestoneDescription: string | null;
    daysWorked: number | null;
    placementId: string | null;
    periodMonth: number;
    periodYear: number;
  } | null;
};

type CheckInForm = {
  stillAtPlacement: boolean;
  locationConfirmed: string;
  mainActivities: string;
  highlights: string;
  challenges: string;
  supportNeeded: string;
  careerMilestone: boolean;
  milestoneDescription: string;
  daysWorked: string;
};

const EMPTY_FORM: CheckInForm = {
  stillAtPlacement: true,
  locationConfirmed: "",
  mainActivities: "",
  highlights: "",
  challenges: "",
  supportNeeded: "",
  careerMilestone: false,
  milestoneDescription: "",
  daysWorked: "",
};

function buildPeriodOptions() {
  const options: { value: string; label: string; month: number; year: number }[] = [];
  const now = new Date();
  for (let index = 0; index < 12; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    options.push({
      value: `${year}-${month}`,
      label: formatPeriodLabel(month, year),
      month,
      year,
    });
  }
  return options;
}

const PERIOD_OPTIONS = buildPeriodOptions();

function parsePeriod(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { periodMonth: month, periodYear: year };
}

function statusPill(isSubmitted: boolean) {
  return isSubmitted ? "nm-status-pill is-active" : "nm-status-pill is-inactive";
}

type Props = {
  tenantId: string;
  hubName: string;
  accent: string;
};

export function CheckInsManager({ tenantId, hubName, accent }: Props) {
  const [periodValue, setPeriodValue] = useState(PERIOD_OPTIONS[0]?.value ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "submitted">("all");
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<RosterRow | null>(null);
  const [form, setForm] = useState<CheckInForm>(EMPTY_FORM);

  const { periodMonth, periodYear } = parsePeriod(periodValue);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, periodValue]);

  const rosterQuery = useQuery(
    trpc.checkIns.roster.queryOptions({
      tenantId,
      periodMonth,
      periodYear,
      search: search.trim() || undefined,
      status: statusFilter,
    }),
  );

  const partnersQuery = useQuery(
    trpc.partners.list.queryOptions({ tenantId, status: "active", kind: "placement" }),
  );

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.checkIns.roster.queryKey({ tenantId, periodMonth, periodYear }) }),
      queryClient.invalidateQueries({ queryKey: trpc.checkIns.aggregates.queryKey({ tenantId, periodMonth, periodYear }) }),
      queryClient.invalidateQueries({ queryKey: trpc.programs.list.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.programs.aggregates.queryKey({ tenantId }) }),
    ]);
  }, [tenantId, periodMonth, periodYear]);

  const submitMutation = useMutation(
    trpc.checkIns.submit.mutationOptions({
      onSuccess: async () => {
        toast.success("Check-in saved");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const rows = useMemo(() => rosterQuery.data?.items ?? [], [rosterQuery.data?.items]);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const rangeStart = totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalRows);
  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const locationOptions = useMemo(() => {
    const partners = (partnersQuery.data?.items ?? []).map((partner) => ({
      value: partner.region ? `${partner.name} · ${partner.region}` : partner.name,
      label: partner.name,
      hint: partner.region ?? undefined,
    }));

    // Keep fellow's current label selectable even if not in partners list.
    if (activeRow?.placementLabel) {
      const exists = partners.some((item) => item.value === activeRow.placementLabel);
      if (!exists) {
        partners.unshift({
          value: activeRow.placementLabel,
          label: activeRow.placementLabel,
          hint: "On fellow profile",
        });
      }
    }

    return partners;
  }, [partnersQuery.data?.items, activeRow?.placementLabel]);

  function closePanel() {
    setPanelOpen(false);
    setActiveRow(null);
    setForm(EMPTY_FORM);
  }

  function openSubmit(row: RosterRow) {
    setActiveRow(row);
    const checkIn = row.checkIn;
    const defaultLocation = checkIn?.locationConfirmed ?? row.placementLabel ?? "";
    setForm({
      stillAtPlacement: checkIn?.stillAtPlacement ?? true,
      locationConfirmed: defaultLocation,
      mainActivities: checkIn?.mainActivities ?? "",
      highlights: checkIn?.highlights ?? "",
      challenges: checkIn?.challenges ?? "",
      supportNeeded: checkIn?.supportNeeded ?? "",
      careerMilestone: checkIn?.careerMilestone ?? false,
      milestoneDescription: checkIn?.milestoneDescription ?? "",
      daysWorked: checkIn?.daysWorked != null ? String(checkIn.daysWorked) : "",
    });
    setPanelOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRow) return;

    const daysWorked = form.daysWorked.trim() ? Number.parseInt(form.daysWorked, 10) : undefined;
    if (form.daysWorked.trim() && (Number.isNaN(daysWorked) || (daysWorked ?? 0) < 0)) {
      toast.error("Days worked must be a valid number");
      return;
    }

    submitMutation.mutate({
      tenantId,
      fellowId: activeRow.fellowId,
      periodMonth,
      periodYear,
      placementId: activeRow.currentPlacementId ?? undefined,
      stillAtPlacement: form.stillAtPlacement,
      locationConfirmed: form.stillAtPlacement
        ? (activeRow.placementLabel ?? form.locationConfirmed.trim()) || undefined
        : form.locationConfirmed.trim() || undefined,
      mainActivities: form.mainActivities.trim() || undefined,
      highlights: form.highlights.trim() || undefined,
      challenges: form.challenges.trim() || undefined,
      supportNeeded: form.supportNeeded.trim() || undefined,
      careerMilestone: form.careerMilestone,
      milestoneDescription: form.milestoneDescription.trim() || undefined,
      daysWorked,
    });
  }

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={submitMutation.isPending}>
        Cancel
      </button>
      <button type="submit" form="checkin-form" className="rm-primary" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        Save check-in
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="nm-filter-bar">
        <div className="rm-search" style={{ flex: 1, minWidth: 200 }}>
          <IconSearch size={16} />
          <input placeholder="Search fellows…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ width: 200 }}>
          <SlideSelect
            value={periodValue}
            onChange={setPeriodValue}
            options={PERIOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="Select month"
          />
        </div>
        <div style={{ width: 160 }}>
          <SlideSelect
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
            options={FILTER_STATUSES.map((status) => ({ value: status.value, label: status.label }))}
            placeholder="Filter"
          />
        </div>
      </div>

      {rosterQuery.isLoading ? (
        <div className="rm-state">Loading check-in roster…</div>
      ) : rosterQuery.isError ? (
        <div className="rm-state rm-state-error">{rosterQuery.error.message}</div>
      ) : rows.length === 0 ? (
        <CountrySectionEmpty
          title="No fellows due for check-in"
          description={`Only active fellows in in-progress cohorts appear here. Mark graduated members as alumni in Cohorts or Network.`}
          accent={accent}
        />
      ) : (
        <div className="gc" style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font)" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--emuted)", borderBottom: "1px solid var(--eborder)" }}>
                <th style={{ padding: "10px 12px", width: 48 }}>#</th>
                <th style={{ padding: "10px 12px" }}>Fellow</th>
                <th style={{ padding: "10px 12px" }}>Program</th>
                <th style={{ padding: "10px 12px" }}>Location</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px" }}>Submitted</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr key={row.fellowId} style={{ borderBottom: "1px solid var(--eborder)", color: "var(--ewhite)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)", fontVariantNumeric: "tabular-nums" }}>
                    {rangeStart + index}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600 }}>{row.firstName} {row.lastName}</div>
                    <div style={{ fontSize: 11, color: "var(--emuted)" }}>{row.email}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{row.program}</td>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)" }}>{row.placementLabel ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className={statusPill(row.isSubmitted)}>
                      {row.isSubmitted ? "Submitted" : "Pending"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)" }}>
                    {row.checkIn?.submittedAt
                      ? new Date(row.checkIn.submittedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div className="nm-row-actions" style={{ justifyContent: "flex-end" }}>
                      <button type="button" className="nm-row-action" onClick={() => openSubmit(row)}>
                        {row.isSubmitted ? <IconPencil size={14} /> : <IconChecklist size={14} />}
                        {row.isSubmitted ? "Edit" : "Submit"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!rosterQuery.isLoading && !rosterQuery.isError && totalRows > 0 && (
        <div
          className="nm-pagination"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span className="nm-pagination-meta">
            Showing <strong style={{ color: "var(--ewhite)", fontWeight: 700 }}>{rangeStart}–{rangeEnd}</strong>
            {" "}of {totalRows}
          </span>
          <div
            className="nm-pagination-controls"
            style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
          >
            <button
              type="button"
              className="nm-pagination-btn"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <IconChevronLeft size={16} style={{ flexShrink: 0 }} />
              <span>Prev</span>
            </button>
            <span
              className="nm-pagination-page"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                minWidth: 110,
              }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="nm-pagination-btn"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <span>Next</span>
              <IconChevronRight size={16} style={{ flexShrink: 0 }} />
            </button>
          </div>
        </div>
      )}

      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={activeRow ? `${activeRow.firstName} ${activeRow.lastName}` : "Check-in"}
        description={`${hubName} · ${formatPeriodLabel(periodMonth, periodYear)}`}
        footer={footer}
        width={540}
      >
        {activeRow && (
          <form id="checkin-form" onSubmit={handleSubmit} className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconMapPin size={16} /> Location
              </div>
              {activeRow.placementLabel ? (
                <p className="rm-panel-hint" style={{ margin: 0 }}>
                  From Network profile: <strong style={{ color: "var(--ewhite)" }}>{activeRow.placementLabel}</strong>
                </p>
              ) : (
                <p className="rm-panel-hint" style={{ margin: 0 }}>
                  No service location on this fellow yet — pick a partner below, or set it on Network first.
                </p>
              )}
              <SlideToggle
                checked={form.stillAtPlacement}
                onChange={(stillAtPlacement) => {
                  setForm((prev) => ({
                    ...prev,
                    stillAtPlacement,
                    locationConfirmed: stillAtPlacement
                      ? activeRow.placementLabel ?? prev.locationConfirmed
                      : prev.locationConfirmed,
                  }));
                }}
                label="Still at this location"
                description="Fellow remains where they serve this month"
              />
              {(!form.stillAtPlacement || !activeRow.placementLabel) && (
                <div className="epl-slide-field">
                  <span>Confirm location</span>
                  <SlideSelect
                    value={form.locationConfirmed}
                    onChange={(locationConfirmed) => setForm((prev) => ({ ...prev, locationConfirmed }))}
                    options={locationOptions}
                    searchable
                    searchPlaceholder="Search partners…"
                    placeholder={
                      locationOptions.length === 0
                        ? "Add partners first"
                        : "Search and select partner location"
                    }
                    allowEmpty
                    emptyLabel="Clear location"
                  />
                  <p className="rm-panel-hint">
                    Options come from Partners. Only needed if the fellow moved or has no location on file.
                  </p>
                </div>
              )}
              <div className="epl-slide-field">
                <span>Days worked this month</span>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={form.daysWorked}
                  onChange={(e) => setForm((prev) => ({ ...prev, daysWorked: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconNotes size={16} /> This month
              </div>
              <label className="epl-slide-field">
                <span>Main activities</span>
                <textarea
                  value={form.mainActivities}
                  onChange={(e) => setForm((prev) => ({ ...prev, mainActivities: e.target.value }))}
                  placeholder="What did they work on this month?"
                  rows={3}
                />
              </label>
              <label className="epl-slide-field">
                <span>Highlights</span>
                <textarea
                  value={form.highlights}
                  onChange={(e) => setForm((prev) => ({ ...prev, highlights: e.target.value }))}
                  placeholder="Wins, impact, recognition…"
                  rows={3}
                />
              </label>
              <label className="epl-slide-field">
                <span>Challenges</span>
                <textarea
                  value={form.challenges}
                  onChange={(e) => setForm((prev) => ({ ...prev, challenges: e.target.value }))}
                  placeholder="Obstacles or risks this month"
                  rows={3}
                />
              </label>
              <label className="epl-slide-field">
                <span>Support needed</span>
                <textarea
                  value={form.supportNeeded}
                  onChange={(e) => setForm((prev) => ({ ...prev, supportNeeded: e.target.value }))}
                  placeholder="Anything EPL or the country team should follow up on"
                  rows={2}
                />
              </label>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconChecklist size={16} /> Milestones
              </div>
              <SlideToggle
                checked={form.careerMilestone}
                onChange={(careerMilestone) => setForm((prev) => ({ ...prev, careerMilestone }))}
                label="Career milestone this month"
                description="Promotion, new role, certification, or similar"
              />
              {form.careerMilestone && (
                <label className="epl-slide-field">
                  <span>Milestone description</span>
                  <textarea
                    value={form.milestoneDescription}
                    onChange={(e) => setForm((prev) => ({ ...prev, milestoneDescription: e.target.value }))}
                    placeholder="Describe the milestone"
                    rows={2}
                  />
                </label>
              )}
            </section>
          </form>
        )}
      </SlidePanel>
    </div>
  );
}
