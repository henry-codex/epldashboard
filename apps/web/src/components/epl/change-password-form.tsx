"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconKey, IconLoader2, IconCheck } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Could not change password");
        return;
      }
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rm-panel-form">
      <div className="epl-slide-field">
        <span>Current password</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="rm-panel-row">
        <div className="epl-slide-field">
          <span>New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="epl-slide-field">
          <span>Confirm new password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>
      </div>
      <button type="submit" className="rm-primary" disabled={pending} style={{ alignSelf: "flex-start", marginTop: 4 }}>
        {pending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        Update password
      </button>
    </form>
  );
}

export function ChangePasswordSection() {
  return (
    <section className="rm-panel-section st-profile-card">
      <div className="rm-panel-section-head">
        <IconKey size={16} />
        <span>Change password</span>
      </div>
      <p className="rm-panel-hint" style={{ marginTop: 0, marginBottom: 14 }}>
        Use your current password to set a new one for this account.
      </p>
      <ChangePasswordForm />
    </section>
  );
}
