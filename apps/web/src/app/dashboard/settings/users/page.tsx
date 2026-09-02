"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";
import { SlidePanel } from "@/components/epl/slide-panel";
import { useHomePath } from "@/hooks/use-home-path";
import {
  IconUsers,
  IconUserPlus,
  IconShieldLock,
  IconLoader2,
  IconCheck,
  IconSearch,
  IconWorld,
} from "@tabler/icons-react";

const ALL_ROLE_OPTIONS = [
  { value: "country_admin", label: "Country Admin", hint: "Full access within one country hub" },
  { value: "tenant_admin", label: "Tenant Admin", hint: "Manage programs and fellows in hub" },
  { value: "super_admin", label: "Super Admin", hint: "Platform-wide access" },
  { value: "alumni_exec", label: "Alumni Exec", hint: "Alumni network tools" },
  { value: "viewer", label: "Viewer", hint: "Read-only dashboards" },
] as const;

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ALL_ROLE_OPTIONS.map((r) => [r.value, r.label]),
);

const EMPTY = {
  name: "",
  email: "",
  password: "",
  role: "country_admin" as (typeof ALL_ROLE_OPTIONS)[number]["value"],
  tenantId: "",
};

export default function UsersSettingsPage() {
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const home = useHomePath();
  const isPlatformAdmin = home.role === "super_admin";

  const roleOptions = useMemo(
    () =>
      isPlatformAdmin
        ? ALL_ROLE_OPTIONS
        : ALL_ROLE_OPTIONS.filter((r) => r.value !== "super_admin"),
    [isPlatformAdmin],
  );

  const tenantsQuery = useQuery(trpc.tenants.list.queryOptions());
  const usersQuery = useQuery(trpc.users.list.queryOptions());

  const countryOptions = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data]);

  const resetAndClose = useCallback(() => {
    setForm(EMPTY);
    setPanelOpen(false);
  }, []);

  function openPanel() {
    setForm({
      ...EMPTY,
      tenantId: isPlatformAdmin ? "" : (home.tenant?.id ?? ""),
    });
    setPanelOpen(true);
  }

  const createMutation = useMutation(
    trpc.users.create.mutationOptions({
      onSuccess: (created) => {
        toast.success(`${created.name} can log in with ${created.email}`);
        void queryClient.invalidateQueries({ queryKey: trpc.users.list.queryKey() });
        resetAndClose();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const users = useMemo(() => {
    const rows = usersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.tenantName.toLowerCase().includes(q) ||
        (ROLE_LABEL[u.role] ?? u.role).toLowerCase().includes(q),
    );
  }, [usersQuery.data, search]);

  const isEmpty = !usersQuery.isLoading && !usersQuery.isError && (usersQuery.data?.length ?? 0) === 0;

  function setField<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const tenantId = isPlatformAdmin ? form.tenantId : (home.tenant?.id ?? form.tenantId);
    if (!form.name.trim() || !form.email.trim() || !form.password || !tenantId) {
      toast.error("Name, email, password, and country are required");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      tenantId,
    });
  }

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={resetAndClose} disabled={createMutation.isPending}>
        Cancel
      </button>
      <button
        type="submit"
        form="create-user-form"
        className="rm-primary"
        disabled={createMutation.isPending || (isPlatformAdmin && countryOptions.length === 0)}
      >
        {createMutation.isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        Create account
      </button>
    </div>
  );

  return (
    <div className="rm-page">
      <header className="rm-header">
        <div>
          <p className="rm-kicker">Settings · Access</p>
          <h1 className="rm-title">Users & roles</h1>
          <p className="rm-sub">
            Provision logins, assign a country hub, and set roles. Accounts can sign in immediately.
          </p>
        </div>
        <div className="rm-header-actions">
          <div className="rm-search">
            <IconSearch size={15} />
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="rm-primary" onClick={openPanel}>
            <IconUserPlus size={16} />
            Add user
          </button>
        </div>
      </header>

      <section className="rm-list">
        <div className="rm-list-label">
          Active administrators
          <span>{usersQuery.isFetching ? "Syncing…" : `${users.length}`}</span>
        </div>

        {usersQuery.isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading users…
          </div>
        )}

        {usersQuery.isError && (
          <div className="rm-state rm-state-error">
            Could not load users: {usersQuery.error.message}
          </div>
        )}

        {isEmpty && (
          <div className="rm-empty">
            <div className="rm-empty-icon">
              <IconUsers size={28} />
            </div>
            <h3>No users yet</h3>
            <p>
              {isPlatformAdmin && countryOptions.length === 0
                ? "Create a regional hub first, then add a country admin here."
                : "Add teammates under this hub — they’ll get a real login immediately."}
            </p>
            {isPlatformAdmin && countryOptions.length === 0 ? (
              <Link href={"/dashboard/settings/countries" as never} className="rm-primary">
                <IconWorld size={16} /> Go to Regional Hubs
              </Link>
            ) : (
              <button type="button" className="rm-primary" onClick={openPanel}>
                <IconUserPlus size={16} /> Add first user
              </button>
            )}
          </div>
        )}

        <div className="st-user-list">
          {users.map((u) => (
            <article key={u.id} className="st-user-row">
              <div className="st-user-identity">
                <div className="st-user-avatar">
                  {u.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3>{u.name}</h3>
                  <p>{u.email}</p>
                </div>
              </div>
              <div className="st-user-hub">
                <span className="st-user-hub-label">Hub</span>
                <strong>
                  {u.tenantName}
                  {u.countryCode ? ` · ${u.countryCode}` : ""}
                </strong>
              </div>
              <span className="rm-pill">
                <IconShieldLock size={12} />
                {ROLE_LABEL[u.role] ?? u.role}
              </span>
              <span className="rm-pill">
                <i style={{ background: "#2EC27E" }} />
                Active
              </span>
            </article>
          ))}
        </div>
      </section>

      <SlidePanel
        open={panelOpen}
        onClose={resetAndClose}
        title="Add user"
        description="Creates a Better Auth login and assigns a role on a country hub."
        footer={footer}
        width={520}
      >
        <form id="create-user-form" className="rm-panel-form" onSubmit={handleCreate}>
          <div className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconUserPlus size={16} />
              <span>Account</span>
            </div>

            <label className="epl-slide-field">
              <span>Full name</span>
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Ama Mensah"
                required
                autoFocus
              />
            </label>

            <label className="epl-slide-field">
              <span>Work email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="admin@example.gov"
                required
              />
            </label>

            <label className="epl-slide-field">
              <span>Temporary password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="rm-panel-section">
            <div className="rm-panel-section-head">
              <IconShieldLock size={16} />
              <span>Access</span>
            </div>

            <label className="epl-slide-field">
              <span>Role</span>
              <select
                value={form.role}
                onChange={(e) => setField("role", e.target.value as typeof form.role)}
                className="st-select"
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="rm-panel-hint">
                {roleOptions.find((r) => r.value === form.role)?.hint}
              </p>
            </label>

            <label className="epl-slide-field">
              <span>Country hub</span>
              {isPlatformAdmin ? (
                <select
                  value={form.tenantId}
                  onChange={(e) => setField("tenantId", e.target.value)}
                  required
                  className="st-select"
                  disabled={countryOptions.length === 0}
                >
                  <option value="">
                    {countryOptions.length === 0 ? "No hubs yet…" : "Select hub…"}
                  </option>
                  {countryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.flag ? `${c.flag} ` : ""}
                      {c.name} ({c.countryCode})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rm-autofill has-value">
                  {home.tenant
                    ? `${home.tenant.flag ? `${home.tenant.flag} ` : ""}${home.tenant.name} (${home.tenant.countryCode})`
                    : "Your country hub"}
                </div>
              )}
              {isPlatformAdmin && countryOptions.length === 0 && (
                <p className="rm-panel-hint" style={{ color: "#E8A020" }}>
                  Create a hub under Regional Hubs first.
                </p>
              )}
            </label>
          </div>
        </form>
      </SlidePanel>
    </div>
  );
}
