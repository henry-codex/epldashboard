"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { profileNameSchema, passwordConfirmationError } from "@epl-fellows-platform/auth/account-policy";
import { invitationRoleLabels, invitationTokenSchema } from "@epl-fellows-platform/auth/invitation-policy";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/account-settings";
import { acceptInvitation, previewInvitation, InvitationRequestError, type InvitationPreview } from "@/lib/invitations-client";
import { queryClient } from "@/utils/trpc";
import { finishMfaSignIn, mfaPath } from "@/lib/mfa";
import { AuthShell } from "./auth-shell";
import { PasskeySignIn } from "./passkey-sign-in";

export function AcceptInvitation({ token }: { token: string | null }) {
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  useEffect(() => {
    if (!invitationTokenSchema.safeParse(token).success) {
      setLoading(false); setError("This invitation link is missing or invalid. Ask your administrator for a new invitation."); return;
    }
    const controller = new AbortController();
    setLoading(true); setError(null); setRetryable(false);
    previewInvitation(token!, controller.signal).then((data) => {
      setPreview(data); setName(data.name);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setPreview(null);
      setError(cause instanceof InvitationRequestError ? cause.message : "Could not reach the server. Please try again.");
      setRetryable(!(cause instanceof InvitationRequestError) || cause.status >= 500 || cause.status === 429);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, attempt]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault(); if (!preview || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await authClient.signIn.email({ email: preview.email, password: signInPassword });
      if (result.error) { setError(authErrorMessage(result.error, "Could not sign in. Check your password.")); return; }
      setSignInPassword(""); queryClient.clear();
      if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
        router.push(mfaPath("verify", "/accept-invitation?token=" + token) as never); return;
      }
      await refetch();
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setBusy(false); }
  }
  async function switchAccount() {
    setBusy(true); setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) { setError(authErrorMessage(result.error, "Could not sign out. Please try again.")); return; }
      queryClient.clear(); await refetch();
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setBusy(false); }
  }
  async function accept(event: React.FormEvent) {
    event.preventDefault(); if (!preview || !token || busy) return;
    setError(null);
    if (!preview.requiresSignIn) {
      const validName = profileNameSchema.safeParse(name);
      const passwordError = passwordConfirmationError(password, confirmation);
      if (!validName.success || passwordError) {
        setError(!validName.success ? validName.error.issues[0]?.message ?? "Check your name." : passwordError); return;
      }
    }
    setBusy(true);
    try {
      const result = await acceptInvitation({ token, ...(!preview.requiresSignIn ? { name: name.trim(), password } : {}) });
      setPassword(""); setConfirmation(""); queryClient.clear();
      if (result.existingAccount) {
        await authClient.getSession({ query: { disableCookieCache: true } }); await refetch();
        const destination = await finishMfaSignIn();
        toast.success(destination.startsWith("/mfa/") ? "Invitation accepted. Set up MFA to continue." : "Invitation accepted. Your hub access is ready."); router.replace(destination as never);
      } else {
        toast.success("Your account is ready. Sign in with your new password."); router.replace("/login");
      }
    } catch (cause) {
      setError(cause instanceof InvitationRequestError ? cause.message : "Could not reach the server. Please try again.");
      if (cause instanceof InvitationRequestError && cause.status === 401) await refetch();
    } finally { setBusy(false); }
  }
  const wrongAccount = Boolean(session?.user && preview && session.user.email.toLowerCase() !== preview.email);
  return <AuthShell><main className="gc account-recovery invitation-accept">
    <div><p className="rm-kicker">Emerging Public Leaders</p><h1>Accept your invitation</h1></div>
    {(loading || isPending) && <p role="status">Loading invitation…</p>}
    {error && <p role="alert" className="rm-state-error">{error}</p>}
    {!loading && retryable && !preview && <button type="button" className="rm-ghost" onClick={() => setAttempt((value) => value + 1)}>Try again</button>}
    {!loading && !isPending && preview && <>
      <div><p>You are invited to <strong>{preview.tenantName}</strong> as <strong>{invitationRoleLabels[preview.role]}</strong>.</p>
        <p>{preview.email}</p><p>Expires {preview.expiresAt.toLocaleString()}.</p></div>
      {wrongAccount ? <div><p>You are signed in as {session?.user.email}. Switch to the invited account to continue.</p><button type="button" className="rm-primary" disabled={busy} onClick={() => { void switchAccount(); }}>Switch account</button></div>
        : preview.requiresSignIn && !session?.user ? <form className="rm-panel-form" onSubmit={signIn}>
          <p>Sign in with your existing EPL password. Your profile and password will stay the same.</p>
          <label className="epl-slide-field"><span>Email</span><input type="email" value={preview.email} readOnly autoComplete="username" /></label>
          <label className="epl-slide-field"><span>Password</span><input type="password" required autoComplete="current-password" value={signInPassword} onChange={(event) => setSignInPassword(event.target.value)} /></label>
          <button type="submit" className="rm-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in to accept"}</button>
          <PasskeySignIn returnTo={"/accept-invitation?token=" + token} disabled={busy} onBusyChange={setBusy} />
          <Link href="/forgot-password">Forgot password?</Link>
        </form> : <form className="rm-panel-form" onSubmit={accept}>
          {!preview.requiresSignIn && <>
            <label className="epl-slide-field"><span>Full name</span><input required maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="epl-slide-field"><span>New password</span><input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <label className="epl-slide-field"><span>Confirm password</span><input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
            <p>Use 8–128 characters. You will sign in after creating your account.</p>
          </>}
          <button type="submit" className="rm-primary" disabled={busy}>{busy ? "Accepting…" : "Accept invitation"}</button>
        </form>}
    </>}
    <Link href="/login">Back to sign in</Link>
  </main></AuthShell>;
}
