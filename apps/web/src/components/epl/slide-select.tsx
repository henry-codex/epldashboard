"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown, IconSearch } from "@tabler/icons-react";
import { useTheme } from "@/hooks/use-theme";

export type SlideSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: readonly SlideSelectOption[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function computeMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 12;
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const preferredMax = 240;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;

  const maxHeight = Math.min(preferredMax, openUp ? spaceAbove - gap : spaceBelow - gap);
  const top = openUp
    ? Math.max(viewportPadding, rect.top - gap - maxHeight)
    : rect.bottom + gap;

  return {
    top,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.max(120, maxHeight),
  };
}

export function SlideSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  allowEmpty = false,
  emptyLabel = "—",
  searchable = false,
  searchPlaceholder = "Search…",
}: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        (option.hint ?? "").toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q),
    );
  }, [options, query, searchable]);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuStyle(computeMenuPosition(triggerRef.current));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    if (searchable) {
      setQuery("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, updateMenuPosition, options.length, searchable]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      close();
    };

    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  const menu = open && menuStyle && mounted
    ? createPortal(
        <div
          ref={menuRef}
          className={`rm-cp-dropdown epl-slide-select-portal${theme === "light" ? " is-light" : ""}`}
          role="listbox"
          style={{
            position: "fixed",
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            maxHeight: menuStyle.maxHeight,
            zIndex: 650,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {searchable && (
            <div className="rm-cp-search">
              <IconSearch size={14} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <ul className="rm-cp-list" style={{ flex: 1, overflowY: "auto", maxHeight: "none" }}>
            {allowEmpty && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ""}
                  className={`rm-cp-option${value === "" ? " is-selected" : ""}`}
                  onClick={() => pick("")}
                >
                  <span className="rm-cp-name">{emptyLabel}</span>
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li>
                <div className="rm-cp-option" style={{ opacity: 0.55, cursor: "default" }}>
                  <span className="rm-cp-name">No matches</span>
                </div>
              </li>
            ) : (
              filtered.map((option) => (
                <li key={option.value || option.label}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    className={`rm-cp-option${value === option.value ? " is-selected" : ""}`}
                    onClick={() => pick(option.value)}
                  >
                    <span className="rm-cp-name">{option.label}</span>
                    {option.hint ? <span className="rm-cp-code">{option.hint}</span> : null}
                    {value === option.value ? (
                      <IconCheck size={14} style={{ marginLeft: "auto", opacity: 0.8 }} />
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className={`rm-cp epl-slide-select${open ? " is-open" : ""}`} ref={rootRef}>
        <button
          ref={triggerRef}
          type="button"
          className="rm-cp-trigger"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          {selected ? (
            <span className="rm-cp-value">
              <span className="rm-cp-name">{selected.label}</span>
              {selected.hint ? <span className="rm-cp-code">{selected.hint}</span> : null}
            </span>
          ) : value ? (
            <span className="rm-cp-value">
              <span className="rm-cp-name">{value}</span>
            </span>
          ) : (
            <span className="rm-cp-placeholder">{placeholder}</span>
          )}
          <span className="rm-cp-actions">
            <IconChevronDown size={16} className="rm-cp-chevron" />
          </span>
        </button>
      </div>
      {menu}
    </>
  );
}
