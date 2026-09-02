"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";
import { SlidePanel } from "@/components/epl/slide-panel";
import {
  IconUsers,
  IconUserPlus,
  IconShieldLock,
  IconLoader2,
  IconCheck,
  IconSearch,
  IconEye,
  IconMail,
  IconBuildingCommunity,
  IconCalendar,
} from "@tabler/icons-react";

const COUNTRY_MANAGER_ROLE = "country_admin" as const;

const ROLE_LABEL: Record<string, string> = {
  country_admin: "Country Manager",
  tenant_admin: "Country Manager",
};

type ManagerRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  countryCode: string;
  createdAt: Date | string;
};

const EMPTY = {
  name: "",
  email: "",
  password: "",
};

type Props = {
  tenantId: string;
  hubName: string;
};

export function UsersManagementPanel({ tenantId, hubName }: Props) {
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewUser, setViewUser] = useState<ManagerRow | null>(null);
  const [form, setForm] = useState(EMPTY);

  const usersQuery = useQuery(trpc.users.list.queryOptions());

  const resetAndClose = useCallback(() => {
    setForm(EMPTY);
    setPanelOpen(false);
  }, []);

  function openPanel() {
    setForm(EMPTY);
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
    const rows = (usersQuery.data ?? []).filter((u) => u.tenantId === tenantId) as ManagerRow[];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (ROLE_LABEL[u.role] ?? u.role).toLowerCase().includes(q),
    );
  }, [usersQuery.data, search, tenantId]);

  const isEmpty = !usersQuery.isLoading && !usersQuery.isError && users.length === 0;

  function setField<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Name, email, and password are required");
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
      role: COUNTRY_MANAGER_ROLE,
      tenantId,
    });
  }

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={resetAndClose} disabled={createMutation.isPending}>
        Cancel
      </button>
      <button type="submit" form="create-hub-user-form" className="rm-primary" disabled={createMutation.isPending}>
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
          <h1 className="rm-title">Country managers</h1>
          <p className="rm-sub">
            Add country managers for {hubName}. They can manage hub data and invite other managers.
          </p>
        </div>
        <div className="rm-header-actions">
          <div className="rm-search">
            <IconSearch size={15} />
            <input
              type="text"
              placeholder="Search managers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="rm-primary" onClick={openPanel}>
            <IconUserPlus size={16} />
            Add manager
          </button>
        </div>
      </header>

      <section className="rm-list">
        <div className="rm-list-label">
          Country managers
          <span>{usersQuery.isFetching ? "Syncing…" : `${users.length}`}</span>
        </div>

        {usersQuery.isLoading && (
          <div className="rm-state">
            <IconLoader2 size={18} className="animate-spin" />
            Loading managers…
          </div>
        )}

        {usersQuery.isError && (
          <div className="rm-state rm-state-error">Could not load users: {usersQuery.error.message}</div>
        )}

        {isEmpty && (
          <div className="rm-empty">
            <div className="rm-empty-icon">
              <IconUsers size={28} />
            </div>
            <h3>No managers yet</h3>
            <p>Add country managers for {hubName} — they&apos;ll get a real login immediately.</p>
            <button type="button" className="rm-primary" onClick={openPanel}>
              <IconUserPlus size={16} /> Add first manager
            </button>
          </div>
        )}

        <div className="st-user-list">
          {users.map((u) => (
            <article
              key={u.id}
              className="st-user-row"
              style={{ cursor: "pointer" }}
              onClick={() => setViewUser(u)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setViewUser(u);
                }
              }}
              role="button"
              tabIndex={0}
            >
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
              <span className="rm-pill">
                <IconShieldLock size={12} />
                {ROLE_LABEL[u.role] ?? "Country Manager"}
              </span>
              <span className="rm-pill">
                <i style={{ background: "#2EC27E" }} />
                Active
              </span>
              <button
                type="button"
                className="nm-row-action"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewUser(u);
                }}
              >
                <IconEye size={14} /> View
              </button>
            </article>
          ))}
        </div>
      </section>

      <SlidePanel
        open={panelOpen}
        onClose={resetAndClose}
        title="Add country manager"
        description={`Creates a manager login for ${hubName}.`}
        footer={footer}
        width={520}
      >
        <form id="create-hub-user-form" className="rm-panel-form" onSubmit={handleCreate}>
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

            <div className="epl-slide-field">
              <span>Role</span>
              <div className="rm-autofill has-value">Country Manager</div>
              <p className="rm-panel-hint">Full access to manage this country hub — cohorts, fellows, events, and other managers.</p>
            </div>

            <div className="epl-slide-field">
              <span>Country hub</span>
              <div className="rm-autofill has-value">{hubName}</div>
            </div>
          </div>
        </form>
      </SlidePanel>

      <SlidePanel
        open={Boolean(viewUser)}
        onClose={() => setViewUser(null)}
        title="Manager profile"
        description={viewUser ? viewUser.email : undefined}
        width={480}
        footer={
          <div className="epl-slide-actions">
            <button type="button" className="rm-primary" onClick={() => setViewUser(null)}>
              Close
            </button>
          </div>
        }
      >
        {viewUser && (
          <div className="rm-panel-form">
            <section className="st-profile-hero" style={{ marginBottom: 8 }}>
              <div className="st-profile-avatar-wrap">
                <div className="st-profile-avatar">
                  {viewUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              </div>
              <div className="st-profile-hero-text">
                <div className="st-profile-name-row">
                  <h2>{viewUser.name}</h2>
                  <span className="rm-pill">
                    <IconShieldLock size={12} />
                    {ROLE_LABEL[viewUser.role] ?? "Country Manager"}
                  </span>
                </div>
                <p>{hubName} hub</p>
              </div>
            </section>

            <section className="rm-panel-section st-profile-card">
              <div className="rm-panel-section-head">
                <IconMail size={16} />
                <span>Contact</span>
              </div>
              <div className="epl-slide-field">
                <span>Email</span>
                <div className="rm-autofill has-value st-email-row">
                  <IconMail size={15} />
                  {viewUser.email}
                </div>
              </div>
            </section>

            <section className="rm-panel-section st-profile-card">
              <div className="rm-panel-section-head">
                <IconBuildingCommunity size={16} />
                <span>Access</span>
              </div>
              <div className="st-profile-grid">
                <div className="epl-slide-field">
                  <span>Role</span>
                  <div className="rm-autofill has-value">{ROLE_LABEL[viewUser.role] ?? "Country Manager"}</div>
                </div>
                <div className="epl-slide-field">
                  <span>Country hub</span>
                  <div className="rm-autofill has-value">
                    {viewUser.tenantName}
                    {viewUser.countryCode ? ` · ${viewUser.countryCode}` : ""}
                  </div>
                </div>
                <div className="epl-slide-field">
                  <span>Status</span>
                  <div className="rm-autofill has-value">Active</div>
                </div>
                <div className="epl-slide-field">
                  <span>Added</span>
                  <div className="rm-autofill has-value st-email-row">
                    <IconCalendar size={15} />
                    {new Date(viewUser.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
