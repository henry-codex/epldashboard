"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<ConfirmState | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  const confirm = useCallback((options: ConfirmOptions) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  // Functional update so this never closes over a stale `state` reference,
  // regardless of what re-renders happened between open and click.
  const settle = useCallback((value: boolean) => {
    setState((prev) => {
      prev?.resolve(value);
      return null;
    });
  }, []);

  // A stuck-open dialog would otherwise float on top of whatever page the
  // user navigates to next — auto-cancel it the moment the route changes.
  useEffect(() => {
    setState((prev) => {
      prev?.resolve(false);
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!state) return;
    const previousFocus = returnFocusRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); settle(false); }
      if (e.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
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
              aria-labelledby={state.title ? "account-confirm-title" : undefined}
              aria-describedby="account-confirm-message"
            >
              <button
                type="button"
                className="epl-confirm-backdrop"
                aria-label="Cancel"
                onClick={() => settle(false)}
              />
              <div className="epl-confirm-card" ref={dialogRef}>
                <div className={`epl-confirm-icon${state.danger ? " is-danger" : ""}`}>
                  <IconAlertTriangle size={20} />
                </div>
                {state.title ? <h3 id="account-confirm-title" className="epl-confirm-title">{state.title}</h3> : null}
                <p id="account-confirm-message" className="epl-confirm-message">{state.message}</p>
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
