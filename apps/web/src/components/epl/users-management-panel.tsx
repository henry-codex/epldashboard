"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { inviteInputSchema, invitationRoleLabels, type InvitationRole } from "@epl-fellows-platform/auth/invitation-policy";
import { queryClient, trpc } from "@/utils/trpc";
import { useHomePath } from "@/hooks/use-home-path";
import { authClient } from "@/lib/auth-client";
import { SlidePanel } from "./slide-panel";
import { useConfirm } from "./confirm-dialog";

type Props = { tenantId?: string; hubName?: string };
type Member = { id: string; userId: string; name: string; email: string; role: string; tenantId: string; tenantName: string };
const dateText = (value: Date | string) => new Date(value).toLocaleString();
const roleLabel = (role: string) => invitationRoleLabels[role as InvitationRole] ?? role;
const EMPTY = { name: "", email: "", role: "country_admin" as InvitationRole, tenantId: "" };

export function UsersManagementPanel({ tenantId, hubName }: Props) {
  const home = useHomePath();
  const { data: session } = authClient.useSession();
  const confirm = useConfirm();
  const [view, setView] = useState<"members" | "invitations">("members");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [role, setRole] = useState<InvitationRole>("viewer");
  const [now, setNow] = useState(Date.now);
  const [destination, setDestination] = useState("");
  const canInvite = home.capabilities.inviteCountryAdmins;
  const optionsQuery = useQuery(trpc.users.invitationOptions.queryOptions(undefined, { enabled: canInvite }));
  const roles = optionsQuery.data?.map(option => option.role) ?? [];
  const canManage = home.capabilities.manageMemberships;
  const usersQuery = useQuery(trpc.users.list.queryOptions(undefined, { enabled: canInvite }));
  const invitesQuery = useQuery(trpc.users.listInvitations.queryOptions(undefined, { enabled: canInvite }));
  const hubsQuery = useQuery(trpc.tenants.list.queryOptions(undefined, { enabled: canInvite }));
  useEffect(() => {
    if (view !== "invitations") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [view]);
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.users.list.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.users.listInvitations.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.tenants.list.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.users.invitationOptions.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.privateData.queryKey() }),
    ]);
  }
  function failed(value: { message: string }) { setError(value.message); }
  function sent(value: { deliveryStatus: string }) {
    if (value.deliveryStatus === "sent") toast.success("Invitation email accepted by the mail server.");
    else toast.error("Invitation saved, but email sending could not be confirmed. Use Resend to try again.");
    setView("invitations");
    void refresh();
  }
  const invite = useMutation(trpc.users.invite.mutationOptions({
    onSuccess: (value) => { sent(value); setOpen(false); setForm(EMPTY); }, onError: failed,
  }));
  const resend = useMutation(trpc.users.resendInvitation.mutationOptions({ onSuccess: sent, onError: failed }));
  const cancel = useMutation(trpc.users.cancelInvitation.mutationOptions({
    onSuccess: () => { toast.success("Invitation cancelled."); void refresh(); }, onError: failed,
  }));
  const update = useMutation(trpc.users.updateRole.mutationOptions({
    onSuccess: () => { toast.success("Role updated. Existing sessions were signed out."); setSelected(null); void refresh(); }, onError: failed,
  }));
  const remove = useMutation(trpc.users.removeMembership.mutationOptions({
    onSuccess: () => { toast.success("Hub access removed. Existing sessions were signed out."); void refresh(); }, onError: failed,
  }));
  const busy = invite.isPending || resend.isPending || cancel.isPending || update.isPending || remove.isPending;
  function openInvite() {
    setError(null);
    setForm({ ...EMPTY, tenantId: tenantId ?? home.tenant?.id ?? "", role: roles[0] === "super_admin" ? "country_admin" : roles[0] ?? "country_admin" });
    setOpen(true);
  }
  function submitInvite(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    const parsed = inviteInputSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the invitation details."); return; }
    invite.mutate(parsed.data);
  }
  async function removeMember(member: Member) {
    if (!await confirm({ title: "Remove hub access?", message: `Remove ${member.name}'s access to ${member.tenantName}? Their account and other memberships remain. All their current sessions will be signed out.`, confirmLabel: "Remove access", danger: true })) return;
    setError(null); remove.mutate({ id: member.id });
  }
  async function cancelInvite(id: string, email: string) {
    if (!await confirm({ title: "Cancel invitation?", message: `The invitation sent to ${email} will stop working.`, confirmLabel: "Cancel invitation", danger: true })) return;
    setError(null); cancel.mutate({ id });
  }
  const query = search.trim().toLowerCase();
  const matches = (row: { name: string; email: string; tenantName: string; role: string }) =>
    [row.name, row.email, row.tenantName, roleLabel(row.role)].some((value) => value.toLowerCase().includes(query));
  const members = (usersQuery.data ?? []).filter((row) => (!tenantId || row.tenantId === tenantId) && matches(row));
  const invitations = (invitesQuery.data ?? []).filter((row) => (!tenantId || row.tenantId === tenantId) && matches(row));
  const activeQuery = view === "members" ? usersQuery : invitesQuery;
  if (home.isLoading) return <p role="status">Loading user access…</p>;
  if (!canInvite) return <p role="alert">Your account cannot manage users.</p>;

  return <div className="rm-page access-management">
    <header className="rm-header">
      <div><p className="rm-kicker">Settings · Access</p><h1 className="rm-title">{hubName ? "Country managers" : "Users & invitations"}</h1>
        <p className="rm-sub">{hubName ? `Manage invitations for ${hubName}.` : "Invite people to EPL and manage their assigned access."} Each new user chooses their own password.</p></div>
      <button type="button" className="rm-primary" onClick={openInvite}>Invite user</button>
    </header>
    <div className="account-actions" role="group" aria-label="User management views">
      <button type="button" className="rm-ghost" aria-pressed={view === "members"} onClick={() => setView("members")}>Members</button>
      <button type="button" className="rm-ghost" aria-pressed={view === "invitations"} onClick={() => setView("invitations")}>Invitations</button>
      <button type="button" className="rm-ghost" disabled={activeQuery.isFetching} onClick={() => { void refresh(); }}>Refresh</button>
    </div>
    <label className="epl-slide-field"><span>Search {view}</span><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" /></label>
    {error && !open && !selected && <p role="alert" className="rm-state-error">{error}</p>}
    {activeQuery.isLoading && <p role="status">Loading {view}…</p>}
    {activeQuery.isError && <p role="alert" className="rm-state-error">{activeQuery.error.message} Use Refresh to try again.</p>}
    {!activeQuery.isLoading && !activeQuery.isError && view === "members" && <div className="access-records">
      {members.length === 0 && <p>No matching members. Invite a user to get started.</p>}
      {members.map((member) => <article key={member.id} className="gc access-record">
        <div><h2>{member.name}</h2><p>{member.email}</p><p>{member.tenantName} · {roleLabel(member.role)}</p></div>
        {canManage && <div className="account-actions">
          <button type="button" className="rm-ghost" disabled={busy || member.userId === session?.user.id}
            onClick={() => { setError(null); setDestination(""); setSelected(member); setRole(roles.includes(member.role as InvitationRole) ? member.role as InvitationRole : "viewer"); }}>Change role</button>
          <button type="button" className="rm-ghost nm-danger-action" disabled={busy || member.userId === session?.user.id}
            onClick={() => { void removeMember(member); }}>Remove access</button>
        </div>}
      </article>)}
    </div>}
    {!activeQuery.isLoading && !activeQuery.isError && view === "invitations" && <div className="access-records">
      {invitations.length === 0 && <p>No matching invitations.</p>}
      {invitations.map((invitation) => {
        const expired = invitation.status === "pending" && new Date(invitation.expiresAt).getTime() <= now;
        const status = expired ? "expired" : invitation.status;
        const seconds = Math.max(0, Math.ceil((new Date(invitation.resendAvailableAt).getTime() - now) / 1000));
        const pending = status === "pending" || status === "expired";
        return <article key={invitation.id} className="gc access-record">
          <div><h2>{invitation.name}</h2><p>{invitation.email}</p><p>{invitation.tenantName} · {roleLabel(invitation.role)}</p>
            <p>Status: {status} · Expires: {dateText(invitation.expiresAt)}</p>
            <p>Email: {invitation.deliveryStatus === "sent" ? "Accepted by mail server" : invitation.deliveryStatus === "failed" ? "Sending failed — resend to retry" : "Sending not yet confirmed"}</p>
          </div>
          {pending && <div className="account-actions">
            <button type="button" className="rm-ghost" disabled={busy || seconds > 0} onClick={() => { setError(null); resend.mutate({ id: invitation.id }); }}>{seconds > 0 ? `Resend in ${seconds}s` : "Resend email"}</button>
            <button type="button" className="rm-ghost" disabled={busy} onClick={() => { void cancelInvite(invitation.id, invitation.email); }}>Cancel invitation</button>
          </div>}
        </article>;
      })}
    </div>}
    <SlidePanel open={open} onClose={() => { if (!busy) setOpen(false); }} title="Invite user" description="The recipient receives a link that expires in 48 hours." width={520}
      footer={<div className="epl-slide-actions"><button type="button" className="rm-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button><button type="submit" form="invite-user-form" className="rm-primary" disabled={busy || optionsQuery.isLoading || optionsQuery.isError || !form.tenantId}>{invite.isPending ? "Sending…" : "Send invitation"}</button></div>}>
      <form id="invite-user-form" className="rm-panel-form" onSubmit={submitInvite}>
        {error && <p role="alert" className="rm-state-error">{error}</p>}
        <label className="epl-slide-field"><span>Full name</span><input required maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus /></label>
        <label className="epl-slide-field"><span>Email</span><input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label className="epl-slide-field"><span>Role</span><select value={form.role} onChange={(event) => {
          const nextRole = event.target.value as InvitationRole;
          const choices = optionsQuery.data?.find(option => option.role === nextRole)?.workspaces ?? [];
          setForm({ ...form, role: nextRole, tenantId: nextRole === "tenant_admin" ? choices[0]?.id ?? "" : choices.some(h => h.id === (tenantId ?? form.tenantId) && h.kind === "country") ? tenantId ?? form.tenantId : "" });
        }}>{roles.map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}</select></label>
        <label className="epl-slide-field"><span>Workspace</span><select required disabled={form.role === "tenant_admin" || Boolean(tenantId) || !home.capabilities.platformView} value={form.tenantId} onChange={(event) => setForm({ ...form, tenantId: event.target.value })}><option value="">Select a hub</option>{(optionsQuery.data?.find(option => option.role === form.role)?.workspaces ?? []).filter(hub => form.role === "tenant_admin" || !tenantId || hub.id === tenantId).map(hub => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label>
        {(hubsQuery.isError || optionsQuery.isError) && <p role="alert">Could not load hubs. Close this form and use Refresh to try again.</p>}
      </form>
    </SlidePanel>
    <SlidePanel open={Boolean(selected)} onClose={() => { if (!busy) setSelected(null); }} title="Change role" description={selected ? `${selected.name} · ${selected.tenantName}` : undefined} width={480}
      footer={<div className="epl-slide-actions"><button type="button" className="rm-ghost" disabled={busy} onClick={() => setSelected(null)}>Cancel</button><button type="submit" form="change-member-role" className="rm-primary" disabled={busy || role === selected?.role}>Save role</button></div>}>
      <form id="change-member-role" className="rm-panel-form" onSubmit={(event) => { event.preventDefault(); if (selected) { setError(null); update.mutate({ id: selected.id, role, ...(destination && selected.role === "tenant_admin" && role !== "tenant_admin" && role !== "super_admin" ? { tenantId: destination } : {}) }); } }}>
        {error && <p role="alert" className="rm-state-error">{error}</p>}
        <label className="epl-slide-field"><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value as InvitationRole)}>{roles.map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}</select></label>
        {role === "tenant_admin" && <p className="rm-panel-hint">Workspace: EPL Global Platform. This role manages operations across country hubs.</p>}
        {selected?.role === "tenant_admin" && role !== "tenant_admin" && role !== "super_admin" && <label className="epl-slide-field"><span>Destination country hub</span><select required value={destination} onChange={event => setDestination(event.target.value)}><option value="">Select a country hub</option>{(hubsQuery.data ?? []).filter(hub => hub.isActive).map(hub => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label>}
        <p className="rm-panel-hint">Saving a different role signs out this user on all devices.</p>
      </form>
    </SlidePanel>
  </div>;
}
