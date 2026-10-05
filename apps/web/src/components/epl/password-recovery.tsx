"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { env } from "@epl-fellows-platform/env/web";
import { passwordConfirmationError } from "@epl-fellows-platform/auth/account-policy";
import { AuthShell } from "@/components/epl/auth-shell";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/account-settings";
import { queryClient } from "@/utils/trpc";

export function PasswordRecovery({ token, invalidLink, mode }: { token?: string; invalidLink?: boolean; mode: "request" | "reset" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [linkFailed, setLinkFailed] = useState(Boolean(invalidLink) || (mode === "reset" && !token));
  const [error, setError] = useState<string | null>(null);
  const requesting = mode === "request";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!requesting) {
      const validation = passwordConfirmationError(password, confirmation);
      if (validation) { setError(validation); return; }
    }
    setPending(true); setError(null);
    try {
      const response = requesting
        ? await authClient.requestPasswordReset({ email: email.trim(), redirectTo: new URL("/reset-password", env.NEXT_PUBLIC_APP_URL).toString() })
        : await authClient.resetPassword({ newPassword: password, token });
      if (response.error) {
        if (!requesting && /TOKEN/i.test(response.error.code ?? "")) setLinkFailed(true);
        setError(authErrorMessage(response.error, requesting ? "Could not request a reset link" : "Could not reset password"));
        return;
      }
      if (requesting) { setSubmitted(true); return; }
      setPassword(""); setConfirmation("");
      queryClient.clear();
      await authClient.getSession({ query: { disableCookieCache: true } });
      toast.success("Password reset. Sign in with your new password.");
      router.replace("/login");
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <AuthShell>
      <section className="gc account-recovery">
        <h1>{requesting ? submitted ? "Check your email" : "Forgot your password?" : "Reset your password"}</h1>
        {requesting && submitted ? (
          <div role="status">
            <p>If an account exists for that email address, you will receive a password-reset link. Check your inbox and spam folder.</p>
            <button type="button" className="rm-ghost" onClick={() => { setSubmitted(false); setError(null); }}>Request another link</button>
          </div>
        ) : linkFailed ? (
          <div>
            <p role="alert">This reset link is missing, invalid, expired, or has already been used.</p>
            <Link href="/forgot-password" className="rm-primary">Request a new link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rm-panel-form">
            <p>{requesting ? "Enter your account email address to request a reset link." : "Choose a new password of 8–128 characters. This will sign out all devices."}</p>
            {requesting ? (
              <label className="epl-slide-field"><span>Email address</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={pending} />
              </label>
            ) : (
              <>
                <label className="epl-slide-field"><span>New password</span>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} />
                </label>
                <label className="epl-slide-field"><span>Confirm new password</span>
                  <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} />
                </label>
              </>
            )}
            {error && <p role="alert" className="rm-state-error">{error}</p>}
            <button type="submit" className="rm-primary" disabled={pending}>{pending ? "Please wait…" : requesting ? "Send reset link" : "Reset password"}</button>
          </form>
        )}
        <Link href="/login" className="rm-ghost">Back to sign in</Link>
      </section>
    </AuthShell>
  );
}
