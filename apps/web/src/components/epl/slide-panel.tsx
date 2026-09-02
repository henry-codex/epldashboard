"use client";

import { IconX } from "@tabler/icons-react";
import { useEffect, useState, type ReactNode, type TransitionEvent } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/hooks/use-theme";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/**
 * Slide-over panel. Uses CSS transitions (not Framer transform) so the scroll
 * body is not a descendant of a lingering `transform` — that was causing
 * fields to jitter/shake while scrolling.
 */
export function SlidePanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 480,
}: SlidePanelProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [present, setPresent] = useState(open);
  const [entered, setEntered] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setPresent(true);
      setSettled(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setEntered(false);
    setSettled(false);
  }, [open]);

  useEffect(() => {
    if (!present) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [present]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, onClose]);

  function handlePanelTransitionEnd(e: TransitionEvent<HTMLElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "transform") return;
    if (open && entered) {
      setSettled(true);
      return;
    }
    if (!open) {
      setPresent(false);
    }
  }

  if (!mounted || !present) return null;

  return createPortal(
    <div
      className={`epl-slide-root${theme === "light" ? " epl-light" : ""}${entered ? " is-open" : ""}`}
      aria-modal="true"
      role="dialog"
    >
      <button
        type="button"
        className="epl-slide-backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        className={`epl-slide-panel${entered ? " is-in" : ""}${settled ? " is-settled" : ""}`}
        style={{ width }}
        onTransitionEnd={handlePanelTransitionEnd}
      >
        <header className="epl-slide-header">
          <div>
            <h2 className="epl-slide-title">{title}</h2>
            {description ? <p className="epl-slide-desc">{description}</p> : null}
          </div>
          <button
            type="button"
            className="epl-slide-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </header>
        <div className="epl-slide-body">{children}</div>
        {footer ? <footer className="epl-slide-footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}
