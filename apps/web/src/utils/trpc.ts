import { safeMfaReturnPath } from "@epl-fellows-platform/auth/mfa-policy";
import type { AppRouter } from "@epl-fellows-platform/api/routers/index";

import { env } from "@epl-fellows-platform/env/web";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const data = (error as { data?: { mfaReason?: string; code?: string } }).data;
      if (data?.code === "UNAUTHORIZED" && typeof window !== "undefined") { window.location.assign("/login"); return; }
      if (data?.mfaReason && typeof window !== "undefined") {
        const returnTo = safeMfaReturnPath(window.location.pathname + window.location.search);
        void queryClient.cancelQueries(); queryClient.clear();
        window.location.assign("/mfa/" + (data.mfaReason === "MFA_ENROLLMENT_REQUIRED" ? "setup" : "verify") + (returnTo ? "?returnTo=" + encodeURIComponent(returnTo) : ""));
        return;
      }
      toast.error(error.message, {
        action: {
          label: "Retry",
          onClick: () => {
            void queryClient.refetchQueries(
              { queryKey: query.queryKey, exact: true },
              { cancelRefetch: false },
            );
          },
        },
      });
    },
  }),
});

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.NEXT_PUBLIC_SERVER_URL}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
