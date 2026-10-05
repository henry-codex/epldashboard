"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconChartBar, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { trpc } from "@/utils/trpc";

const NUMBER_FIELDS = [
  "startedCount",
  "graduatedCount",
  "toBeRecruitedCount",
  "maleCount",
  "femaleCount",
  "pwdCount",
  "idpCount",
  "scholarCount",
  "attritionRatePercent",
  "attritionMale",
  "attritionFemale",
  "attritionPwd",
  "attritionIdp",
] as const;

type NumberField = (typeof NUMBER_FIELDS)[number];
type McfValues = Record<NumberField, number | null>;
export type McfStatsRow = McfValues & { id: string; cohortId: string; label: string };
type McfForm = Record<NumberField, string>;

const SECTIONS: { title: string; hint?: string; fields: { key: NumberField; label: string; percent?: boolean }[] }[] = [
  {
    title: "Recruitment",
    hint: "MCF target is how many fellows the Foundation asked you to recruit for this cohort.",
    fields: [
      { key: "toBeRecruitedCount", label: "MCF target" },
      { key: "startedCount", label: "MCF recruited" },
      { key: "graduatedCount", label: "Graduated" },
    ],
  },
  {
    title: "Demographics",
    fields: [
      { key: "maleCount", label: "Male" },
      { key: "femaleCount", label: "Female" },
      { key: "pwdCount", label: "PWDs" },
      { key: "idpCount", label: "IDPs" },
      { key: "scholarCount", label: "Foundation Scholars" },
    ],
  },
  {
    title: "Attrition",
    hint: "Percent (0–100) who left this cohort, overall and by group.",
    fields: [
      { key: "attritionRatePercent", label: "Overall rate (%)", percent: true },
      { key: "attritionMale", label: "Male (%)", percent: true },
      { key: "attritionFemale", label: "Female (%)", percent: true },
      { key: "attritionPwd", label: "PWDs (%)", percent: true },
      { key: "attritionIdp", label: "IDPs (%)", percent: true },
    ],
  },
];

function toForm(row: McfStatsRow | null): McfForm {
  return Object.fromEntries(
    NUMBER_FIELDS.map((key) => [key, row?.[key] != null ? String(row[key]) : ""]),
  ) as McfForm;
}

function toValues(form: McfForm): McfValues {
  return Object.fromEntries(
    NUMBER_FIELDS.map((key) => {
      const parsed = Number.parseInt(form[key].trim(), 10);
      return [key, Number.isNaN(parsed) ? null : parsed];
    }),
  ) as McfValues;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  tenantId: string;
  hubName: string;
  /** Hub cohorts that can take MCF figures. */
  cohorts: { id: string; label: string; cohortYear: number | null }[];
  /** Cohorts that already have an MCF row — excluded when adding. */
  takenCohortIds: Set<string>;
  /** Row being edited; null when adding. */
  editing: McfStatsRow | null;
};

export function McfStatsPanel({ open, onClose, onSaved, tenantId, hubName, cohorts, takenCohortIds, editing }: Props) {
  const [cohortId, setCohortId] = useState("");
  const [form, setForm] = useState<McfForm>(() => toForm(null));

  useEffect(() => {
    if (!open) return;
    setCohortId(editing?.cohortId ?? "");
    setForm(toForm(editing));
  }, [open, editing]);

  const saveMutation = useMutation(
    trpc.cohorts.saveMcfStats.mutationOptions({
      onSuccess: async () => {
        toast.success(editing ? "MCF stats updated" : "MCF stats added");
        await onSaved();
        onClose();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const options = cohorts
    .filter((c) => c.id === editing?.cohortId || !takenCohortIds.has(c.id))
    .map((c) => ({ value: c.id, label: c.cohortYear != null ? `${c.label} · ${c.cohortYear}` : c.label }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cohortId) {
      toast.error("Choose the cohort these figures belong to");
      return;
    }
    saveMutation.mutate({ tenantId, cohortId, ...toValues(form) });
  }

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={onClose} disabled={saveMutation.isPending}>
        Cancel
      </button>
      <button type="submit" form="mcf-stats-form" className="rm-primary" disabled={saveMutation.isPending || !cohortId}>
        {saveMutation.isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editing ? "Save changes" : "Add MCF stats"}
      </button>
    </div>
  );

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={editing ? `Edit MCF stats · ${editing.label}` : "Add MCF stats"}
      description={`${hubName} · Mastercard Foundation figures`}
      footer={footer}
      width={560}
    >
      <form id="mcf-stats-form" onSubmit={handleSubmit} className="rm-panel-form">
        <section className="rm-panel-section">
          <div className="rm-panel-section-head">
            <IconChartBar size={16} /> Cohort
          </div>
          <div className="epl-slide-field">
            <span>Cohort</span>
            {editing ? (
              <input value={options.find((o) => o.value === editing.cohortId)?.label ?? editing.label} disabled />
            ) : (
              <SlideSelect
                value={cohortId}
                onChange={setCohortId}
                options={options}
                placeholder={options.length ? "Choose a cohort" : "No cohorts available"}
              />
            )}
          </div>
          <p className="rm-panel-hint" style={{ margin: 0 }}>
            {editing
              ? "These are the Foundation's own figures for this cohort; the hub-wide numbers stay under All Stats."
              : options.length
                ? "Only cohorts without MCF figures are listed. Add new cohorts under All Stats first."
                : "Every cohort already has MCF figures, or none exist yet. Add the cohort under All Stats first."}
          </p>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.title} className="rm-panel-section">
            <div className="rm-panel-section-head">{section.title}</div>
            {section.hint && (
              <p className="rm-panel-hint" style={{ margin: "0 0 12px" }}>
                {section.hint}
              </p>
            )}
            <div className="rm-panel-row">
              {section.fields.map((field) => (
                <div key={field.key} className="epl-slide-field">
                  <span>{field.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={field.percent ? 100 : undefined}
                    value={form[field.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </form>
    </SlidePanel>
  );
}
