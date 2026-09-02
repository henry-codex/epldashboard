"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/epl/app-shell";
import { ContinentalEventsView } from "@/components/epl/continental-events-view";
import { useHomePath } from "@/hooks/use-home-path";
import { isCountryWorkspaceRole } from "@/lib/home-path";
import { trpc } from "@/utils/trpc";

export default function EventsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const home = useHomePath();
  const eventsQuery = useQuery({
    ...trpc.platform.eventPortfolio.queryOptions(),
    enabled: Boolean(session?.user) && !home.isLoading && home.role === "super_admin",
  });

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  useEffect(() => {
    if (home.isLoading) return;
    if (isCountryWorkspaceRole(home.role)) {
      router.replace(home.path as never);
    }
  }, [home.isLoading, home.path, home.role, router]);

  if (isPending || !session?.user || home.isLoading || isCountryWorkspaceRole(home.role)) {
    return null;
  }

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  const totals = eventsQuery.data?.totals ?? {
    ongoing: 0,
    upcoming: 0,
    past: 0,
    thisMonth: 0,
    total: 0,
    countries: 0,
  };

  return (
    <AppShell
      activePage="events"
      pageTitle="Events"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Events" }]}
      user={user}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 60 }}>
        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "var(--ewhite)",
              margin: "0 0 8px 0",
              fontFamily: "var(--font)",
            }}
          >
            Continental Events
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 680 }}>
            Live events from all country hubs — ongoing sessions, upcoming orientations, and past program
            milestones across the network.
          </p>
        </div>

        {eventsQuery.isError && (
          <div className="rm-state rm-state-error">
            Could not load events. {eventsQuery.error.message}
          </div>
        )}

        {!eventsQuery.isError && (
          <ContinentalEventsView
            totals={totals}
            events={eventsQuery.data?.events ?? []}
            isLoading={eventsQuery.isLoading}
          />
        )}
      </div>
    </AppShell>
  );
}
