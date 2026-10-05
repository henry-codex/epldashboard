"use client";

import { resolveAccess } from "@epl-fellows-platform/auth/access-policy";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { homePathForSession } from "@/lib/home-path";

/** Resolve post-login / default home from server role + tenant. */
export function useHomePath() {
  const me = useQuery(trpc.privateData.queryOptions());
  const path = homePathForSession({
    role: me.data?.role,
    tenantId: me.data?.tenant?.id ?? me.data?.tenantId,
  });
  return {
    path,
    workspace: me.data?.workspace ?? null,
    capabilities: me.data?.capabilities ?? resolveAccess([]).capabilities,
    role: me.data?.role,
    tenant: me.data?.tenant ?? null,
    isLoading: me.isLoading,
    isError: me.isError,
    refetch: me.refetch,
  };
}
