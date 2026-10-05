"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconKey, IconLoader2, IconCheck } from "@tabler/icons-react";
import { passwordConfirmationError } from "@epl-fellows-platform/auth/account-policy";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/account-settings";

export function ChangePasswordForm({ onChanged }: { onChanged?: () => Promise<void> }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const validation = passwordConfirmationError(newPassword, confirmation);
    if (validation) { setError(validation); return; }
    setPending(true);
    setError(null);
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (result.error) {
        setError(authErrorMessage(result.error, "Could not change password"));
        if (result.error.status === 401) router.replace("/login");
        return;
      }
      setCurrentPassword(""); setNewPassword(""); setConfirmation("");
      await authClient.getSession({ query: { disableCookieCache: true } });
      await onChanged?.();
      toast.success("Password updated. Other devices have been signed out.");
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="rm-panel-form">
      <label className="epl-slide-field"><span>Current password</span>
        <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required disabled={pending} />
      </label>
      <div className="rm-panel-row">
        <label className="epl-slide-field"><span>New password</span>
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required disabled={pending} aria-describedby="password-hint" />
        </label>
        <label className="epl-slide-field"><span>Confirm new password</span>
          <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required disabled={pending} />
        </label>
      </div>
      <p id="password-hint" className="rm-panel-hint">Use 8–128 characters. Changing your password signs out all other devices.</p>
      {error && <p role="alert" className="rm-state-error">{error}</p>}
      <button type="submit" className="rm-primary" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}Update password
      </button>
    </form>
  );
}

export function ChangePasswordSection({ onChanged }: { onChanged?: () => Promise<void> }) {
  return (
    <section className="rm-panel-section st-profile-card">
      <div className="rm-panel-section-head"><IconKey size={16} /><span>Change password</span></div>
      <ChangePasswordForm onChanged={onChanged} />
    </section>
  );
}
