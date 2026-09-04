"use client";

import { useLayoutEffect, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconDotsVertical } from "@tabler/icons-react";
import { useTheme } from "@/hooks/use-theme";

export type ActionMenuItem = {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};

/** Shared kebab-menu row action trigger — same one used on Network's roster table. */
export function RowActionsMenu({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ActionMenuItem[];
}) {
  const { theme } = useTheme();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 196;
    const estimatedHeight = items.length * 40 + 16;
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    const top = openUp
      ? Math.max(8, rect.top - 6 - estimatedHeight)
      : rect.bottom + 6;
    setPos({ top, left });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    // Defer binding so the same click that opens the menu does not close it.
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
      window.addEventListener("keydown", onKey);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div className="nm-actions">
      <button
        ref={triggerRef}
        type="button"
        className={`nm-actions-trigger${open ? " is-open" : ""}`}
        aria-label="Actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(!open);
        }}
      >
        <IconDotsVertical size={16} />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              className={`nm-actions-menu${theme === "light" ? " is-light" : ""}`}
              role="menu"
              style={{ top: pos.top, left: pos.left }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`nm-actions-item${item.danger ? " is-danger" : ""}`}
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (item.disabled) return;
                    onOpenChange(false);
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
