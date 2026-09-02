"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconUpload,
  IconDownload,
  IconSearch,
  IconLoader2,
  IconFileSpreadsheet,
  IconPlus,
  IconCheck,
  IconUser,
  IconBriefcase,
  IconMapPin,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { ProgramSelect } from "@/components/epl/program-select";
import { queryClient, trpc } from "@/utils/trpc";
import type { CohortTimelineItem } from "@/components/epl/cohorts-timeline";

const GENDERS = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Other", label: "Other" },
] as const;

type MemberForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  program: string;
  institution: string;
  roleTitle: string;
  city: string;
  country: string;
};

const EMPTY_FORM: MemberForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "",
  program: "",
  institution: "",
  roleTitle: "",
  city: "",
  country: "",
};

type Props = {
  tenantId: string;
  cohort: CohortTimelineItem;
  accent: string;
  canManage?: boolean;
  fullPage?: boolean;
};

export function CohortMembersList({ tenantId, cohort, accent, canManage = true, fullPage = false }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const isCompletedCohort = cohort.status === "completed";

  const membersQuery = useQuery({
    ...trpc.cohorts.members.queryOptions({
      tenantId,
      cohortId: cohort.id!,
      search: search.trim() || undefined,
    }),
    enabled: Boolean(cohort.id),
  });

  const invalidate = useCallback(async () => {
    if (!cohort.id) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.cohorts.members.queryKey({ tenantId, cohortId: cohort.id }),
      }),
      queryClient.invalidateQueries({ queryKey: trpc.cohorts.get.queryKey({ tenantId, cohortId: cohort.id }) }),
      queryClient.invalidateQueries({ queryKey: trpc.cohorts.list.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.cohorts.aggregates.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.fellows.list.queryKey({ tenantId }) }),
    ]);
  }, [tenantId, cohort.id]);

  const createMutation = useMutation(
    trpc.cohorts.createMember.mutationOptions({
      onSuccess: async () => {
        toast.success("Alumni member added");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const importMutation = useMutation(
    trpc.cohorts.importMembers.mutationOptions({
      onSuccess: async (result) => {
        const errorCount = result.errors.length;
        if (errorCount > 0) {
          toast.warning(`Imported ${result.created} new, ${result.updated} updated — ${errorCount} row(s) skipped`);
        } else {
          toast.success(`Imported ${result.created} new, ${result.updated} updated`);
        }
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function closePanel() {
    setPanelOpen(false);
    setForm(EMPTY_FORM);
  }

  function openPanel() {
    setForm({ ...EMPTY_FORM });
    setPanelOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cohort.id) return;

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    if (!firstName || !lastName || !email) {
      toast.error("First name, last name, and email are required");
      return;
    }

    const hasPartialPlacement = [form.institution, form.roleTitle, form.city, form.country].some((v) => v.trim());
    const hasFullPlacement = [form.institution, form.roleTitle, form.city, form.country].every((v) => v.trim());
    if (hasPartialPlacement && !hasFullPlacement) {
      toast.error("Fill in all retention fields (institution, role, city, country) or leave them blank");
      return;
    }

    if (!form.program.trim()) {
      toast.error("Select a program for this hub");
      return;
    }

    createMutation.mutate({
      tenantId,
      cohortId: cohort.id,
      firstName,
      lastName,
      email,
      phone: form.phone.trim() || undefined,
      gender: form.gender || undefined,
      program: form.program,
      institution: form.institution.trim() || undefined,
      roleTitle: form.roleTitle.trim() || undefined,
      city: form.city.trim() || undefined,
      country: form.country.trim() || undefined,
    });
  }

  async function handleExport() {
    if (!cohort.id) return;
    try {
      const result = await queryClient.fetchQuery(
        trpc.cohorts.exportMembers.queryOptions({ tenantId, cohortId: cohort.id }),
      );
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  function downloadTemplate() {
    const headers = "firstName,lastName,email,program,phone,gender,institution,roleTitle,city,country";
    const sample =
      "Ama,Kone,ama@example.org,Public Service Fellowship,+225000000,Female,Ministry of Education,Policy Analyst,Abidjan,Côte d'Ivoire";
    const blob = new Blob([`${headers}\n${sample}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cohort.label.replace(/\s+/g, "-").toLowerCase()}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !cohort.id) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text.trim()) {
        toast.error("CSV file is empty");
        return;
      }
      importMutation.mutate({ tenantId, cohortId: cohort.id!, csv: text });
    };
    reader.readAsText(file);
  }

  const members = membersQuery.data?.items ?? [];
  const canImport = membersQuery.data?.canImport ?? (isCompletedCohort && cohort.cohortYear != null);
  const canAddMember = membersQuery.data?.canAddMember ?? canImport;
  const isPending = createMutation.isPending || importMutation.isPending;

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={isPending}>
        Cancel
      </button>
      <button type="submit" form="cohort-member-form" className="rm-primary" disabled={isPending}>
        {isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        Add alumni
      </button>
    </div>
  );

  return (
    <div className="gc" style={{ padding: fullPage ? "20px 22px" : "16px 20px" }}>
      {canImport && canManage && (
        <div className="nm-toolbar gc" style={{ marginBottom: 14 }}>
          {canAddMember && (
            <button type="button" className="rm-primary" onClick={openPanel}>
              <IconPlus size={14} /> Add alumni
            </button>
          )}
          <button type="button" className="nm-row-action" onClick={downloadTemplate}>
            <IconFileSpreadsheet size={14} /> Template
          </button>
          <button type="button" className="nm-row-action" onClick={handleExport} disabled={members.length === 0}>
            <IconDownload size={14} /> Export
          </button>
          <button
            type="button"
            className="nm-row-action"
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? <IconLoader2 size={14} className="animate-spin" /> : <IconUpload size={14} />}
            Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportFile} />
        </div>
      )}

      {!isCompletedCohort && canManage && (
        <div
          className="rm-state"
          style={{ fontSize: 13, marginBottom: 14, textAlign: "left", padding: "12px 14px" }}
        >
          This cohort is still in progress — active fellows are managed in <strong>Network</strong>.
          Mark the cohort completed to add alumni records here.
        </div>
      )}

      {cohort.cohortYear != null && (
        <div className="nm-filter-bar" style={{ marginBottom: 14 }}>
          <div className="rm-search" style={{ flex: 1, minWidth: 200 }}>
            <IconSearch size={16} />
            <input placeholder="Search alumni…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      {membersQuery.isLoading ? (
        <div className="rm-state">Loading members…</div>
      ) : cohort.cohortYear == null ? (
        <div className="rm-state" style={{ fontSize: 13 }}>
          Set a cohort year on this record (Edit on the cohorts page), then add alumni members.
        </div>
      ) : members.length === 0 ? (
        <div className="rm-state" style={{ fontSize: 13 }}>
          {isCompletedCohort
            ? "No alumni yet — use Add alumni or import a CSV with names, program, and optional retention details."
            : "No member records yet — fellows in this cohort are managed through Network while the cohort is in progress."}
        </div>
      ) : (
        <div style={{ overflow: "auto", borderRadius: 10, border: "1px solid var(--eborder)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font)" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--emuted)", background: "rgba(255,255,255,0.03)" }}>
                <th style={{ padding: "10px 12px" }}>Name</th>
                <th style={{ padding: "10px 12px" }}>Email</th>
                <th style={{ padding: "10px 12px" }}>Program</th>
                <th style={{ padding: "10px 12px" }}>Retention</th>
                <th style={{ padding: "10px 12px" }}>Phone</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} style={{ borderTop: "1px solid var(--eborder)", color: "var(--ewhite)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                    {member.firstName} {member.lastName}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)" }}>{member.email}</td>
                  <td style={{ padding: "10px 12px" }}>{member.program}</td>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)" }}>{member.placementLabel ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)" }}>{member.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title="Add alumni member"
        description={`${cohort.label}${cohort.cohortYear != null ? ` · cohort year ${cohort.cohortYear}` : ""} — historic cohort roster`}
        footer={footer}
        width={540}
      >
        <form id="cohort-member-form" onSubmit={handleSubmit} className="rm-panel-form">
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
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
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
              <span>Gender</span>
              <SlideSelect
                value={form.gender}
                onChange={(value) => setForm((p) => ({ ...p, gender: value }))}
                options={GENDERS.map((g) => ({ value: g.value, label: g.label }))}
                placeholder="Optional"
              />
            </div>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconBriefcase size={16} /> Program
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
            <p className="rm-panel-hint">Only programs run by this country hub are listed. Saved as alumni.</p>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconMapPin size={16} /> Retention
            </div>
            <div className="epl-slide-field">
              <span>Institution / organisation</span>
              <input
                value={form.institution}
                onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="epl-slide-field">
              <span>Role</span>
              <input
                value={form.roleTitle}
                onChange={(e) => setForm((p) => ({ ...p, roleTitle: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>City</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="epl-slide-field">
                <span>Country</span>
                <input
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            <p className="rm-panel-hint">If you add retention details, fill in institution, role, city, and country.</p>
          </section>
        </form>
      </SlidePanel>
    </div>
  );
}
