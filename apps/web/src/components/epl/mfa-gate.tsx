"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";
import { mfaPath } from "@/lib/mfa";

export function MfaGate({ children }: { children: React.ReactNode }) {
  const router = useRouter(), pathname = usePathname();
  const { data: identity, isPending } = authClient.useSession();
  const [clock, setClock] = useState(Date.now);
  const status = useQuery({ ...trpc.account.mfaStatus.queryOptions(), enabled: Boolean(identity?.user), retry: false, staleTime: 0, refetchOnWindowFocus: "always" });
  const expiry = status.data?.verificationExpiresAt ? new Date(status.data.verificationExpiresAt).getTime() : null;
  const expired = Boolean(status.data?.enabled && expiry !== null && Math.max(clock, Date.now()) >= expiry);
  useEffect(() => {
    if (isPending || !identity?.user) return;
    const wake = () => { setClock(Date.now()); void status.refetch(); };
    const visible = () => { if (document.visibilityState === "visible") wake(); };
    window.addEventListener("focus", wake); document.addEventListener("visibilitychange", visible);
    const timer = expiry && !expired ? window.setTimeout(wake, Math.max(0, expiry - Date.now())) : undefined;
    return () => { window.removeEventListener("focus", wake); document.removeEventListener("visibilitychange", visible); window.clearTimeout(timer); };
  }, [expiry, expired, status.refetch, isPending, identity?.user?.id]);
  useEffect(() => {
    const returnTo = window.location.pathname + window.location.search;
    if (!isPending && !identity?.user) { router.replace("/login"); return; }
    if (status.data?.reason || expired) {
      const key = JSON.stringify(trpc.account.mfaStatus.queryKey());
      const filters = { predicate: (query: { queryKey: readonly unknown[] }) => JSON.stringify(query.queryKey) !== key };
      void queryClient.cancelQueries(filters); queryClient.removeQueries(filters);
      router.replace(mfaPath(status.data?.reason === "MFA_ENROLLMENT_REQUIRED" ? "setup" : "verify", returnTo) as never);
    }
  }, [isPending, identity?.user, status.data, expired, pathname, router]);
  if (isPending || !identity?.user || status.isPending || status.data?.reason || expired) return <p className="rm-state" role="status">Checking account security...</p>;
  if (status.isError || !status.data) return <div className="rm-state"><p role="alert">Could not check account security.</p><button className="rm-ghost" onClick={() => { void status.refetch(); }}>Try again</button></div>;
  return children;
}
