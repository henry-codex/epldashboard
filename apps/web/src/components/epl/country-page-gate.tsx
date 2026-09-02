"use client";

import { CountryLayout } from "@/components/epl/country-layout";
import { CountrySectionEmpty, CountrySectionSkeleton } from "@/components/epl/country-section-empty";
import { useCountryHub, type CountryHubMeta } from "@/hooks/use-country-hub";
import type { CountryData } from "@/lib/mock-data";

type Props = {
  activePage: string;
  pageTitle: string;
  emptyTitle: string;
  emptyDescription?: string;
  children: (ctx: { hub: CountryHubMeta; mock: CountryData }) => React.ReactNode;
};

/** Resolves live vs mock country hub; shows skeleton / empty instead of a blank page. */
export function CountryPageGate({
  activePage,
  pageTitle,
  emptyTitle,
  emptyDescription,
  children,
}: Props) {
  const { hub, mock, isLoading, isError, error } = useCountryHub();

  if (isLoading) {
    return (
      <CountryLayout activePage={activePage} pageTitle={pageTitle}>
        <CountrySectionSkeleton accent={hub?.color} />
      </CountryLayout>
    );
  }

  if (isError || !hub) {
    return (
      <CountryLayout activePage={activePage} pageTitle={pageTitle}>
        <div className="rm-state rm-state-error">
          {error?.message ?? "Country hub not found"}
        </div>
      </CountryLayout>
    );
  }

  if (hub.isEmpty || !mock) {
    return (
      <CountryLayout activePage={activePage} pageTitle={pageTitle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
              {hub.name} · {pageTitle}
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)" }}>
              Live country portal — waiting for data.
            </p>
          </div>
          <CountrySectionEmpty
            title={emptyTitle}
            description={emptyDescription}
            accent={hub.color}
          />
        </div>
      </CountryLayout>
    );
  }

  return (
    <CountryLayout activePage={activePage} pageTitle={pageTitle}>
      {children({ hub, mock })}
    </CountryLayout>
  );
}
