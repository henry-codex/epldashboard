"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";
import { SlidePanel } from "@/components/epl/slide-panel";
import { CountryPicker } from "@/components/epl/country-picker";
import type { WorldCountry } from "@/lib/world-countries";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";
import {
  IconPlus,
  IconSearch,
  IconLoader2,
  IconWorld,
  IconMapPin,
  IconUserPlus,
  IconUsers,
  IconCheck,
  IconChevronRight,
} from "@tabler/icons-react";

const PRESET_COLORS = ["#4150A3", "#2EC27E", "#E05C5C", "#F4BD12", "#3B8BEB", "#8E44AD"];

const EMPTY_ADMIN = {
  color: "#4150A3",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function HubFlag({
  countryCode,
  iso2,
  flag,
  size = 40,
}: {
  countryCode: string;
  iso2?: string;
  flag?: string;
  size?: number;
}) {
  const code = resolveIso2({ countryCode, iso2, flag });
  if (!code) {
    return <span className="rm-hub-flag-fallback">{countryCode.slice(0, 2)}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="rm-hub-flag-img"
      src={flagImageUrl(code, 80)}
      alt=""
      width={size}
      height={size}
    />
  );
}

export default function CountriesSettingsPage() {
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<WorldCountry | null>(null);
  const [form, setForm] = useState(EMPTY_ADMIN);

  const listQuery = useQuery(trpc.tenants.list.queryOptions());

  const existingCodes = useMemo(
    () => (listQuery.data ?? []).map((c) => c.countryCode).filter(Boolean),
    [listQuery.data],
  );

  const resetAndClose = useCallback(() => {
    setSelected(null);
    setForm(EMPTY_ADMIN);
    setPanelOpen(false);
  }, []);

  const createMutation = useMutation(
    trpc.tenants.createWithAdmin.mutationOptions({
      onSuccess: (data) => {
        toast.success(`${data.tenant.name} hub ready — ${data.admin.email} can sign in`);
        void queryClient.invalidateQueries({ queryKey: trpc.tenants.list.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.users.list.queryKey() });
        resetAndClose();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const countries = useMemo(() => {
    const rows = listQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.countryCode.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [listQuery.data, search]);

  const isEmpty = !listQuery.isLoading && !listQuery.isError && (listQuery.data?.length ?? 0) === 0;

  function setField<K extends keyof typeof EMPTY_ADMIN>(key: K, value: (typeof EMPTY_ADMIN)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error("Pick a country from the list");
      return;
    }
    if (!form.adminName.trim() || !form.adminEmail.trim() || !form.adminPassword) {
      toast.error("First admin name, email, and password are required");
      return;
    }
    if (form.adminPassword.length < 8) {
      toast.error("Admin password must be at least 8 characters");
      return;
    }
    createMutation.mutate({
      name: selected.name,
      countryCode: selected.iso3,
      flag: selected.flag,
      iso2: selected.iso2,
      color: form.color,
      adminName: form.adminName.trim(),
      adminEmail: form.adminEmail.trim(),
      adminPassword: form.adminPassword,
    });
  }

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={resetAndClose} disabled={createMutation.isPending}>
        Cancel
      </button>
      <button
        type="submit"
        form="create-hub-form"
        className="rm-primary"
        disabled={createMutation.isPending || !selected}
      >
        {createMutation.isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        Create hub & admin
      </button>
    </div>
  );

  return (
    <div className="rm-page">
      <header className="rm-header">
        <div>
          <p className="rm-kicker">Settings · Regional</p>
          <h1 className="rm-title">Regional hubs</h1>
          <p className="rm-sub">
            Partner nations with a country admin who can sign in from day one.
          </p>
        </div>
        <div className="rm-header-actions">
          <div className="rm-search">
            <IconSearch size={15} />
            <input
              type="text"
              placeholder="Search hubs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="rm-primary" onClick={() => setPanelOpen(true)}>
            <IconPlus size={16} />
            New hub
          </button>
        </div>
      </header>

      <section className="rm-list">
        <div className="rm-list-label">
          Active regional hubs
          <span>{listQuery.isFetching ? "Syncing…" : `${countries.length}`}</span>
        </div>

        {listQuery.isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading from database…
          </div>
        )}

        {listQuery.isError && (
          <div className="rm-state rm-state-error">
            Could not load countries: {listQuery.error.message}
          </div>
        )}

        {isEmpty && (
          <div className="rm-empty">
            <div className="rm-empty-icon">
              <IconMapPin size={28} />
            </div>
            <h3>No hubs yet</h3>
            <p>
              Create the first partner nation and assign a country admin — both land in Postgres in one step.
            </p>
            <button type="button" className="rm-primary" onClick={() => setPanelOpen(true)}>
              <IconPlus size={16} /> Create first hub
            </button>
          </div>
        )}

        {!isEmpty && !listQuery.isLoading && (
          <div className="rm-hub-table">
            <div className="rm-hub-head">
              <span>Country</span>
              <span>ISO</span>
              <span>Users</span>
              <span>Status</span>
              <span />
            </div>
            {countries.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/countries/${c.id}` as never}
                className="rm-hub-row"
              >
                <div className="rm-hub-country">
                  <div className="rm-hub-flag" style={{ boxShadow: `0 0 0 2px ${c.color}40` }}>
                    <HubFlag
                      countryCode={c.countryCode}
                      iso2={c.iso2}
                      flag={c.flag}
                    />
                  </div>
                  <div>
                    <strong>{c.name}</strong>
                    <span>{c.slug}</span>
                  </div>
                </div>
                <span className="rm-hub-iso">{c.countryCode}</span>
                <span className="rm-hub-users">
                  <IconUsers size={14} />
                  {c.memberCount}
                </span>
                <span className="rm-pill">
                  <i style={{ background: c.isActive ? "#2EC27E" : "var(--emuted)" }} />
                  {c.isActive ? "Active" : "Inactive"}
                </span>
                <IconChevronRight size={16} className="rm-hub-chevron" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <SlidePanel
        open={panelOpen}
        onClose={resetAndClose}
        title="New regional hub"
        description="Pick a country — flag and ISO fill in automatically — then add the first admin."
        footer={footer}
        width={520}
      >
        <form id="create-hub-form" className="rm-panel-form" onSubmit={handleCreate}>
          <div className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconWorld size={16} />
              <span>Country</span>
            </div>

            <div className="epl-slide-field">
              <span>Select country</span>
              <CountryPicker
                value={selected}
                onChange={setSelected}
                excludeCodes={existingCodes}
                autoFocus
              />
            </div>

            <div className="rm-panel-row">
              <div className="epl-slide-field">
                <span>Flag</span>
                <div className={`rm-autofill${selected ? " has-value" : ""}`}>
                  {selected ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={flagImageUrl(selected.iso2, 40)}
                      alt=""
                      width={28}
                      height={20}
                      style={{ borderRadius: 3, display: "block" }}
                    />
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="epl-slide-field">
                <span>ISO code</span>
                <div className={`rm-autofill${selected ? " has-value" : ""}`}>
                  {selected?.iso3 ?? "—"}
                </div>
              </div>
            </div>

            <div className="epl-slide-field">
              <span>Accent color</span>
              <p className="rm-panel-hint" style={{ marginTop: 0 }}>
                Saved on the hub and used on map, charts, and country pages.
              </p>
              <div className="rm-colors">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`rm-swatch${form.color === c ? " is-active" : ""}`}
                    style={{ background: c }}
                    onClick={() => setField("color", c)}
                    aria-label={c}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setField("color", e.target.value)}
                  className="rm-color-input"
                />
              </div>
              <div className="rm-color-preview" style={{ background: form.color }} />
            </div>
          </div>

          <div className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconUserPlus size={16} />
              <span>First admin</span>
            </div>
            <p className="rm-panel-hint">
              This person gets the Country Admin role and can sign in immediately.
            </p>

            <label className="epl-slide-field">
              <span>Full name</span>
              <input
                value={form.adminName}
                onChange={(e) => setField("adminName", e.target.value)}
                placeholder="e.g. Ama Mensah"
                required
              />
            </label>

            <label className="epl-slide-field">
              <span>Work email</span>
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => setField("adminEmail", e.target.value)}
                placeholder="admin@example.gov"
                required
              />
            </label>

            <label className="epl-slide-field">
              <span>Temporary password</span>
              <input
                type="password"
                value={form.adminPassword}
                onChange={(e) => setField("adminPassword", e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
