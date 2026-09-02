"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronDown, IconSearch, IconX } from "@tabler/icons-react";
import {
  searchWorldCountries,
  type WorldCountry,
} from "@/lib/world-countries";

type Props = {
  value: WorldCountry | null;
  onChange: (country: WorldCountry | null) => void;
  excludeCodes?: string[];
  placeholder?: string;
  autoFocus?: boolean;
};

function FlagMark({ iso2, flag, size = 20 }: { iso2: string; flag: string; size?: number }) {
  return (
    <span className="rm-cp-flag" style={{ width: size, height: size * 0.75 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
        alt=""
        width={size}
        height={Math.round(size * 0.75)}
        loading="lazy"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const fallback = el.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.hidden = false;
        }}
      />
      <span className="rm-cp-flag-emoji" hidden>
        {flag}
      </span>
    </span>
  );
}

export function CountryPicker({
  value,
  onChange,
  excludeCodes = [],
  placeholder = "Search countries…",
  autoFocus,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const excluded = useMemo(
    () => new Set(excludeCodes.map((c) => c.toUpperCase())),
    [excludeCodes],
  );

  const results = useMemo(() => {
    return searchWorldCountries(query, 120).filter(
      (c) => !excluded.has(c.iso3) && !excluded.has(c.iso2),
    );
  }, [query, excluded]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function select(c: WorldCountry) {
    onChange(c);
    setQuery("");
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  return (
    <div className={`rm-cp${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="rm-cp-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        autoFocus={autoFocus}
      >
        {value ? (
          <span className="rm-cp-value">
            <FlagMark iso2={value.iso2} flag={value.flag} />
            <span className="rm-cp-name">{value.name}</span>
            <span className="rm-cp-code">{value.iso3}</span>
          </span>
        ) : (
          <span className="rm-cp-placeholder">{placeholder}</span>
        )}
        <span className="rm-cp-actions">
          {value && (
            <span
              className="rm-cp-clear"
              onClick={clear}
              role="button"
              tabIndex={-1}
              aria-label="Clear country"
            >
              <IconX size={14} />
            </span>
          )}
          <IconChevronDown size={16} className="rm-cp-chevron" />
        </span>
      </button>

      {open && (
        <div className="rm-cp-dropdown" role="listbox">
          <div className="rm-cp-search">
            <IconSearch size={15} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              aria-label="Search countries"
            />
          </div>
          <ul className="rm-cp-list">
            {results.length === 0 && (
              <li className="rm-cp-empty">No countries match “{query}”</li>
            )}
            {results.map((c) => (
              <li key={c.iso3}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.iso3 === c.iso3}
                  className={`rm-cp-option${value?.iso3 === c.iso3 ? " is-selected" : ""}`}
                  onClick={() => select(c)}
                >
                  <FlagMark iso2={c.iso2} flag={c.flag} />
                  <span className="rm-cp-name">{c.name}</span>
                  <span className="rm-cp-code">{c.iso3}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
