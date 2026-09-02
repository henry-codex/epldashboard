"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NestedShell } from "@/components/epl/nested-shell";
import type { SubNavItem } from "@/components/epl/sub-sidebar";
import {
  IconUsers,
  IconStar,
} from "@tabler/icons-react";

const ALUMNI_NAV: SubNavItem[] = [
  { key: "dashboard",   label: "Dashboard",       icon: <IconUsers size={20} />,       href: "/dashboard/alumni" },
  { key: "executives",  label: "Executive Hub",   icon: <IconStar size={20} />,        href: "/dashboard/alumni/executives" },
];

interface Props {
  children: React.ReactNode;
  activePage: string;
  pageTitle: string;
}

export function AlumniLayout({ children, activePage, pageTitle }: Props) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending || !session?.user) return null;

  const user = {
    name: session.user.name ?? undefined,
    email: session.user.email ?? undefined,
    image: session.user.image ?? undefined,
  };

  return (
    <NestedShell
      backLabel="Back to Dashboard"
      backHref="/dashboard"
      sectionTitle="Alumni Network"
      sectionIcon={<IconUsers size={16} />}
      sectionSubtitle="Graduate outcomes & impact"
      accent="#2EC27E"
      navItems={ALUMNI_NAV}
      activePage={activePage}
      pageTitle={pageTitle}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Alumni Network" },
      ]}
      user={user}
    >
      {children}
    </NestedShell>
  );
}
