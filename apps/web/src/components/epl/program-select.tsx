"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlideSelect } from "@/components/epl/slide-select";
import { trpc } from "@/utils/trpc";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  planned: "Planned",
};

type Props = {
  tenantId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function ProgramSelect({
  tenantId,
  value,
  onChange,
  placeholder = "Select program",
}: Props) {
  const query = useQuery(trpc.programs.list.queryOptions({ tenantId }));

  const options = useMemo(
    () =>
      (query.data?.items ?? []).map((program) => ({
        value: program.title,
        label: program.title,
        hint: STATUS_LABELS[program.status] ?? program.status,
      })),
    [query.data?.items],
  );

  useEffect(() => {
    if (query.isLoading) return;

    const titles = new Set(options.map((item) => item.value));
    if (value && !titles.has(value)) {
      // Drop values that are not hub-created programs (no Legacy fallback).
      onChange(options[0]?.value ?? "");
      return;
    }

    if (!value && options.length > 0) {
      onChange(options[0]!.value);
    }
  }, [query.isLoading, value, options, onChange]);

  if (query.isLoading) {
    return <div className="rm-state" style={{ fontSize: 12, padding: "8px 0" }}>Loading programs…</div>;
  }

  if (options.length === 0) {
    return (
      <p className="rm-panel-hint" style={{ margin: 0 }}>
        No programs for this hub yet — add them on the Programs page first.
      </p>
    );
  }

  return (
    <SlideSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
    />
  );
}
