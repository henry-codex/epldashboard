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
  IconStack2,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { SlideToggle } from "@/components/epl/slide-toggle";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { CohortsTimeline, type CohortTimelineItem } from "@/components/epl/cohorts-timeline";
import { CohortsBreakdownTable } from "@/components/epl/cohorts-metrics";
import { useConfirm } from "@/components/epl/confirm-dialog";
import { queryClient, trpc } from "@/utils/trpc";

const STATUSES = [
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
] as const;

const COHORT_YEARS = Array.from({ length: 16 }, (_, index) => {
  const year = new Date().getFullYear() - 10 + index;
  return { value: String(year), label: String(year) };
});

type CohortRow = CohortTimelineItem;

type CohortForm = {
  label: string;
  cohortNumber: string;
  cohortYear: string;
  status: "in_progress" | "completed";
  startsOn: string;
  endsOn: string;
  startedCount: string;
  graduatedCount: string;
  placedCount: string;
  toBeRecruitedCount: string;
  maleCount: string;
  femaleCount: string;
  pwdCount: string;
  idpCount: string;
  scholarCount: string;
  attritionRatePercent: string;
  attritionMale: string;
  attritionFemale: string;
  attritionPwd: string;
  attritionIdp: string;
  isMcf: boolean;
  notes: string;
};

const EMPTY_FORM: CohortForm = {
  label: "",
  cohortNumber: "",
  cohortYear: "",
  status: "in_progress",
  startsOn: "",
  endsOn: "",
  startedCount: "",
  graduatedCount: "",
  placedCount: "",
  toBeRecruitedCount: "",
  maleCount: "",
  femaleCount: "",
  pwdCount: "",
  idpCount: "",
  scholarCount: "",
  attritionRatePercent: "",
  attritionMale: "",
  attritionFemale: "",
  attritionPwd: "",
  attritionIdp: "",
  isMcf: false,
  notes: "",
};

type Props = {
  tenantId: string;
  hubName: string;
  accent: string;
  countryId: string;
  readOnly?: boolean;
};

export function CohortsManager({ tenantId, hubName, accent, countryId, readOnly = false }: Props) {
  const confirm = useConfirm();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CohortForm>(EMPTY_FORM);

  const listQuery = useQuery(trpc.cohorts.list.queryOptions({ tenantId }));

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.cohorts.list.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.cohorts.aggregates.queryKey({ tenantId }) }),
    ]);
  }, [tenantId]);

  const createMutation = useMutation(
    trpc.cohorts.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Cohort created");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.cohorts.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Cohort updated");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.cohorts.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Cohort removed");
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const cohorts = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate(prefill?: Partial<CohortForm>) {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, ...prefill });
    setPanelOpen(true);
  }

  function openEdit(row: CohortRow) {
    if (!row.id) return;
    setEditingId(row.id);
    setForm({
      label: row.label,
      cohortNumber: row.cohortNumber != null ? String(row.cohortNumber) : "",
      cohortYear: row.cohortYear != null ? String(row.cohortYear) : "",
      status: row.status,
      startsOn: row.startsOn ?? "",
      endsOn: row.endsOn ?? "",
      startedCount: String(row.startedCount ?? row.totalFellows ?? ""),
      graduatedCount: String(row.graduatedCount ?? row.alumniFellows ?? ""),
      placedCount: String(row.placedCount ?? row.placed ?? ""),
      toBeRecruitedCount: row.toBeRecruitedCount != null ? String(row.toBeRecruitedCount) : "",
      maleCount: row.maleCount != null ? String(row.maleCount) : "",
      femaleCount: row.femaleCount != null ? String(row.femaleCount) : "",
      pwdCount: row.pwdCount != null ? String(row.pwdCount) : "",
      idpCount: row.idpCount != null ? String(row.idpCount) : "",
      scholarCount: row.scholarCount != null ? String(row.scholarCount) : "",
      attritionRatePercent: row.attritionRatePercent != null ? String(row.attritionRatePercent) : "",
      attritionMale: row.attritionMale != null ? String(row.attritionMale) : "",
      attritionFemale: row.attritionFemale != null ? String(row.attritionFemale) : "",
      attritionPwd: row.attritionPwd != null ? String(row.attritionPwd) : "",
      attritionIdp: row.attritionIdp != null ? String(row.attritionIdp) : "",
      isMcf: row.isMcf ?? false,
      notes: row.notes ?? "",
    });
    setPanelOpen(true);
  }

  function parseCountField(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function parseOptionalInt(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const label = form.label.trim();
    if (!label) {
      toast.error("Cohort label is required");
      return;
    }
    if (!form.startsOn || !form.endsOn) {
      toast.error("Start and end dates are required for the cohort timeline");
      return;
    }
    if (form.endsOn < form.startsOn) {
      toast.error("End date must be on or after the start date");
      return;
    }

    const payload = {
      tenantId,
      label,
      cohortNumber: parseOptionalInt(form.cohortNumber),
      cohortYear: parseOptionalInt(form.cohortYear),
      status: form.status,
      startsOn: form.startsOn,
      endsOn: form.endsOn,
      startedCount: parseCountField(form.startedCount),
      graduatedCount: parseCountField(form.graduatedCount),
      placedCount: parseCountField(form.placedCount),
      toBeRecruitedCount: parseCountField(form.toBeRecruitedCount),
      maleCount: parseCountField(form.maleCount),
      femaleCount: parseCountField(form.femaleCount),
      pwdCount: parseCountField(form.pwdCount),
      idpCount: parseCountField(form.idpCount),
      scholarCount: parseCountField(form.scholarCount),
      attritionRatePercent: parseCountField(form.attritionRatePercent),
      attritionMale: parseCountField(form.attritionMale),
      attritionFemale: parseCountField(form.attritionFemale),
      attritionPwd: parseCountField(form.attritionPwd),
      attritionIdp: parseCountField(form.attritionIdp),
      isMcf: form.isMcf,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ ...payload, id: editingId });
    } else {
      createMutation.mutate(payload);
    }
  }

  function openSetup(row: CohortRow) {
    openCreate({
      label: row.label,
      cohortYear: row.cohortYear != null ? String(row.cohortYear) : "",
      status: row.inProgress ? "in_progress" : "completed",
    });
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const savedCohorts = cohorts.filter((c) => !c.isVirtual);
  const draftCohorts = readOnly ? [] : cohorts.filter((c) => c.isVirtual);

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={isPending}>
        Cancel
      </button>
      <button type="submit" form="cohort-form" className="rm-primary" disabled={isPending}>
        {isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editingId ? "Save changes" : "Add cohort"}
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {!readOnly && (
        <div className="nm-toolbar gc">
          <button type="button" className="rm-primary" onClick={() => openCreate()}>
            <IconPlus size={16} /> Add cohort
          </button>
        </div>
      )}

      {listQuery.isLoading ? (
        <div className="rm-state">Loading cohorts…</div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : cohorts.length === 0 || (readOnly && savedCohorts.length === 0) ? (
        <CountrySectionEmpty
          title={readOnly ? "No cohorts yet" : "No cohorts yet"}
          description={
            readOnly
              ? "Country managers add cohort records for each class. Totals will appear here once they are entered."
              : "Add your first cohort — e.g. Cohort 7 with started and graduated counts for a historic class."
          }
          accent={accent}
        />
      ) : (
        <>
          {draftCohorts.length > 0 && (
            <CohortsTimeline
              cohorts={draftCohorts}
              countryId={countryId}
              accent={accent}
              canManage
              onSetup={(row) => openSetup(row)}
            />
          )}
          {savedCohorts.length > 0 && (
            <>
              {readOnly && <CohortsBreakdownTable cohorts={savedCohorts} accent={accent} />}
              <CohortsTimeline
                cohorts={savedCohorts}
                countryId={countryId}
                accent={accent}
                canManage={!readOnly}
                onEdit={readOnly ? undefined : (row) => openEdit(row)}
                onDelete={
                  readOnly
                    ? undefined
                    : async (id) => {
                        const ok = await confirm({
                          title: "Remove cohort record?",
                          message: "Remove this cohort record? Manual stats will be lost.",
                          confirmLabel: "Remove",
                          danger: true,
                        });
                        if (ok) deleteMutation.mutate({ tenantId, id });
                      }
                }
                deletingId={deleteMutation.isPending ? deleteMutation.variables?.id : undefined}
              />
            </>
          )}
        </>
      )}

      {!readOnly && (
      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editingId ? "Edit cohort" : "Add cohort"}
        description={`${hubName} · cohort timeline`}
        footer={footer}
        width={560}
      >
        <form id="cohort-form" onSubmit={handleSubmit} className="rm-panel-form">
          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconStack2 size={16} /> Identity
            </div>
            <div className="epl-slide-field">
              <span>Cohort label</span>
              <input
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="e.g. Cohort 7"
                required
              />
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>Cohort number</span>
                <input
                  type="number"
                  min={1}
                  value={form.cohortNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, cohortNumber: e.target.value }))}
                  placeholder="Auto from label"
                />
              </div>
              <div className="epl-slide-field">
                <span>Link cohort year</span>
                <SlideSelect
                  value={form.cohortYear}
                  onChange={(cohortYear) => setForm((prev) => ({ ...prev, cohortYear }))}
                  options={[{ value: "", label: "None (manual only)" }, ...COHORT_YEARS]}
                  placeholder="Optional"
                />
              </div>
            </div>
            <p className="rm-panel-hint" style={{ margin: 0 }}>
              Set a cohort year so Network fellows can be linked to this cohort.
            </p>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>Starts on</span>
                <input
                  type="date"
                  value={form.startsOn}
                  onChange={(e) => setForm((prev) => ({ ...prev, startsOn: e.target.value }))}
                  required
                />
              </div>
              <div className="epl-slide-field">
                <span>Ends on</span>
                <input
                  type="date"
                  value={form.endsOn}
                  onChange={(e) => setForm((prev) => ({ ...prev, endsOn: e.target.value }))}
                  required
                />
              </div>
            </div>
            <p className="rm-panel-hint" style={{ margin: 0 }}>
              Used to track fellowship timeline until the cohort ends.
            </p>
            <div className="epl-slide-field">
              <span>Status</span>
              <SlideSelect
                value={form.status}
                onChange={(status) => setForm((prev) => ({ ...prev, status: status as CohortForm["status"] }))}
                options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">Historic counts</div>
            <p className="rm-panel-hint" style={{ margin: "0 0 12px" }}>
              {form.status === "completed"
                ? "For older cohorts without individual fellow records — enter how many started, graduated, and were retained."
                : "For older cohorts without individual fellow records — enter how many started. Retention is recorded after graduation."}
            </p>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>Started</span>
                <input
                  type="number"
                  min={0}
                  value={form.startedCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, startedCount: e.target.value }))}
                  placeholder="e.g. 22"
                />
              </div>
              {form.status === "completed" && (
                <div className="epl-slide-field">
                  <span>Graduated</span>
                  <input
                    type="number"
                    min={0}
                    value={form.graduatedCount}
                    onChange={(e) => setForm((prev) => ({ ...prev, graduatedCount: e.target.value }))}
                    placeholder="e.g. 18"
                  />
                </div>
              )}
            </div>
            {form.status === "completed" && (
            <div className="epl-slide-field">
              <span>Retained</span>
              <input
                type="number"
                min={0}
                value={form.placedCount}
                onChange={(e) => setForm((prev) => ({ ...prev, placedCount: e.target.value }))}
                placeholder="e.g. 20"
              />
            </div>
            )}
            <div className="epl-slide-field">
              <span>Total to be recruited</span>
              <input
                type="number"
                min={0}
                value={form.toBeRecruitedCount}
                onChange={(e) => setForm((prev) => ({ ...prev, toBeRecruitedCount: e.target.value }))}
                placeholder="e.g. 5"
              />
            </div>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">Demographics & funding</div>
            <p className="rm-panel-hint" style={{ margin: "0 0 12px" }}>
              Matches the country stats sheet — gender split, PWDs, IDPs, and Foundation Scholars for this cohort.
            </p>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>Male</span>
                <input
                  type="number"
                  min={0}
                  value={form.maleCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, maleCount: e.target.value }))}
                />
              </div>
              <div className="epl-slide-field">
                <span>Female</span>
                <input
                  type="number"
                  min={0}
                  value={form.femaleCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, femaleCount: e.target.value }))}
                />
              </div>
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>PWDs</span>
                <input
                  type="number"
                  min={0}
                  value={form.pwdCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, pwdCount: e.target.value }))}
                />
              </div>
              <div className="epl-slide-field">
                <span>IDPs</span>
                <input
                  type="number"
                  min={0}
                  value={form.idpCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, idpCount: e.target.value }))}
                />
              </div>
            </div>
            <div className="epl-slide-field">
              <span>Foundation Scholars</span>
              <input
                type="number"
                min={0}
                value={form.scholarCount}
                onChange={(e) => setForm((prev) => ({ ...prev, scholarCount: e.target.value }))}
              />
            </div>
            <SlideToggle
              checked={form.isMcf}
              onChange={(isMcf) => setForm((prev) => ({ ...prev, isMcf }))}
              label="Mastercard Foundation funded"
              description="Included in the MCF-funded slice of this hub's stats"
            />
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">Attrition</div>
            <p className="rm-panel-hint" style={{ margin: "0 0 12px" }}>
              Percent (0–100) who left this cohort, overall and by group.
            </p>
            <div className="epl-slide-field">
              <span>Overall attrition rate (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.attritionRatePercent}
                onChange={(e) => setForm((prev) => ({ ...prev, attritionRatePercent: e.target.value }))}
                placeholder="e.g. 4"
              />
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>Male (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.attritionMale}
                  onChange={(e) => setForm((prev) => ({ ...prev, attritionMale: e.target.value }))}
                />
              </div>
              <div className="epl-slide-field">
                <span>Female (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.attritionFemale}
                  onChange={(e) => setForm((prev) => ({ ...prev, attritionFemale: e.target.value }))}
                />
              </div>
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>PWDs (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.attritionPwd}
                  onChange={(e) => setForm((prev) => ({ ...prev, attritionPwd: e.target.value }))}
                />
              </div>
              <div className="epl-slide-field">
                <span>IDPs (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.attritionIdp}
                  onChange={(e) => setForm((prev) => ({ ...prev, attritionIdp: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className="rm-panel-section">
            <label className="epl-slide-field">
              <span>Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional context for this cohort"
                rows={2}
              />
            </label>
          </section>
        </form>
      </SlidePanel>
      )}
    </div>
  );
}
