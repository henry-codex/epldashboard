"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconUserPlus,
  IconUpload,
  IconDownload,
  IconColumns,
  IconSearch,
  IconLoader2,
  IconPencil,
  IconTrash,
  IconCheck,
  IconUser,
  IconBriefcase,
  IconAdjustments,
  IconFileSpreadsheet,
  IconUserOff,
  IconArrowBackUp,
  IconMapPin,
  IconBuildingBank,
  IconEye,
  IconDotsVertical,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { SlideSelect } from "@/components/epl/slide-select";
import { ProgramSelect } from "@/components/epl/program-select";
import { SlideToggle } from "@/components/epl/slide-toggle";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { queryClient, trpc } from "@/utils/trpc";
import { useTheme } from "@/hooks/use-theme";

const PAGE_SIZE = 20;

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "alumni", label: "Alumni" },
  { value: "inactive", label: "Inactive" },
] as const;

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "boolean", label: "Yes / No" },
] as const;

const GENDERS = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Other", label: "Other" },
] as const;

const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
] as const;

type FellowRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  gender: string | null;
  cohortYear: number;
  program: string;
  status: "active" | "alumni" | "inactive";
  isMcf: boolean;
  customFields: Record<string, unknown>;
  externalId: string | null;
  serviceOrganization?: string | null;
  serviceRole?: string | null;
  serviceCity?: string | null;
  serviceRegion?: string | null;
  servicePartnerId?: string | null;
};

type FieldDef = {
  id: string;
  key: string;
  label: string;
  fieldType: "text" | "number" | "date" | "select" | "boolean";
  options: string[];
  required: boolean;
  sortOrder: number;
};

type PlacementForm = {
  enabled: boolean;
  institution: string;
  department: string;
  roleTitle: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
};

type FellowForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  gender: string;
  hasDisability: boolean;
  cohortYear: string;
  program: string;
  status: "active" | "alumni" | "inactive";
  isMcf: boolean;
  externalId: string;
  serviceOrganization: string;
  serviceRole: string;
  serviceCity: string;
  serviceRegion: string;
  servicePartnerId: string;
  customFields: Record<string, string>;
};

type FieldForm = {
  id?: string;
  label: string;
  key: string;
  fieldType: "text" | "number" | "date" | "select" | "boolean";
  options: string;
  required: boolean;
  sortOrder: string;
};

const EMPTY_FELLOW: FellowForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  nationality: "",
  gender: "",
  hasDisability: false,
  cohortYear: "",
  program: "",
  status: "active",
  isMcf: false,
  externalId: "",
  serviceOrganization: "",
  serviceRole: "",
  serviceCity: "",
  serviceRegion: "",
  servicePartnerId: "",
  customFields: {},
};

const EMPTY_PLACEMENT: PlacementForm = {
  enabled: false,
  institution: "",
  department: "",
  roleTitle: "",
  country: "",
  city: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
};

const EMPTY_FIELD: FieldForm = {
  label: "",
  key: "",
  fieldType: "text",
  options: "",
  required: false,
  sortOrder: "0",
};

type Props = {
  tenantId: string;
  hubName: string;
  accent: string;
  readOnly?: boolean;
};

type ActionMenuItem = {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};

function FellowActionsMenu({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ActionMenuItem[];
}) {
  const { theme } = useTheme();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 196;
    const estimatedHeight = items.length * 40 + 16;
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    const top = openUp
      ? Math.max(8, rect.top - 6 - estimatedHeight)
      : rect.bottom + 6;
    setPos({ top, left });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    // Defer binding so the same click that opens the menu does not close it.
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("keydown", onKey);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="nm-actions">
      <button
        ref={triggerRef}
        type="button"
        className={`nm-actions-trigger${open ? " is-open" : ""}`}
        aria-label="Actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(!open);
        }}
      >
        <IconDotsVertical size={16} />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              className={`nm-actions-menu${theme === "light" ? " is-light" : ""}`}
              role="menu"
              style={{ top: pos.top, left: pos.left }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`nm-actions-item${item.danger ? " is-danger" : ""}`}
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (item.disabled) return;
                    onOpenChange(false);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function NetworkManager({ tenantId, hubName, accent, readOnly = false }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "alumni" | "inactive">("active");
  const [yearFilter, setYearFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"name_asc" | "name_desc" | "newest">("name_asc");
  const [page, setPage] = useState(1);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [fellowPanel, setFellowPanel] = useState(false);
  const [viewPanel, setViewPanel] = useState(false);
  const [viewingFellow, setViewingFellow] = useState<FellowRow | null>(null);
  const [fieldsPanel, setFieldsPanel] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fellowForm, setFellowForm] = useState<FellowForm>(EMPTY_FELLOW);
  const [placementForm, setPlacementForm] = useState<PlacementForm>(EMPTY_PLACEMENT);
  const [hadPlacement, setHadPlacement] = useState(false);
  const [fieldForm, setFieldForm] = useState<FieldForm>(EMPTY_FIELD);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPage(1);
    setActionMenuId(null);
  }, [search, statusFilter, yearFilter, sortOrder]);

  useEffect(() => {
    setActionMenuId(null);
  }, [page]);

  const listQuery = useQuery(
    trpc.fellows.list.queryOptions({
      tenantId,
      search: search.trim() || undefined,
      status: statusFilter || undefined,
      cohortYear: yearFilter ? Number.parseInt(yearFilter, 10) : undefined,
      sort: sortOrder,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  );

  const fieldsQuery = useQuery(trpc.fellows.fields.list.queryOptions({ tenantId }));
  const programsQuery = useQuery(trpc.programs.list.queryOptions({ tenantId }));
  const cohortsQuery = useQuery(trpc.cohorts.list.queryOptions({ tenantId }));
  const partnersQuery = useQuery(
    trpc.partners.list.queryOptions({ tenantId, status: "active", kind: "placement" }),
  );
  const placementQuery = useQuery({
    ...trpc.fellows.placement.getCurrent.queryOptions({
      tenantId,
      fellowId: editingId ?? "00000000-0000-0000-0000-000000000000",
    }),
    enabled: Boolean(editingId) && fellowPanel,
  });

  const hubCohorts = useMemo(
    () => (cohortsQuery.data?.items ?? []).filter((c) => !c.isVirtual && c.id && c.cohortYear != null),
    [cohortsQuery.data?.items],
  );

  const partnerOptions = useMemo(
    () =>
      (partnersQuery.data?.items ?? []).map((p) => ({
        value: p.id,
        label: p.region ? `${p.name} · ${p.region}` : p.name,
      })),
    [partnersQuery.data?.items],
  );

  const cohortOptions = useMemo(
    () =>
      hubCohorts.map((c) => ({
        value: String(c.cohortYear),
        label: `${c.label}${c.cohortYear != null ? ` · ${c.cohortYear}` : ""}${c.inProgress ? " (in progress)" : ""}`,
      })),
    [hubCohorts],
  );

  const yearFilterOptions = useMemo(() => {
    const years = new Set<number>();
    for (const c of hubCohorts) {
      if (c.cohortYear != null) years.add(c.cohortYear);
    }
    for (const row of listQuery.data?.items ?? []) {
      if (row.cohortYear) years.add(row.cohortYear);
    }
    return Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => ({ value: String(year), label: String(year) }));
  }, [hubCohorts, listQuery.data?.items]);

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.fellows.list.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.fellows.aggregates.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.partners.list.queryKey({ tenantId, kind: "placement" }) }),
      queryClient.invalidateQueries({ queryKey: trpc.partners.aggregates.queryKey({ tenantId, kind: "placement" }) }),
      queryClient.invalidateQueries({
        queryKey: trpc.fellows.placement.getCurrent.queryKey({
          tenantId,
          fellowId: editingId ?? "00000000-0000-0000-0000-000000000000",
        }),
      }),
    ]);
  }, [tenantId, editingId]);

  const createMutation = useMutation(
    trpc.fellows.create.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.fellows.update.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const upsertPlacementMutation = useMutation(
    trpc.fellows.placement.upsertCurrent.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const clearPlacementMutation = useMutation(
    trpc.fellows.placement.clearCurrent.mutationOptions({
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.fellows.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Fellow removed");
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const transitionMutation = useMutation(
    trpc.fellows.transitionStatus.mutationOptions({
      onSuccess: async (row) => {
        toast.success(`Marked as ${row.status}`);
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const importMutation = useMutation(
    trpc.fellows.importCsv.mutationOptions({
      onSuccess: async (result) => {
        toast.success(`Import complete — ${result.created} created, ${result.updated} updated`);
        if (result.errors.length) {
          toast.error(`${result.errors.length} row(s) had errors`);
        }
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const exportQuery = useQuery({
    ...trpc.fellows.exportCsv.queryOptions({ tenantId }),
    enabled: false,
  });

  const fieldUpsertMutation = useMutation(
    trpc.fellows.fields.upsert.mutationOptions({
      onSuccess: async () => {
        toast.success("Field saved");
        await queryClient.invalidateQueries({ queryKey: trpc.fellows.fields.list.queryKey({ tenantId }) });
        setFieldForm(EMPTY_FIELD);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const fieldDeleteMutation = useMutation(
    trpc.fellows.fields.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Field removed");
        await queryClient.invalidateQueries({ queryKey: trpc.fellows.fields.list.queryKey({ tenantId }) });
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const fieldDefs = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);
  const fellows = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const totalFellows = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFellows / PAGE_SIZE));
  const rangeStart = totalFellows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalFellows);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!editingId || !fellowPanel) return;
    const row = placementQuery.data;
    if (placementQuery.isLoading) return;
    if (row) {
      setHadPlacement(true);
      setPlacementForm({
        enabled: true,
        institution: row.institution,
        department: row.department ?? "",
        roleTitle: row.roleTitle,
        country: row.country,
        city: row.city,
        startDate: row.startDate,
        endDate: row.endDate ?? "",
      });
    } else if (!placementQuery.isFetching) {
      setHadPlacement(false);
      setPlacementForm((prev) => (prev.enabled ? prev : EMPTY_PLACEMENT));
    }
  }, [editingId, fellowPanel, placementQuery.data, placementQuery.isLoading, placementQuery.isFetching]);

  function closeFellowPanel() {
    setFellowPanel(false);
    setEditingId(null);
    setFellowForm(EMPTY_FELLOW);
    setPlacementForm(EMPTY_PLACEMENT);
    setHadPlacement(false);
  }

  function closeViewPanel() {
    setViewPanel(false);
    setViewingFellow(null);
  }

  function openViewFellow(row: FellowRow) {
    setActionMenuId(null);
    setViewingFellow(row);
    setViewPanel(true);
  }

  function openCreateFellow() {
    setActionMenuId(null);
    setEditingId(null);
    setFellowForm({ ...EMPTY_FELLOW, customFields: {} });
    setPlacementForm(EMPTY_PLACEMENT);
    setHadPlacement(false);
    setFellowPanel(true);
  }

  function openEditFellow(row: FellowRow) {
    setActionMenuId(null);
    const customFields: Record<string, string> = {};
    for (const def of fieldDefs) {
      const value = row.customFields[def.key];
      customFields[def.key] = value === undefined || value === null ? "" : String(value);
    }
    setEditingId(row.id);
    setFellowForm({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone ?? "",
      nationality: row.nationality ?? "",
      gender: row.gender ?? "",
      hasDisability: row.customFields.has_disability === true || row.customFields.has_disability === "true",
      cohortYear: String(row.cohortYear),
      program: row.program,
      status: row.status,
      isMcf: row.isMcf,
      externalId: row.externalId ?? "",
      serviceOrganization: row.serviceOrganization ?? "",
      serviceRole: row.serviceRole ?? "",
      serviceCity: row.serviceCity ?? "",
      serviceRegion: row.serviceRegion ?? "",
      servicePartnerId: row.servicePartnerId ?? "",
      customFields,
    });
    setPlacementForm(EMPTY_PLACEMENT);
    setHadPlacement(false);
    setFellowPanel(true);
  }

  async function savePlacementForFellow(fellowId: string) {
    if (placementForm.enabled) {
      if (
        !placementForm.institution.trim() ||
        !placementForm.roleTitle.trim() ||
        !placementForm.city.trim() ||
        !placementForm.country.trim() ||
        !placementForm.startDate
      ) {
        throw new Error("Retention needs institution, role, city, country, and start date");
      }
      await upsertPlacementMutation.mutateAsync({
        tenantId,
        fellowId,
        institution: placementForm.institution.trim(),
        department: placementForm.department.trim() || undefined,
        roleTitle: placementForm.roleTitle.trim(),
        country: placementForm.country.trim(),
        city: placementForm.city.trim(),
        startDate: placementForm.startDate,
        endDate: placementForm.endDate.trim() || null,
      });
      return;
    }

    if (hadPlacement) {
      await clearPlacementMutation.mutateAsync({ tenantId, fellowId });
    }
  }

  async function handleFellowSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cohortYear = Number.parseInt(fellowForm.cohortYear, 10);
    if (!fellowForm.firstName.trim() || !fellowForm.lastName.trim() || !fellowForm.email.trim()) {
      toast.error("First name, last name, and email are required");
      return;
    }
    if (Number.isNaN(cohortYear)) {
      toast.error("Cohort year must be a number");
      return;
    }
    if (!fellowForm.program.trim()) {
      toast.error("Select a program for this hub");
      return;
    }
    if (!fellowForm.cohortYear.trim()) {
      toast.error("Select a cohort from the list created under Cohorts");
      return;
    }
    const linkedCohort = hubCohorts.find((c) => String(c.cohortYear) === fellowForm.cohortYear);
    if (!linkedCohort) {
      toast.error("Select a cohort from the list created under Cohorts");
      return;
    }

    const payload = {
      tenantId,
      firstName: fellowForm.firstName.trim(),
      lastName: fellowForm.lastName.trim(),
      email: fellowForm.email.trim(),
      phone: fellowForm.phone.trim() || undefined,
      nationality: fellowForm.nationality.trim() || undefined,
      gender: fellowForm.gender.trim() || undefined,
      hasDisability: fellowForm.hasDisability,
      serviceOrganization: fellowForm.serviceOrganization.trim() || null,
      serviceRole: fellowForm.serviceRole.trim() || null,
      serviceCity: fellowForm.serviceCity.trim() || null,
      serviceRegion: fellowForm.serviceRegion.trim() || null,
      servicePartnerId: fellowForm.servicePartnerId.trim() || null,
      cohortYear,
      program: fellowForm.program,
      isMcf: fellowForm.isMcf,
      externalId: fellowForm.externalId.trim() || undefined,
      customFields: fellowForm.customFields,
    };

    try {
      let fellowId = editingId;
      if (editingId) {
        await updateMutation.mutateAsync({ ...payload, id: editingId });
      } else {
        const created = await createMutation.mutateAsync({ ...payload, status: "active" });
        fellowId = created.id;
      }

      if (fellowId) {
        await savePlacementForFellow(fellowId);
      }

      toast.success(editingId ? "Fellow updated" : "Fellow added");
      await invalidate();
      closeFellowPanel();
    } catch (err) {
      if (err instanceof Error && err.message.includes("Retention needs")) {
        toast.error(err.message);
      }
    }
  }

  function transitionFellow(row: FellowRow, status: FellowRow["status"]) {
    setActionMenuId(null);
    const label = status === "alumni" ? "alumni" : status === "inactive" ? "inactive" : "active";
    if (!window.confirm(`Mark ${row.firstName} ${row.lastName} as ${label}?`)) return;
    transitionMutation.mutate({ tenantId, id: row.id, status });
  }

  function statusPillClass(status: FellowRow["status"]) {
    if (status === "active") return "nm-status-pill is-active";
    if (status === "alumni") return "nm-status-pill is-alumni";
    return "nm-status-pill is-inactive";
  }

  async function handleExport() {
    try {
      const result = await exportQuery.refetch();
      const csv = result.data?.csv;
      const filename = result.data?.filename ?? "network-export.csv";
      if (!csv) {
        toast.error("Export failed");
        return;
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  function downloadTemplate() {
    const headers = [
      "firstName",
      "lastName",
      "email",
      "status",
      "cohortYear",
      "program",
      "phone",
      "nationality",
      "gender",
      "hasDisability",
      "isMcf",
      "externalId",
      ...fieldDefs.map((f) => f.key),
    ];
    const sampleProgram = programsQuery.data?.items[0]?.title ?? "Hub program name";
    const sample = [
      "Ama",
      "Kone",
      "ama.kone@example.org",
      "active",
      String(new Date().getFullYear()),
      sampleProgram,
      "",
      "CIV",
      "Female",
      "false",
      "false",
      "EXT-001",
      ...fieldDefs.map(() => ""),
    ];
    const csv = `${headers.join(",")}\n${sample.join(",")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `network-template-${tenantId.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      importMutation.mutate({ tenantId, csv: text });
    };
    reader.readAsText(file);
  }

  function handleFieldSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldForm.label.trim()) {
      toast.error("Field label is required");
      return;
    }
    fieldUpsertMutation.mutate({
      tenantId,
      id: fieldForm.id,
      label: fieldForm.label.trim(),
      key: fieldForm.key.trim() || undefined,
      fieldType: fieldForm.fieldType,
      options: fieldForm.options
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      required: fieldForm.required,
      sortOrder: Number.parseInt(fieldForm.sortOrder || "0", 10) || 0,
    });
  }

  const fellowPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    upsertPlacementMutation.isPending ||
    clearPlacementMutation.isPending;

  const fellowFooter = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closeFellowPanel} disabled={fellowPending}>
        Cancel
      </button>
      <button type="submit" form="fellow-form" className="rm-primary" disabled={fellowPending}>
        {fellowPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editingId ? "Save changes" : "Add fellow"}
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {!readOnly && (
        <div className="nm-toolbar gc">
          <button type="button" className="rm-primary" onClick={openCreateFellow}>
            <IconUserPlus size={16} /> Add fellow
          </button>
          <span className="nm-toolbar-divider" aria-hidden="true" />
          <div className="nm-toolbar-group">
            <button
              type="button"
              className="rm-ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconUpload size={16} />}
              Import CSV
            </button>
            <button type="button" className="rm-ghost" onClick={handleExport} disabled={exportQuery.isFetching}>
              {exportQuery.isFetching ? <IconLoader2 size={16} className="animate-spin" /> : <IconDownload size={16} />}
              Export CSV
            </button>
            <button type="button" className="rm-ghost" onClick={downloadTemplate}>
              <IconFileSpreadsheet size={16} /> Template
            </button>
            <button type="button" className="rm-ghost" onClick={() => setFieldsPanel(true)}>
              <IconColumns size={16} /> Fields
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportFile} />
        </div>
      )}

      {readOnly && (
        <div className="gc" style={{ padding: "12px 16px", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
          Read-only view — country managers add and update fellows for this hub.
        </div>
      )}

      <div className="nm-filter-bar">
        <div className="rm-search" style={{ flex: 1, minWidth: 220 }}>
          <IconSearch size={16} />
          <input
            placeholder="Search fellows…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="nm-status-filter">
          <SlideSelect
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
            options={STATUSES.map((status) => ({ value: status.value, label: status.label }))}
            placeholder="All statuses"
            allowEmpty
            emptyLabel="All statuses"
          />
        </div>
        <div className="nm-status-filter">
          <SlideSelect
            value={yearFilter}
            onChange={setYearFilter}
            options={yearFilterOptions}
            placeholder="All years"
            allowEmpty
            emptyLabel="All years"
          />
        </div>
        <div className="nm-status-filter">
          <SlideSelect
            value={sortOrder}
            onChange={(value) => setSortOrder(value as typeof sortOrder)}
            options={[
              { value: "name_asc", label: "Name A–Z" },
              { value: "name_desc", label: "Name Z–A" },
              { value: "newest", label: "Newest first" },
            ]}
            placeholder="Sort"
          />
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="rm-state">Loading roster…</div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : fellows.length === 0 ? (
        <CountrySectionEmpty
          title={statusFilter === "active" ? "No active fellows yet" : "No fellows match this filter"}
          description={
            statusFilter === "active"
              ? `Add active program fellows manually or import a CSV to start building ${hubName}'s network.`
              : "Try a different status filter or search term."
          }
          accent={accent}
        />
      ) : (
        <div className="gc" style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font)" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--emuted)", borderBottom: "1px solid var(--eborder)" }}>
                <th style={{ padding: "10px 12px", width: 48 }}>#</th>
                <th style={{ padding: "10px 12px" }}>Name</th>
                <th style={{ padding: "10px 12px" }}>Email</th>
                <th style={{ padding: "10px 12px" }}>Phone</th>
                <th style={{ padding: "10px 12px" }}>Status</th>
                <th style={{ padding: "10px 12px" }}>Cohort</th>
                <th style={{ padding: "10px 12px" }}>Program</th>
                <th style={{ padding: "10px 12px" }}>Gender</th>
                <th style={{ padding: "10px 12px" }}>MCF</th>
                {fieldDefs.slice(0, 2).map((f) => (
                  <th key={f.id} style={{ padding: "10px 12px" }}>{f.label}</th>
                ))}
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fellows.map((row, index) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--eborder)", color: "var(--ewhite)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)", fontVariantNumeric: "tabular-nums" }}>
                    {rangeStart + index}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.firstName} {row.lastName}</td>
                  <td style={{ padding: "10px 12px" }}>{row.email}</td>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)" }}>{row.phone ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className={statusPillClass(row.status)}>{row.status}</span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{row.cohortYear}</td>
                  <td style={{ padding: "10px 12px" }}>{row.program}</td>
                  <td style={{ padding: "10px 12px", color: "var(--emuted)" }}>{row.gender ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{row.isMcf ? "Yes" : "—"}</td>
                  {fieldDefs.slice(0, 2).map((f) => (
                    <td key={f.id} style={{ padding: "10px 12px" }}>{String(row.customFields[f.key] ?? "—")}</td>
                  ))}
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <FellowActionsMenu
                      open={actionMenuId === row.id}
                      onOpenChange={(open) => setActionMenuId(open ? row.id : null)}
                      items={(() => {
                        const items: ActionMenuItem[] = [
                          {
                            label: "View",
                            icon: <IconEye size={14} />,
                            onSelect: () => openViewFellow(row),
                          },
                        ];
                        if (!readOnly) {
                          items.push({
                            label: "Edit",
                            icon: <IconPencil size={14} />,
                            onSelect: () => openEditFellow(row),
                          });
                          if (row.status === "active") {
                            items.push({
                              label: "Set inactive",
                              icon: <IconUserOff size={14} />,
                              onSelect: () => transitionFellow(row, "inactive"),
                              disabled: transitionMutation.isPending,
                            });
                          } else {
                            items.push({
                              label: "Reactivate",
                              icon: <IconArrowBackUp size={14} />,
                              onSelect: () => transitionFellow(row, "active"),
                              disabled: transitionMutation.isPending,
                            });
                          }
                          items.push({
                            label: "Delete",
                            icon: <IconTrash size={14} />,
                            danger: true,
                            onSelect: () => {
                              if (window.confirm(`Remove ${row.firstName} ${row.lastName}?`)) {
                                deleteMutation.mutate({ tenantId, id: row.id });
                              }
                            },
                          });
                        }
                        return items;
                      })()}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && totalFellows > 0 && (
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
            {" "}of {totalFellows}
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
        open={viewPanel}
        onClose={closeViewPanel}
        title={viewingFellow ? `${viewingFellow.firstName} ${viewingFellow.lastName}` : "Fellow"}
        description={`${hubName} — profile overview`}
        footer={
          <div className="epl-slide-actions">
            <button type="button" className="rm-ghost" onClick={closeViewPanel}>
              Close
            </button>
            {!readOnly && viewingFellow && (
              <button
                type="button"
                className="rm-primary"
                onClick={() => {
                  const row = viewingFellow;
                  closeViewPanel();
                  openEditFellow(row);
                }}
              >
                <IconPencil size={15} /> Edit
              </button>
            )}
          </div>
        }
        width={560}
      >
        {viewingFellow && (
          <div className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconUser size={16} /> Profile
              </div>
              <div className="nm-view-grid">
                <div>
                  <span className="nm-view-label">Status</span>
                  <span className={statusPillClass(viewingFellow.status)}>{viewingFellow.status}</span>
                </div>
                <div>
                  <span className="nm-view-label">Email</span>
                  <p className="nm-view-value">{viewingFellow.email}</p>
                </div>
                <div>
                  <span className="nm-view-label">Phone</span>
                  <p className="nm-view-value">{viewingFellow.phone ?? "—"}</p>
                </div>
                <div>
                  <span className="nm-view-label">Gender</span>
                  <p className="nm-view-value">{viewingFellow.gender ?? "—"}</p>
                </div>
                <div>
                  <span className="nm-view-label">MCF</span>
                  <p className="nm-view-value">{viewingFellow.isMcf ? "Yes" : "No"}</p>
                </div>
              </div>
            </section>
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconBriefcase size={16} /> Program & cohort
              </div>
              <div className="nm-view-grid">
                <div>
                  <span className="nm-view-label">Cohort year</span>
                  <p className="nm-view-value">{viewingFellow.cohortYear}</p>
                </div>
                <div>
                  <span className="nm-view-label">Program</span>
                  <p className="nm-view-value">{viewingFellow.program}</p>
                </div>
              </div>
            </section>
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconMapPin size={16} /> Where they serve
              </div>
              <div className="nm-view-grid">
                <div>
                  <span className="nm-view-label">Organization / host</span>
                  <p className="nm-view-value">
                    {viewingFellow.serviceOrganization
                      ? `${viewingFellow.serviceOrganization}${viewingFellow.serviceRegion || viewingFellow.serviceCity ? ` · ${viewingFellow.serviceCity || viewingFellow.serviceRegion}` : ""}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="nm-view-label">Role</span>
                  <p className="nm-view-value">{viewingFellow.serviceRole ?? "—"}</p>
                </div>
                <div>
                  <span className="nm-view-label">City</span>
                  <p className="nm-view-value">{viewingFellow.serviceCity ?? "—"}</p>
                </div>
                <div>
                  <span className="nm-view-label">Region</span>
                  <p className="nm-view-value">{viewingFellow.serviceRegion ?? "—"}</p>
                </div>
              </div>
            </section>
            {fieldDefs.length > 0 && (
              <section className="rm-panel-section">
                <div className="rm-panel-section-head">
                  <IconColumns size={16} /> Custom fields
                </div>
                <div className="nm-view-grid">
                  {fieldDefs.map((def) => (
                    <div key={def.id}>
                      <span className="nm-view-label">{def.label}</span>
                      <p className="nm-view-value">{String(viewingFellow.customFields[def.key] ?? "—")}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </SlidePanel>

      {!readOnly && (
      <>
      <SlidePanel
        open={fellowPanel}
        onClose={closeFellowPanel}
        title={editingId ? "Edit fellow" : "Add fellow"}
        description={editingId ? `${hubName} — update profile details` : `${hubName} — new active program fellow`}
        footer={fellowFooter}
        width={760}
      >
        <form id="fellow-form" onSubmit={handleFellowSubmit} className="rm-panel-form">
          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconUser size={16} /> Profile
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>First name</span>
                <input value={fellowForm.firstName} onChange={(e) => setFellowForm((p) => ({ ...p, firstName: e.target.value }))} required />
              </div>
              <div className="epl-slide-field">
                <span>Last name</span>
                <input value={fellowForm.lastName} onChange={(e) => setFellowForm((p) => ({ ...p, lastName: e.target.value }))} required />
              </div>
            </div>
            <div className="epl-slide-field">
              <span>Email</span>
              <input type="email" value={fellowForm.email} onChange={(e) => setFellowForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="epl-slide-field">
              <span>Phone</span>
              <input value={fellowForm.phone} onChange={(e) => setFellowForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Optional" />
            </div>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconBriefcase size={16} /> Program & cohort
            </div>
            {editingId && (
              <div className="epl-slide-field">
                <span>Current status</span>
                <span className={statusPillClass(fellowForm.status)} style={{ alignSelf: "flex-start" }}>
                  {fellowForm.status}
                </span>
                <p className="rm-panel-hint">Use roster actions to move fellows to alumni or inactive.</p>
              </div>
            )}
            <div className="epl-slide-field">
              <span>Cohort</span>
              <SlideSelect
                value={fellowForm.cohortYear}
                onChange={(value) => setFellowForm((p) => ({ ...p, cohortYear: value }))}
                options={cohortOptions}
                placeholder={
                  cohortOptions.length === 0
                    ? "Create a cohort first"
                    : "Select hub cohort"
                }
              />
            </div>
            <div className="epl-slide-field">
              <span>Program track</span>
              <ProgramSelect
                tenantId={tenantId}
                value={fellowForm.program}
                onChange={(value) => setFellowForm((p) => ({ ...p, program: value }))}
                placeholder="Select hub program"
              />
            </div>
            <p className="rm-panel-hint">
              Cohort options come from Cohorts you already created for this hub. Programs must also
              be configured here first.
            </p>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconMapPin size={16} /> Where they serve
            </div>
            <p className="rm-panel-hint" style={{ marginTop: 0 }}>
              Current fellowship service location — not the same as the retention record below.
            </p>
            <div className="epl-slide-field">
              <span>Organization / host</span>
              <SlideSelect
                value={fellowForm.servicePartnerId}
                onChange={(partnerId) => {
                  if (!partnerId) {
                    setFellowForm((p) => ({
                      ...p,
                      servicePartnerId: "",
                      serviceOrganization: "",
                    }));
                    return;
                  }
                  const partner = (partnersQuery.data?.items ?? []).find((p) => p.id === partnerId);
                  setFellowForm((p) => ({
                    ...p,
                    servicePartnerId: partnerId,
                    serviceOrganization: partner?.name ?? "",
                    serviceRegion: partner?.region ?? p.serviceRegion,
                  }));
                }}
                options={partnerOptions}
                placeholder={
                  partnerOptions.length === 0
                    ? "Add a placement institution first"
                    : "Select placement institution"
                }
                allowEmpty
                emptyLabel="Not assigned"
              />
              <p className="rm-panel-hint">
                From Placement Institutions. Assigning a fellow here updates that institution&apos;s
                active fellow count.
              </p>
            </div>
            <div className="epl-slide-field">
              <span>Role / function</span>
              <input
                value={fellowForm.serviceRole}
                onChange={(e) => setFellowForm((p) => ({ ...p, serviceRole: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>City</span>
                <input
                  value={fellowForm.serviceCity}
                  onChange={(e) => setFellowForm((p) => ({ ...p, serviceCity: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="epl-slide-field">
                <span>Region</span>
                <input
                  value={fellowForm.serviceRegion}
                  onChange={(e) => setFellowForm((p) => ({ ...p, serviceRegion: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconBuildingBank size={16} /> Retention
            </div>
            <p className="rm-panel-hint" style={{ marginTop: 0 }}>
              Retention record. Turn on when this fellow is currently retained in service.
            </p>
            <SlideToggle
              checked={placementForm.enabled}
              onChange={(enabled) => setPlacementForm((p) => ({ ...p, enabled }))}
              label="Fellow is retained"
              description="Creates or updates their current retention record"
            />
            {placementForm.enabled && (
              <>
                <div className="epl-slide-field">
                  <span>Institution</span>
                  <input
                    value={placementForm.institution}
                    onChange={(e) => setPlacementForm((p) => ({ ...p, institution: e.target.value }))}
                    placeholder="Host institution"
                    required={placementForm.enabled}
                  />
                </div>
                <div className="rm-panel-row">
                  <div className="epl-slide-field">
                    <span>Role title</span>
                    <input
                      value={placementForm.roleTitle}
                      onChange={(e) => setPlacementForm((p) => ({ ...p, roleTitle: e.target.value }))}
                      placeholder="Role"
                      required={placementForm.enabled}
                    />
                  </div>
                  <div className="epl-slide-field">
                    <span>Department</span>
                    <input
                      value={placementForm.department}
                      onChange={(e) => setPlacementForm((p) => ({ ...p, department: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="rm-panel-row">
                  <div className="epl-slide-field">
                    <span>City</span>
                    <input
                      value={placementForm.city}
                      onChange={(e) => setPlacementForm((p) => ({ ...p, city: e.target.value }))}
                      required={placementForm.enabled}
                    />
                  </div>
                  <div className="epl-slide-field">
                    <span>Country</span>
                    <input
                      value={placementForm.country}
                      onChange={(e) => setPlacementForm((p) => ({ ...p, country: e.target.value }))}
                      required={placementForm.enabled}
                    />
                  </div>
                </div>
                <div className="rm-panel-row">
                  <div className="epl-slide-field">
                    <span>Start date</span>
                    <input
                      type="date"
                      value={placementForm.startDate}
                      onChange={(e) => setPlacementForm((p) => ({ ...p, startDate: e.target.value }))}
                      required={placementForm.enabled}
                    />
                  </div>
                  <div className="epl-slide-field">
                    <span>End date</span>
                    <input
                      type="date"
                      value={placementForm.endDate}
                      onChange={(e) => setPlacementForm((p) => ({ ...p, endDate: e.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconAdjustments size={16} /> Demographics
            </div>
            <div className="epl-slide-field">
              <span>Gender</span>
              <SlideSelect
                value={fellowForm.gender}
                onChange={(value) => setFellowForm((p) => ({ ...p, gender: value }))}
                options={GENDERS.map((gender) => ({ value: gender.value, label: gender.label }))}
                placeholder="Select gender"
                allowEmpty
                emptyLabel="Prefer not to say"
              />
            </div>
            <SlideToggle
              checked={fellowForm.hasDisability}
              onChange={(hasDisability) => setFellowForm((p) => ({ ...p, hasDisability }))}
              label="Person with disability"
              description="Included in aggregate reporting for this hub"
            />
          </section>

          <section className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconFileSpreadsheet size={16} /> Sync & flags
            </div>
            <div className="epl-slide-field">
              <span>External ID</span>
              <input value={fellowForm.externalId} onChange={(e) => setFellowForm((p) => ({ ...p, externalId: e.target.value }))} placeholder="For CSV / Sheets sync" />
              <p className="rm-panel-hint">Matches rows when importing from spreadsheets or external systems.</p>
            </div>
            <SlideToggle
              checked={fellowForm.isMcf}
              onChange={(isMcf) => setFellowForm((p) => ({ ...p, isMcf }))}
              label="MCF program member"
              description="Marks this fellow as part of the MCF track"
            />
          </section>

          {fieldDefs.length > 0 && (
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconColumns size={16} /> Custom fields
              </div>
              {fieldDefs.map((def) => (
                <div key={def.id} className="epl-slide-field">
                  <span>{def.label}{def.required ? " *" : ""}</span>
                  {def.fieldType === "select" ? (
                    <SlideSelect
                      value={fellowForm.customFields[def.key] ?? ""}
                      onChange={(value) => setFellowForm((p) => ({
                        ...p,
                        customFields: { ...p.customFields, [def.key]: value },
                      }))}
                      options={def.options.map((opt) => ({ value: opt, label: opt }))}
                      placeholder="Select…"
                      allowEmpty
                    />
                  ) : def.fieldType === "boolean" ? (
                    <SlideSelect
                      value={fellowForm.customFields[def.key] ?? ""}
                      onChange={(value) => setFellowForm((p) => ({
                        ...p,
                        customFields: { ...p.customFields, [def.key]: value },
                      }))}
                      options={YES_NO}
                      placeholder="Select…"
                      allowEmpty
                    />
                  ) : (
                    <input
                      type={def.fieldType === "number" ? "number" : def.fieldType === "date" ? "date" : "text"}
                      value={fellowForm.customFields[def.key] ?? ""}
                      onChange={(e) => setFellowForm((p) => ({
                        ...p,
                        customFields: { ...p.customFields, [def.key]: e.target.value },
                      }))}
                    />
                  )}
                </div>
              ))}
            </section>
          )}
        </form>
      </SlidePanel>

      <SlidePanel
        open={fieldsPanel}
        onClose={() => {
          setFieldsPanel(false);
          setFieldForm(EMPTY_FIELD);
        }}
        title="Custom fields"
        description="Define extra columns for this hub's network roster and CSV import."
        width={540}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <form onSubmit={handleFieldSubmit} className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconColumns size={16} /> Field definition
              </div>
              <div className="epl-slide-field">
                <span>Label</span>
                <input value={fieldForm.label} onChange={(e) => setFieldForm((p) => ({ ...p, label: e.target.value }))} required />
              </div>
              <div className="epl-slide-field">
                <span>Key (optional)</span>
                <input value={fieldForm.key} onChange={(e) => setFieldForm((p) => ({ ...p, key: e.target.value }))} placeholder="Auto-generated from label" />
              </div>
              <div className="epl-slide-field">
                <span>Type</span>
                <SlideSelect
                  value={fieldForm.fieldType}
                  onChange={(value) => setFieldForm((p) => ({ ...p, fieldType: value as FieldForm["fieldType"] }))}
                  options={FIELD_TYPES.map((type) => ({ value: type.value, label: type.label }))}
                  placeholder="Select type"
                />
              </div>
              {fieldForm.fieldType === "select" && (
                <div className="epl-slide-field">
                  <span>Options (comma-separated)</span>
                  <input value={fieldForm.options} onChange={(e) => setFieldForm((p) => ({ ...p, options: e.target.value }))} placeholder="Option A, Option B" />
                </div>
              )}
              <div className="epl-slide-field">
                <span>Sort order</span>
                <input type="number" value={fieldForm.sortOrder} onChange={(e) => setFieldForm((p) => ({ ...p, sortOrder: e.target.value }))} />
              </div>
              <SlideToggle
                checked={fieldForm.required}
                onChange={(required) => setFieldForm((p) => ({ ...p, required }))}
                label="Required on create / import"
                description="Import and manual add will reject rows missing this value"
              />
              <button type="submit" className="rm-primary" disabled={fieldUpsertMutation.isPending}>
                {fieldUpsertMutation.isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
                {fieldForm.id ? "Update field" : "Add field"}
              </button>
            </section>
          </form>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fieldsQuery.isLoading ? (
              <div className="rm-state">Loading fields…</div>
            ) : fieldDefs.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--emuted)", margin: 0 }}>No custom fields yet.</p>
            ) : (
              fieldDefs.map((field) => (
                <div key={field.id} className="gc" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--ewhite)", fontSize: 13 }}>{field.label}</div>
                    <div style={{ fontSize: 11, color: "var(--emuted)" }}>
                      {field.key} · {field.fieldType}{field.required ? " · required" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className="rm-ghost"
                      onClick={() => setFieldForm({
                        id: field.id,
                        label: field.label,
                        key: field.key,
                        fieldType: field.fieldType,
                        options: field.options.join(", "),
                        required: field.required,
                        sortOrder: String(field.sortOrder),
                      })}
                    >
                      <IconPencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="rm-ghost"
                      onClick={() => {
                        if (window.confirm(`Remove field "${field.label}"?`)) {
                          fieldDeleteMutation.mutate({ tenantId, id: field.id });
                        }
                      }}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SlidePanel>
      </>
      )}
    </div>
  );
}
