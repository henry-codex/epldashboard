"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NestedShell } from "@/components/epl/nested-shell";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import type { SubNavItem } from "@/components/epl/sub-sidebar";
import {
  IconLayoutDashboard,
  IconUsers,
  IconSchool,
  IconStack2,
  IconCalendarCheck,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconPhoto,
  IconHeartHandshake,
} from "@tabler/icons-react";

function getCountryNav(id: string): SubNavItem[] {
  const base = `/dashboard/countries/${id}`;
  const c = COUNTRIES_MAP[id as CountryId];
  return [
    { key: "overview",  label: "Overview",   icon: <IconLayoutDashboard size={20} />, href: base },
    { key: "fellows",   label: "Fellows",    icon: <IconUsers size={20} />,           href: `${base}/fellows` },
    { key: "programs",  label: "Programs",   icon: <IconSchool size={20} />,          href: `${base}/programs` },
    { key: "cohorts",   label: "Cohorts",    icon: <IconStack2 size={20} />,          href: `${base}/cohorts` },
    { key: "partners",  label: "Partners",   icon: <IconHeartHandshake size={20} />,  href: `${base}/partners` },
    { key: "alumni",    label: "Alumni",     icon: <IconBuildingCommunity size={20}/>,href: `${base}/alumni` },
    { key: "events",    label: "Events",     icon: <IconCalendarEvent size={20} />,   href: `${base}/events` },
    { key: "media",     label: "Media",      icon: <IconPhoto size={20} />,           href: `${base}/media` },
  ];
}

interface Props {
  children: React.ReactNode;
  activePage: string;
  pageTitle: string;
}

export function CountryLayout({ children, activePage, pageTitle }: Props) {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session?.user) return null;

  const country = COUNTRIES_MAP[id as CountryId];
  if (!country) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--emuted)" }}>
        Country not found.{" "}
        <button onClick={() => router.push("/dashboard/countries")} style={{ color: "#3B8BEB", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
          Back to Countries
        </button>
      </div>
    );
  }

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <NestedShell
      backLabel="Back to Countries"
      backHref="/dashboard/countries"
      sectionTitle={country.name}
      sectionIcon={<span>{country.flag}</span>}
      sectionSubtitle={`${country.activePrograms} programs · ${country.fellows} fellows`}
      accent={country.color}
      navItems={getCountryNav(id)}
      activePage={activePage}
      pageTitle={pageTitle}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Countries", href: "/dashboard/countries" },
        { label: country.name },
      ]}
      user={user}
    >
      {children}
    </NestedShell>
  );
}
