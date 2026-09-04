"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { ConfirmProvider } from "./epl/confirm-dialog";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="epl-theme"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
