"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { mfaPath } from "@/lib/mfa";

export function MfaGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: identity, isPending } = authClient.useSession();
  const status = useQuery({ ...trpc.account.mfaStatus.queryOptions(), enabled: Boolean(identity?.user), retry: false, staleTime: 0 });
  useEffect(() => {
    if (!isPending && !identity?.user) { router.replace("/login"); return; }
    if (status.data?.reason) router.replace(mfaPath(status.data.reason === "MFA_ENROLLMENT_REQUIRED" ? "setup" : "verify", pathname) as never);
  }, [isPending, identity?.user, status.data, pathname, router]);
  if (isPending || !identity?.user || status.isPending || status.data?.reason) return <p className="rm-state" role="status">Checking account security…</p>;
  if (status.isError || !status.data) return <div className="rm-state"><p role="alert">Could not check account security.</p><button className="rm-ghost" onClick={() => { void status.refetch(); }}>Try again</button></div>;
  return children;
}
