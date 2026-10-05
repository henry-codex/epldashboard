"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { IconMail, IconShieldLock, IconUser, IconLoader2, IconCheck } from "@tabler/icons-react";
import { profileNameSchema } from "@epl-fellows-platform/auth/account-policy";
import { authClient } from "@/lib/auth-client";
import { useHomePath } from "@/hooks/use-home-path";
import { authErrorMessage, SECURITY_PATH } from "@/lib/account-settings";
import { queryClient, trpc } from "@/utils/trpc";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin", tenant_admin: "Tenant Admin", country_admin: "Country Manager",
  alumni_exec: "Alumni Exec", fellow: "Fellow", viewer: "Viewer",
};

export function ProfileSettingsPanel({ hubName }: { hubName?: string }) {
  const { data: session, refetch } = authClient.useSession();
  const home = useHomePath();
  const router = useRouter();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayName = session?.user?.name ?? "User";
  const roleLabel = ROLE_LABEL[home.role ?? ""] ?? "Member";

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const result = profileNameSchema.safeParse(name);
    if (!result.success) { setError(result.error.issues[0]?.message ?? "Invalid name"); return; }
    setPending(true);
    setError(null);
    try {
      const response = await authClient.updateUser({ name: result.data });
      if (response.error) {
        setError(authErrorMessage(response.error, "Could not update profile"));
        if (response.error.status === 401) router.replace("/login");
        return;
      }
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: trpc.privateData.queryKey() })]);
      setEditing(false);
      toast.success("Profile updated");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally { setPending(false); }
  }

  return (
    <div className="rm-page st-profile">
      <header className="rm-header"><div>
        <p className="rm-kicker">Settings · Account</p>
        <h1 className="rm-title">My profile</h1>
        <p className="rm-sub">Update your name and view your account details.</p>
      </div></header>
      <section className="st-profile-hero">
        <div className="st-profile-avatar-wrap"><div className="st-profile-avatar">{displayName.charAt(0).toUpperCase()}</div></div>
        <div className="st-profile-hero-text">
          <div className="st-profile-name-row"><h2>{displayName}</h2><span className="rm-pill">{roleLabel}</span></div>
          <p>{home.workspace?.kind === "global" ? "EPL Global Platform account" : hubName ? hubName + " hub account" : "EPL dashboard account"}</p>
        </div>
      </section>
      <section className="rm-panel-section st-profile-card">
        <div className="rm-panel-section-head"><IconUser size={16} /><span>Identity</span></div>
        {editing ? (
          <form onSubmit={saveProfile} className="rm-panel-form">
            <label className="epl-slide-field"><span>Full name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="name" autoFocus disabled={pending} aria-describedby={error ? "profile-error" : undefined} aria-invalid={Boolean(error)} />
            </label>
            <p>Email address: {session?.user.email}</p>
            {error && <p id="profile-error" role="alert" className="rm-state-error">{error}</p>}
            <div className="account-actions">
              <button type="submit" className="rm-primary" disabled={pending}>{pending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}Save profile</button>
              <button type="button" className="rm-ghost" onClick={() => { setEditing(false); setError(null); }} disabled={pending}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="st-profile-grid">
              <div className="epl-slide-field"><span>Full name</span><div className="rm-autofill has-value">{displayName}</div></div>
              <div className="epl-slide-field"><span>Email address</span><div className="rm-autofill has-value st-email-row"><IconMail size={15} />{session?.user.email ?? "—"}</div></div>
            </div>
            <button type="button" className="rm-ghost" onClick={() => { setName(displayName); setError(null); setEditing(true); }}>Edit profile</button>
          </>
        )}
      </section>
      <section className="rm-panel-section st-profile-card">
        <div className="rm-panel-section-head"><IconShieldLock size={16} /><span>Role &amp; access</span></div>
        <div className="st-profile-grid">
          <div className="epl-slide-field"><span>Current role</span><div className="rm-autofill has-value">{roleLabel}</div></div>
          <div className="epl-slide-field"><span>Workspace</span><div className="rm-autofill has-value">{home.workspace?.name ?? hubName ?? "No country assigned"}</div></div>
        </div>
        <p className="rm-panel-hint">Your administrator manages your email address and access.</p>
        <Link href={SECURITY_PATH} className="rm-ghost">Password &amp; security</Link>
      </section>
    </div>
  );
}
