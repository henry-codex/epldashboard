"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  IconMail,
  IconShieldLock,
  IconCamera,
  IconUser,
  IconLoader2,
  IconCheck,
} from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { useHomePath } from "@/hooks/use-home-path";
import { ChangePasswordSection } from "@/components/epl/change-password-form";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  tenant_admin: "Tenant Admin",
  country_admin: "Country Manager",
  alumni_exec: "Alumni Exec",
  fellow: "Fellow",
  viewer: "Viewer",
};

type Props = {
  hubName?: string;
};

export function ProfileSettingsPanel({ hubName }: Props) {
  const { data: session, refetch } = authClient.useSession();
  const home = useHomePath();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  const displayName = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "—";
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = ROLE_LABEL[home.role ?? ""] ?? home.role ?? "Member";

  function startEdit() {
    setName(displayName);
    setEditing(true);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setPending(true);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) {
        toast.error(result.error.message ?? "Could not update profile");
        return;
      }
      toast.success("Profile updated");
      setEditing(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rm-page st-profile">
      <header className="rm-header">
        <div>
          <p className="rm-kicker">Settings · Account</p>
          <h1 className="rm-title">My profile</h1>
          <p className="rm-sub">
            {hubName
              ? `Your account for ${hubName} — update your name and password here.`
              : "Your identity and password for this account."}
          </p>
        </div>
      </header>

      <section className="st-profile-hero">
        <div className="st-profile-avatar-wrap">
          <div className="st-profile-avatar">{initial}</div>
          <button type="button" className="st-profile-camera" aria-label="Change photo" disabled title="Coming soon">
            <IconCamera size={14} />
          </button>
        </div>
        <div className="st-profile-hero-text">
          <div className="st-profile-name-row">
            <h2>{displayName}</h2>
            <span className="rm-pill">
              <i style={{ background: "#4150A3" }} />
              {roleLabel}
            </span>
          </div>
          <p>{hubName ? `${hubName} hub account` : "EPL dashboard account"}</p>
        </div>
      </section>

      <section className="rm-panel-section st-profile-card">
        <div className="rm-panel-section-head">
          <IconUser size={16} />
          <span>Identity</span>
        </div>
        {editing ? (
          <form onSubmit={saveProfile} className="rm-panel-form">
            <div className="st-profile-grid">
              <label className="epl-slide-field">
                <span>Full name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </label>
              <div className="epl-slide-field">
                <span>Email address</span>
                <div className="rm-autofill has-value st-email-row">
                  <IconMail size={15} />
                  {email}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="submit" className="rm-primary" disabled={pending}>
                {pending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
                Save profile
              </button>
              <button type="button" className="rm-ghost" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="st-profile-grid">
              <div className="epl-slide-field">
                <span>Full name</span>
                <div className="rm-autofill has-value">{displayName}</div>
              </div>
              <div className="epl-slide-field">
                <span>Email address</span>
                <div className="rm-autofill has-value st-email-row">
                  <IconMail size={15} />
                  {email}
                </div>
              </div>
            </div>
            <button type="button" className="rm-ghost" onClick={startEdit} style={{ marginTop: 8, alignSelf: "flex-start" }}>
              Edit profile
            </button>
          </>
        )}
      </section>

      <section className="rm-panel-section st-profile-card">
        <div className="rm-panel-section-head">
          <IconShieldLock size={16} />
          <span>Role & access</span>
        </div>
        <div className="st-profile-grid">
          <div className="epl-slide-field">
            <span>Current role</span>
            <div className="rm-autofill has-value">{roleLabel}</div>
          </div>
          {hubName && (
            <div className="epl-slide-field">
              <span>Country hub</span>
              <div className="rm-autofill has-value">{hubName}</div>
            </div>
          )}
        </div>
      </section>

      <ChangePasswordSection />
    </div>
  );
}
