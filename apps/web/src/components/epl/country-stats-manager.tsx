"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconUpload,
  IconLoader2,
  IconPlus,
  IconPencil,
  IconCheck,
  IconChartBar,
  IconEye,
  IconUsersGroup,
  IconSchool,
  IconTarget,
  IconAccessible,
  IconHome2,
  IconAward,
  IconTrendingDown,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { SlideToggle } from "@/components/epl/slide-toggle";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { RowActionsMenu } from "@/components/epl/row-actions-menu";
import { queryClient, trpc } from "@/utils/trpc";

type Props = {
  tenantId: string;
  hubName: string;
  accent: string;
  readOnly?: boolean;
};

type StatsCohort = {
  id: string | null;
  label: string;
  cohortYear: number | null;
  isVirtual: boolean;
  isMcf: boolean;
  status: "in_progress" | "completed";
  statusLabel: string;
  startedCount: number | null;
  graduatedCount: number | null;
  toBeRecruitedCount: number | null;
  maleCount: number | null;
  femaleCount: number | null;
  pwdCount: number | null;
  idpCount: number | null;
  scholarCount: number | null;
  attritionRatePercent: number | null;
  attritionMale: number | null;
  attritionFemale: number | null;
  attritionPwd: number | null;
  attritionIdp: number | null;
};

type StatsForm = {
  label: string;
  cohortYear: string;
  status: "in_progress" | "completed";
  isMcf: boolean;
  startedCount: string;
  graduatedCount: string;
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
};

const EMPTY_FORM: StatsForm = {
  label: "",
  cohortYear: "",
  status: "in_progress",
  isMcf: false,
  startedCount: "",
  graduatedCount: "",
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
};

const COHORT_YEARS = Array.from({ length: 16 }, (_, index) => {
  const year = new Date().getFullYear() - 10 + index;
  return { value: String(year), label: String(year) };
});

const STATUSES = [
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
] as const;

// Grouped in the same order as the view modal — Recruitment together,
// Demographics together — so a super-header can span each block cleanly.
// "To be recruited" lives in the edit form and the detail modal only — most
// cohorts don't have it, so it cluttered the list with dashes/zeros.
const TABLE_COLUMNS =
  "1.3fr 0.6fr 0.8fr 0.9fr 0.6fr 0.6fr 0.6fr 0.6fr 0.8fr 0.9fr 0.5fr";

// Same shape minus the actions column — MCF figures are import-only, since
// they're the Foundation's reported numbers rather than the hub's own.
const MCF_TABLE_COLUMNS =
  "1.3fr 0.6fr 0.9fr 0.9fr 0.6fr 0.6fr 0.6fr 0.6fr 0.8fr 0.9fr";

function dash(value: number | null | undefined) {
  return value == null ? "—" : String(value);
}

/** Distinguishes a genuine unknown ("—") from a real reported zero, so old cohorts with lots of missing fields don't visually compete with cohorts that have real data. */
function cellClass(value: number | null | undefined) {
  return value == null ? "cs-cell-muted" : "";
}

function pct(value: number | null | undefined) {
  return value == null ? "—" : `${value}%`;
}

function parseField(value: string): number | null {
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

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 130px",
        padding: 16,
        borderRadius: 12,
        background: "var(--eglass)",
        border: "1px solid var(--eborder)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>{label}</div>
    </div>
  );
}

function AttritionChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        background: "rgba(232, 160, 32, 0.1)",
        border: "1px solid rgba(232, 160, 32, 0.3)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#E8A020", fontFamily: "var(--font)" }}>{value}</span>
    </div>
  );
}

function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font)" }}>
        {title}
      </div>
      {children}
    </section>
  );
}

export function CountryStatsManager({ tenantId, hubName, accent, readOnly = false }: Props) {
  const listQuery = useQuery(trpc.cohorts.list.queryOptions({ tenantId }));
  const mcfQuery = useQuery(trpc.cohorts.mcfStats.queryOptions({ tenantId }));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mcfFileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"all" | "mcf">("all");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StatsForm>(EMPTY_FORM);
  const [viewingCohort, setViewingCohort] = useState<StatsCohort | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.cohorts.list.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.cohorts.aggregates.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.cohorts.mcfStats.queryKey({ tenantId }) }),
    ]);
  }, [tenantId]);

  const importStatsMutation = useMutation(
    trpc.cohorts.importStats.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`Stats applied: ${result.created} cohort(s) created, ${result.updated} updated`);
        if (result.warnings.length > 0) toast.warning(result.warnings[0]!);
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const importMcfMutation = useMutation(
    trpc.cohorts.importMcfStats.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`MCF stats applied: ${result.created} added, ${result.updated} updated`);
        if (result.warnings.length > 0) toast.warning(result.warnings[0]!);
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function handleImportMcfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text.trim()) {
        toast.error("CSV file is empty");
        return;
      }
      importMcfMutation.mutate({ tenantId, csv: text });
    };
    reader.readAsText(file);
  }

  const createMutation = useMutation(
    trpc.cohorts.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Cohort stats added");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.cohorts.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Cohort stats updated");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text.trim()) {
        toast.error("CSV file is empty");
        return;
      }
      importStatsMutation.mutate({ tenantId, csv: text });
    };
    reader.readAsText(file);
  }

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

  function openEdit(cohort: StatsCohort) {
    if (!cohort.id) return;
    setViewingCohort(null);
    setEditingId(cohort.id);
    setForm({
      label: cohort.label,
      cohortYear: cohort.cohortYear != null ? String(cohort.cohortYear) : "",
      status: cohort.status,
      isMcf: cohort.isMcf,
      startedCount: cohort.startedCount != null ? String(cohort.startedCount) : "",
      graduatedCount: cohort.graduatedCount != null ? String(cohort.graduatedCount) : "",
      toBeRecruitedCount: cohort.toBeRecruitedCount != null ? String(cohort.toBeRecruitedCount) : "",
      maleCount: cohort.maleCount != null ? String(cohort.maleCount) : "",
      femaleCount: cohort.femaleCount != null ? String(cohort.femaleCount) : "",
      pwdCount: cohort.pwdCount != null ? String(cohort.pwdCount) : "",
      idpCount: cohort.idpCount != null ? String(cohort.idpCount) : "",
      scholarCount: cohort.scholarCount != null ? String(cohort.scholarCount) : "",
      attritionRatePercent: cohort.attritionRatePercent != null ? String(cohort.attritionRatePercent) : "",
      attritionMale: cohort.attritionMale != null ? String(cohort.attritionMale) : "",
      attritionFemale: cohort.attritionFemale != null ? String(cohort.attritionFemale) : "",
      attritionPwd: cohort.attritionPwd != null ? String(cohort.attritionPwd) : "",
      attritionIdp: cohort.attritionIdp != null ? String(cohort.attritionIdp) : "",
    });
    setPanelOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const label = form.label.trim();
    if (!label) {
      toast.error("Cohort label is required");
      return;
    }

    const statsFields = {
      tenantId,
      cohortYear: parseOptionalInt(form.cohortYear),
      status: form.status,
      isMcf: form.isMcf,
      startedCount: parseField(form.startedCount),
      graduatedCount: parseField(form.graduatedCount),
      toBeRecruitedCount: parseField(form.toBeRecruitedCount),
      maleCount: parseField(form.maleCount),
      femaleCount: parseField(form.femaleCount),
      pwdCount: parseField(form.pwdCount),
      idpCount: parseField(form.idpCount),
      scholarCount: parseField(form.scholarCount),
      attritionRatePercent: parseField(form.attritionRatePercent),
      attritionMale: parseField(form.attritionMale),
      attritionFemale: parseField(form.attritionFemale),
      attritionPwd: parseField(form.attritionPwd),
      attritionIdp: parseField(form.attritionIdp),
    };

    if (editingId) {
      // Label is left out on purpose — the label field is disabled while
      // editing, and the update endpoint re-derives cohortNumber from any
      // label it's given (only recognizing arabic digits), which would
      // wipe the cohortNumber on roman-numeral labels like "Class XIV".
      updateMutation.mutate({ ...statsFields, id: editingId });
    } else {
      createMutation.mutate({ ...statsFields, label });
    }
  }

  const cohorts = (listQuery.data?.items ?? []).filter((c) => !c.isVirtual) as StatsCohort[];
  const isPending = createMutation.isPending || updateMutation.isPending;

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={isPending}>
        Cancel
      </button>
      <button type="submit" form="country-stats-form" className="rm-primary" disabled={isPending}>
        {isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editingId ? "Save changes" : "Add cohort stats"}
      </button>
    </div>
  );

  const mcfRows = mcfQuery.data?.items ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="cs-tabs" style={{ "--tab-accent": accent } as React.CSSProperties}>
        <button
          type="button"
          className={`cs-tab${tab === "all" ? " is-active" : ""}`}
          onClick={() => setTab("all")}
        >
          All Stats
        </button>
        <button
          type="button"
          className={`cs-tab${tab === "mcf" ? " is-active" : ""}`}
          onClick={() => setTab("mcf")}
        >
          MCF Stats
          {mcfRows.length > 0 && <span className="cs-tab-count">{mcfRows.length}</span>}
        </button>
      </div>

      {!readOnly && tab === "all" && (
        <div className="nm-toolbar gc">
          <button type="button" className="rm-primary" onClick={openCreate}>
            <IconPlus size={16} /> Add cohort stats
          </button>
          <button
            type="button"
            className="rm-ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={importStatsMutation.isPending}
            title="Upload the workbook's All Stats sheet — only this hub's own country block is read"
          >
            {importStatsMutation.isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconUpload size={16} />}
            Import Country Stats
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportFile} />
        </div>
      )}

      {!readOnly && tab === "mcf" && (
        <div className="nm-toolbar gc">
          <button
            type="button"
            className="rm-primary"
            onClick={() => mcfFileInputRef.current?.click()}
            disabled={importMcfMutation.isPending}
            title="Upload the workbook's MCF_Stats sheet — only this hub's own country block is read"
          >
            {importMcfMutation.isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconUpload size={16} />}
            Import MCF Stats
          </button>
          <input ref={mcfFileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportMcfFile} />
        </div>
      )}

      {tab === "mcf" ? (
        mcfQuery.isLoading ? (
          <div className="rm-state">Loading MCF stats…</div>
        ) : mcfQuery.isError ? (
          <div className="rm-state rm-state-error">{mcfQuery.error.message}</div>
        ) : mcfRows.length === 0 ? (
          <CountrySectionEmpty
            title="No Mastercard Foundation stats yet"
            description={
              readOnly
                ? "The Foundation's own reported figures for this hub will appear here once imported."
                : `Import ${hubName}'s block from the workbook's MCF_Stats sheet. Cohorts must already exist under All Stats.`
            }
            accent={accent}
          />
        ) : (
          <div className="gc" style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 12, overflowX: "auto" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                Mastercard Foundation stats
              </div>
              <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 4 }}>
                The Foundation&apos;s own reported figures — its funded slice only, so these can differ from the hub&apos;s country-wide totals.
              </div>
            </div>

            <div style={{ minWidth: 1120 }}>
              <div className="cs-group-row" style={{ display: "grid", gridTemplateColumns: MCF_TABLE_COLUMNS, gap: 10 }}>
                <span />
                <span />
                <span className="cs-group-label" style={{ gridColumn: "span 2" }}>Recruitment</span>
                <span className="cs-group-label" style={{ gridColumn: "span 5" }}>Demographics</span>
                <span className="cs-group-label">Attrition</span>
              </div>

              <div
                className="cs-header-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: MCF_TABLE_COLUMNS,
                  gap: 10,
                  fontSize: 11,
                  color: "var(--emuted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "var(--font)",
                  fontWeight: 700,
                }}
              >
                <span>Cohort</span>
                <span style={{ textAlign: "center" }}>Year</span>
                <span style={{ textAlign: "center" }}>MCF recruited</span>
                <span style={{ textAlign: "center" }}>Graduated</span>
                <span style={{ textAlign: "center" }}>Male</span>
                <span style={{ textAlign: "center" }}>Female</span>
                <span style={{ textAlign: "center" }}>PWDs</span>
                <span style={{ textAlign: "center" }}>IDPs</span>
                <span style={{ textAlign: "center" }}>Scholars</span>
                <span style={{ textAlign: "center" }}>Rate</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {mcfRows.map((row, index) => {
                  const differs =
                    row.startedCount != null &&
                    row.hubStartedCount != null &&
                    row.startedCount !== row.hubStartedCount;
                  return (
                    <div
                      key={row.id}
                      className={`cs-row${index % 2 === 1 ? " is-alt" : ""}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: MCF_TABLE_COLUMNS,
                        gap: 10,
                        padding: "13px 12px",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 800, color: accent, fontFamily: "var(--font)" }}>
                        {row.label}
                      </span>
                      <span style={{ textAlign: "center" }}>
                        <span className="cs-year-pill" style={{ fontSize: 13, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                          {dash(row.cohortYear)}
                        </span>
                      </span>
                      <span
                        className={cellClass(row.startedCount)}
                        style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}
                        title={differs ? `Hub-wide total for this cohort is ${row.hubStartedCount}` : undefined}
                      >
                        {dash(row.startedCount)}
                        {differs && (
                          <span style={{ fontSize: 10, color: "var(--emuted)", marginLeft: 4 }}>
                            /{row.hubStartedCount}
                          </span>
                        )}
                      </span>
                      <span className={cellClass(row.graduatedCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                        {dash(row.graduatedCount)}
                      </span>
                      <span className={cellClass(row.maleCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                        {dash(row.maleCount)}
                      </span>
                      <span className={cellClass(row.femaleCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                        {dash(row.femaleCount)}
                      </span>
                      <span className={cellClass(row.pwdCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                        {dash(row.pwdCount)}
                      </span>
                      <span className={cellClass(row.idpCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                        {dash(row.idpCount)}
                      </span>
                      <span className={cellClass(row.scholarCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                        {dash(row.scholarCount)}
                      </span>
                      <span style={{ textAlign: "center" }}>
                        <span className={`cs-attrition-pill${row.attritionRatePercent == null ? " is-empty" : ""}`} style={{ fontSize: 12, fontFamily: "var(--font)" }}>
                          {pct(row.attritionRatePercent)}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      ) : listQuery.isLoading ? (
        <div className="rm-state">Loading stats…</div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : cohorts.length === 0 ? (
        <CountrySectionEmpty
          title="No cohort stats yet"
          description={
            readOnly
              ? "Country managers import or enter cohort planning numbers here — attrition, recruitment targets, and demographic breakdowns."
              : `Import ${hubName}'s block from the All Stats sheet, or add a cohort's numbers by hand.`
          }
          accent={accent}
        />
      ) : (
        <div className="gc" style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 12, overflowX: "auto" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              Cohort planning stats
            </div>
            <div style={{ fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", marginTop: 4 }}>
              Click a cohort to see every field. Recruitment targets and attrition come only from import or manual entry.
            </div>
          </div>

          <div style={{ minWidth: 1220 }}>
            <div className="cs-group-row" style={{ display: "grid", gridTemplateColumns: TABLE_COLUMNS, gap: 10 }}>
              <span />
              <span />
              <span className="cs-group-label" style={{ gridColumn: "span 2" }}>Recruitment</span>
              <span className="cs-group-label" style={{ gridColumn: "span 5" }}>Demographics</span>
              <span className="cs-group-label">Attrition</span>
              <span />
            </div>

            <div
              className="cs-header-row"
              style={{
                display: "grid",
                gridTemplateColumns: TABLE_COLUMNS,
                gap: 10,
                fontSize: 11,
                color: "var(--emuted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "var(--font)",
                fontWeight: 700,
              }}
            >
              <span>Cohort</span>
              <span style={{ textAlign: "center" }}>Year</span>
              <span style={{ textAlign: "center" }}>Total recruited</span>
              <span style={{ textAlign: "center" }}>Graduated</span>
              <span style={{ textAlign: "center" }}>Male</span>
              <span style={{ textAlign: "center" }}>Female</span>
              <span style={{ textAlign: "center" }}>PWDs</span>
              <span style={{ textAlign: "center" }}>IDPs</span>
              <span style={{ textAlign: "center" }}>Scholars</span>
              <span style={{ textAlign: "center" }}>Rate</span>
              <span />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {cohorts.map((cohort, index) => (
                <div
                  key={cohort.id ?? cohort.label}
                  onClick={() => setViewingCohort(cohort)}
                  className={`cs-row${index % 2 === 1 ? " is-alt" : ""}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: TABLE_COLUMNS,
                    gap: 10,
                    padding: "13px 12px",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 800, color: accent, fontFamily: "var(--font)", display: "flex", alignItems: "center", gap: 6 }}>
                    {cohort.label}
                    {cohort.isMcf && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--emuted)", padding: "1px 6px", borderRadius: 999, border: "1px solid var(--eborder)" }}>
                        MCF
                      </span>
                    )}
                  </span>
                  <span style={{ textAlign: "center" }}>
                    <span className="cs-year-pill" style={{ fontSize: 13, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                      {dash(cohort.cohortYear)}
                    </span>
                  </span>
                  <span className={cellClass(cohort.startedCount)} style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                    {dash(cohort.startedCount)}
                  </span>
                  <span className={cellClass(cohort.graduatedCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                    {dash(cohort.graduatedCount)}
                  </span>
                  <span className={cellClass(cohort.maleCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                    {dash(cohort.maleCount)}
                  </span>
                  <span className={cellClass(cohort.femaleCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                    {dash(cohort.femaleCount)}
                  </span>
                  <span className={cellClass(cohort.pwdCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                    {dash(cohort.pwdCount)}
                  </span>
                  <span className={cellClass(cohort.idpCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                    {dash(cohort.idpCount)}
                  </span>
                  <span className={cellClass(cohort.scholarCount)} style={{ fontSize: 14, color: "var(--ewhite)", fontFamily: "var(--font)", textAlign: "center" }}>
                    {dash(cohort.scholarCount)}
                  </span>
                  <span style={{ textAlign: "center" }}>
                    <span className={`cs-attrition-pill${cohort.attritionRatePercent == null ? " is-empty" : ""}`} style={{ fontSize: 12, fontFamily: "var(--font)" }}>
                      {pct(cohort.attritionRatePercent)}
                    </span>
                  </span>
                  <span style={{ display: "flex", justifyContent: "center" }}>
                    <RowActionsMenu
                      open={actionMenuId === (cohort.id ?? cohort.label)}
                      onOpenChange={(open) => setActionMenuId(open ? (cohort.id ?? cohort.label) : null)}
                      items={[
                        { label: "View", icon: <IconEye size={15} />, onSelect: () => setViewingCohort(cohort) },
                        ...(!readOnly
                          ? [{ label: "Edit", icon: <IconPencil size={15} />, onSelect: () => openEdit(cohort) }]
                          : []),
                      ]}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SlidePanel
        open={Boolean(viewingCohort)}
        onClose={() => setViewingCohort(null)}
        title={viewingCohort?.label ?? ""}
        description={`${hubName} · cohort stats`}
        footer={
          !readOnly && viewingCohort ? (
            <div className="epl-slide-actions">
              <button type="button" className="rm-ghost" onClick={() => setViewingCohort(null)}>
                Close
              </button>
              <button type="button" className="rm-primary" onClick={() => openEdit(viewingCohort)}>
                <IconPencil size={15} /> Edit stats
              </button>
            </div>
          ) : undefined
        }
        width={680}
      >
        {viewingCohort && (
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className={viewingCohort.status === "in_progress" ? "nm-status-pill is-active" : "nm-status-pill is-alumni"}>
                {viewingCohort.statusLabel}
              </span>
              <span className="nm-status-pill is-inactive">Cohort year {dash(viewingCohort.cohortYear)}</span>
              {viewingCohort.isMcf && <span className="nm-status-pill is-inactive">Mastercard Foundation funded</span>}
            </div>

            <ViewSection title="Recruitment">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatTile icon={<IconUsersGroup size={18} />} label="Total recruited" value={dash(viewingCohort.startedCount)} accent={accent} />
                <StatTile icon={<IconSchool size={18} />} label="Graduated" value={dash(viewingCohort.graduatedCount)} accent="#3B8BEB" />
                <StatTile icon={<IconTarget size={18} />} label="To be recruited" value={dash(viewingCohort.toBeRecruitedCount)} accent="#2EC27E" />
              </div>
            </ViewSection>

            <ViewSection title="Demographics">
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatTile icon={<IconUsersGroup size={18} />} label="Male" value={dash(viewingCohort.maleCount)} accent={accent} />
                <StatTile icon={<IconUsersGroup size={18} />} label="Female" value={dash(viewingCohort.femaleCount)} accent="#9B59B6" />
                <StatTile icon={<IconAccessible size={18} />} label="PWDs" value={dash(viewingCohort.pwdCount)} accent="#3B8BEB" />
                <StatTile icon={<IconHome2 size={18} />} label="IDPs" value={dash(viewingCohort.idpCount)} accent="#E8A020" />
                <StatTile icon={<IconAward size={18} />} label="Foundation Scholars" value={dash(viewingCohort.scholarCount)} accent="#2EC27E" />
              </div>
            </ViewSection>

            <ViewSection title="Attrition">
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    border: "3px solid #E8A020",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconTrendingDown size={16} color="#E8A020" />
                  <span style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                    {pct(viewingCohort.attritionRatePercent)}
                  </span>
                  <span style={{ fontSize: 9, color: "var(--emuted)", fontFamily: "var(--font)" }}>overall</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <AttritionChip label="Male" value={pct(viewingCohort.attritionMale)} />
                  <AttritionChip label="Female" value={pct(viewingCohort.attritionFemale)} />
                  <AttritionChip label="PWDs" value={pct(viewingCohort.attritionPwd)} />
                  <AttritionChip label="IDPs" value={pct(viewingCohort.attritionIdp)} />
                </div>
              </div>
            </ViewSection>
          </div>
        )}
      </SlidePanel>

      {!readOnly && (
        <SlidePanel
          open={panelOpen}
          onClose={closePanel}
          title={editingId ? "Edit cohort stats" : "Add cohort stats"}
          description={`${hubName} · country stats`}
          footer={footer}
          width={560}
        >
          <form id="country-stats-form" onSubmit={handleSubmit} className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconChartBar size={16} /> Identity
              </div>
              <div className="epl-slide-field">
                <span>Cohort label</span>
                <input
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g. Cohort 7"
                  required
                  disabled={Boolean(editingId)}
                />
              </div>
              {editingId && (
                <p className="rm-panel-hint" style={{ margin: 0 }}>
                  Rename or retime this cohort under Cohorts — this panel only edits its stats.
                </p>
              )}
              <div className="rm-panel-row">
                <div className="epl-slide-field">
                  <span>Cohort year</span>
                  <SlideSelect
                    value={form.cohortYear}
                    onChange={(cohortYear) => setForm((prev) => ({ ...prev, cohortYear }))}
                    options={[{ value: "", label: "None" }, ...COHORT_YEARS]}
                    placeholder="Optional"
                  />
                </div>
                <div className="epl-slide-field">
                  <span>Status</span>
                  <SlideSelect
                    value={form.status}
                    onChange={(status) => setForm((prev) => ({ ...prev, status: status as StatsForm["status"] }))}
                    options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                  />
                </div>
              </div>
              <SlideToggle
                checked={form.isMcf}
                onChange={(isMcf) => setForm((prev) => ({ ...prev, isMcf }))}
                label="Mastercard Foundation funded"
                description="Included in the MCF-funded slice of this hub's stats"
              />
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">Recruitment</div>
              <div className="rm-panel-row">
                <div className="epl-slide-field">
                  <span>Total recruited</span>
                  <input
                    type="number"
                    min={0}
                    value={form.startedCount}
                    onChange={(e) => setForm((prev) => ({ ...prev, startedCount: e.target.value }))}
                  />
                </div>
                <div className="epl-slide-field">
                  <span>Graduated</span>
                  <input
                    type="number"
                    min={0}
                    value={form.graduatedCount}
                    onChange={(e) => setForm((prev) => ({ ...prev, graduatedCount: e.target.value }))}
                  />
                </div>
              </div>
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
              <div className="rm-panel-section-head">Demographics</div>
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
          </form>
        </SlidePanel>
      )}
    </div>
  );
}
