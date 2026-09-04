"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTheme } from "@/hooks/use-theme";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmState = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ConfirmState | null>(null);

  useEffect(() => setMounted(true), []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const settle = useCallback(
    (value: boolean) => {
      state?.resolve(value);
      setState(null);
    },
    [state],
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted && state
        ? createPortal(
            <div
              className={`epl-confirm-root${theme === "light" ? " epl-light" : ""}`}
              role="alertdialog"
              aria-modal="true"
            >
              <button
                type="button"
                className="epl-confirm-backdrop"
                aria-label="Cancel"
                onClick={() => settle(false)}
              />
              <div className="epl-confirm-card">
                <div className={`epl-confirm-icon${state.danger ? " is-danger" : ""}`}>
                  <IconAlertTriangle size={20} />
                </div>
                {state.title ? <h3 className="epl-confirm-title">{state.title}</h3> : null}
                <p className="epl-confirm-message">{state.message}</p>
                <div className="epl-confirm-actions">
                  <button type="button" className="rm-ghost" onClick={() => settle(false)}>
                    {state.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    type="button"
                    className={`rm-primary${state.danger ? " epl-confirm-danger-btn" : ""}`}
                    onClick={() => settle(true)}
                    autoFocus
                  >
                    {state.confirmLabel ?? "Confirm"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </ConfirmContext.Provider>
  );
}

/** Returns an imperative confirm(options) function that resolves to true/false — a themed replacement for window.confirm(). */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}
