"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlideSelect } from "@/components/epl/slide-select";
import { trpc } from "@/utils/trpc";

type Props = {
  tenantId: string;
  value: string;
  onChange: (cohortId: string, cohortYear?: number) => void;
  placeholder?: string;
};

export function CohortSelect({ tenantId, value, onChange, placeholder = "Select cohort" }: Props) {
  const query = useQuery(trpc.cohorts.list.queryOptions({ tenantId }));

  const options = useMemo(
    () =>
      (query.data?.items ?? [])
        .filter((cohort) => cohort.id)
        .map((cohort) => ({
          value: cohort.id!,
          label: cohort.label,
          hint: cohort.cohortYear != null ? String(cohort.cohortYear) : undefined,
        })),
    [query.data?.items],
  );

  useEffect(() => {
    if (!value && options.length === 1) {
      const only = options[0]!;
      onChange(only.value, only.hint ? Number.parseInt(only.hint, 10) : undefined);
    }
  }, [value, options, onChange]);

  if (query.isLoading) {
    return <div className="rm-state" style={{ fontSize: 12, padding: "8px 0" }}>Loading cohorts…</div>;
  }

  if (options.length === 0) {
    return (
      <p className="rm-panel-hint" style={{ margin: 0 }}>
        Add cohorts on the Cohorts page first.
      </p>
    );
  }

  return (
    <SlideSelect
      value={value}
      onChange={(cohortId) => {
        const match = options.find((option) => option.value === cohortId);
        onChange(cohortId, match?.hint ? Number.parseInt(match.hint, 10) : undefined);
      }}
      options={options}
      placeholder={placeholder}
      allowEmpty
      emptyLabel="—"
    />
  );
}
