"use client";
import { useEffect, useState } from "react";
import type { MfaMethod, MfaStatus } from "@epl-fellows-platform/auth/mfa-policy";
import { authClient } from "@/lib/auth-client";
import { mfaError } from "@/lib/mfa";
import { BackupCodes, MfaCodeForm } from "./mfa-shared";
import { PasskeySignIn, passkeyError, supportsPasskeys } from "./passkey-sign-in";

const networkError = "Could not reach the server. Please try again.";
export const methodLabels: Record<MfaMethod, string> = { authenticator: "Authenticator app", passkey: "Passkey", email: "Email code", backup: "Backup code" };
type SendResult = { sent: boolean; destination: string; retryAfter: number; message?: string; backupCodes?: string[] };
type ChallengeStatus = { available: boolean; authenticated: boolean; permittedMethods?: MfaMethod[]; destination?: string | null; retryAfter?: number };
function useCountdown(initial = 0) {
  const [until, setUntil] = useState(() => Date.now() + initial * 1000);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  return [Math.max(0, Math.ceil((until - now) / 1000)), (seconds: number) => { setNow(Date.now()); setUntil(Date.now() + seconds * 1000); }] as const;
}
export function EmailCodeForm({ onVerified, enrollment = false, saved = false, initial, onCancel, cancelLabel = "Cancel" }: {
  onVerified: () => Promise<void>; enrollment?: boolean; saved?: boolean; initial?: Partial<SendResult>; onCancel?: () => void; cancelLabel?: string;
}) {
  const [code, setCode] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(initial?.sent ?? false), [destination, setDestination] = useState(initial?.destination ?? "your account email");
  const [remaining, resetCountdown] = useCountdown(initial?.retryAfter);
  async function send() {
    setBusy(true); setError(null);
    try {
      const result = await authClient.$fetch<SendResult>("/two-factor/send-otp", { method: "POST", body: { purpose: enrollment ? "enrollment" : "login" } });
      if (result.error) { setError(mfaError(result.error, "Could not request a code.")); const retry = (result.error as { retryAfter?: number }).retryAfter; if (retry) resetCountdown(retry); return; }
      if (result.data) {
        resetCountdown(result.data.retryAfter); setDestination(result.data.destination); setCode(""); setSent(result.data.sent);
        if (!result.data.sent) setError(result.data.message ?? "The email server could not accept your code. Try again shortly.");
      }
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await authClient.$fetch("/two-factor/verify-otp", { method: "POST", body: { code: code.trim(), purpose: enrollment ? "enrollment" : "login", backupCodesSaved: enrollment && saved } });
      setCode("");
      if (result.error) { setError(mfaError(result.error, "Could not verify the email code.")); return; }
      await onVerified();
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
  return <div className="mfa-form">
    <p>{sent ? "The email server accepted a code for " : "Send a verification code to "}<strong>{destination}</strong>. Codes expire in five minutes.</p>
    <button type="button" className="rm-ghost" disabled={busy || remaining > 0} onClick={() => { void send(); }}>{remaining ? "Resend in " + remaining + "s" : sent ? "Resend email code" : "Send email code"}</button>
    <form className="rm-panel-form" onSubmit={verify}>
      <label className="epl-slide-field"><span>Email code</span><input aria-label="Email code" required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value)} disabled={busy} aria-invalid={Boolean(error)} /></label>
      <button type="submit" className="rm-primary" disabled={busy || (enrollment && !saved)}>{busy ? "Verifying…" : enrollment ? "Enable email codes" : "Verify email code"}</button>
    </form>
    {error && <p className="rm-state-error" role="alert">{error}</p>}
    {enrollment && onCancel && <button className="rm-ghost" type="button" disabled={busy} onClick={onCancel}>{cancelLabel}</button>}
  </div>;
}
export function MethodVerifier({ onVerified, returnTo }: { onVerified: () => Promise<void>; returnTo?: string | null }) {
  const [data, setData] = useState<ChallengeStatus | null>(null), [method, setMethod] = useState<MfaMethod | null>(null);
  const [error, setError] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    authClient.$fetch<ChallengeStatus>("/two-factor/challenge-status", { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      if (result.error) setError(mfaError(result.error, "Could not load verification methods."));
      else { setData(result.data); setMethod(result.data?.permittedMethods?.[0] ?? "authenticator"); setError(null); }
    }).catch(() => { if (!controller.signal.aborted) setError(networkError); });
    return () => controller.abort();
  }, [attempt]);
  if (error) return <div><p className="rm-state-error" role="alert">{error}</p><button type="button" className="rm-ghost" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>;
  if (!data) return <p role="status">Loading verification methods…</p>;
  if (!data.available) return <p role="alert">This verification is missing or expired. Return to sign in.</p>;
  const methods = data.permittedMethods ?? ["authenticator", "backup"];
  if (!methods.length) return <p role="alert">No verification method is available. Return to sign in.</p>;
  return <div className="mfa-form">
    <div className="mfa-method-tabs" aria-label="Verification method">{methods.map((value) => <button key={value} type="button" className="rm-ghost" aria-pressed={method === value} onClick={() => setMethod(value)}>{methodLabels[value]}</button>)}</div>
    {method === "passkey" ? <PasskeySignIn onVerified={onVerified} /> : method === "email" ? <EmailCodeForm key="email" initial={{ destination: data.destination ?? undefined, retryAfter: data.retryAfter }} onVerified={onVerified} />
      : <MfaCodeForm key={method} onVerified={onVerified} returnTo={returnTo} initialBackup={method === "backup"} allowSwitch={false} />}
  </div>;
}
export function MethodEnrollment({ method, onComplete, onCancel, cancelLabel = "Cancel" }: { method: "email" | "passkey"; onComplete: () => Promise<void>; onCancel: () => void; cancelLabel?: string }) {
  const [password, setPassword] = useState(""), [name, setName] = useState("My passkey");
  const [setup, setSetup] = useState<SendResult | { backupCodes: string[] } | null>(null), [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [freshNeeded, setFreshNeeded] = useState(false);
  async function begin(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    if (method === "passkey" && !supportsPasskeys()) { setError("This browser does not support passkeys. Use an up-to-date browser or choose an authenticator app."); return; }
    setBusy(true); setError(null);
    try {
      const result = await authClient.$fetch<SendResult & { backupCodes: string[] }>(method === "email" ? "/two-factor/email-enroll" : "/two-factor/passkey-prepare", { method: "POST", body: { password } });
      setPassword("");
      if (result.error) { setError(mfaError(result.error, "Could not start setup.")); if ("code" in result.error && result.error.code === "MFA_FRESH_VERIFICATION_REQUIRED") setFreshNeeded(true); return; }
      if (result.data) { setSetup(result.data); setSaved(!result.data.backupCodes?.length); if (method === "email" && !result.data.sent) setError(result.data.message ?? "Email submission failed. Retry after the countdown."); }
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
  async function addPasskey() {
    setBusy(true); setError(null);
    try {
      const acknowledgment = await authClient.$fetch("/two-factor/ack-backup-codes", { method: "POST", body: { saved: true } });
      if (acknowledgment.error) { setError(mfaError(acknowledgment.error, "Could not confirm backup codes.")); return; }
      const result = await authClient.passkey.addPasskey({ name: name.trim() });
      if (result.error) { setError(passkeyError(result.error)); return; }
      await onComplete(); setSetup(null);
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
  return <div className="mfa-form mfa-method-enrollment">
    <h2>{method === "email" ? "Set up email codes" : "Add a passkey"}</h2>
    <p>{method === "email" ? "After your password, verify a code sent to your existing account email." : "Use your device PIN or biometrics to sign in. You can add more devices later."}</p>
    {freshNeeded ? <MethodVerifier onVerified={async () => { setFreshNeeded(false); setError(null); }} /> : !setup ? <form className="rm-panel-form" onSubmit={begin}>
      <label className="epl-slide-field"><span>Current password</span><input required type="password" autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button type="submit" className="rm-primary" disabled={busy}>{busy ? "Preparing…" : "Continue setup"}</button>
    </form> : <>
      {Boolean(setup.backupCodes?.length) && <section className="mfa-setup-step"><BackupCodes codes={setup.backupCodes!} /><label className="mfa-ack"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} /> <span>I have saved my backup codes.</span></label></section>}
      {!setup.backupCodes?.length && <p>Your existing unused backup codes still work.</p>}
      {method === "email" ? <EmailCodeForm enrollment saved={saved} initial={setup as SendResult} onVerified={onComplete} onCancel={onCancel} cancelLabel={cancelLabel} /> : <form className="rm-panel-form" onSubmit={(event) => { event.preventDefault(); void addPasskey(); }}>
        <label className="epl-slide-field"><span>Passkey name</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="For example, work laptop" /></label>
        <button className="rm-primary" type="submit" disabled={busy || !saved}>{busy ? "Complete the device prompt…" : "Create passkey"}</button>
      </form>}
    </>}
    {error && <p className="rm-state-error" role="alert">{error}</p>}
    {(!setup || method === "passkey") && <button type="button" className="rm-ghost" disabled={busy} onClick={onCancel}>{cancelLabel}</button>}
  </div>;
}
type KeyInfo = { id: string; name: string | null; createdAt: string | null };
export function PasskeyManagement({ status, onChanged }: { status: MfaStatus; onChanged: () => Promise<void> }) {
  const [keys, setKeys] = useState<KeyInfo[] | null>(null), [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState<{ kind: "rename" | "remove"; key: KeyInfo } | null>(null), [name, setName] = useState(""), [password, setPassword] = useState("");
  const [fresh, setFresh] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    authClient.$fetch<KeyInfo[]>("/passkey/list-user-passkeys", { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      if (result.error) setError(mfaError(result.error, "Could not load passkeys."));
      else { setKeys(result.data); setError(null); }
    }).catch(() => { if (!controller.signal.aborted) setError(networkError); });
    return () => controller.abort();
  }, [attempt]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!action || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await authClient.$fetch(action.kind === "remove" ? "/passkey/delete-passkey" : "/passkey/update-passkey", { method: "POST", body: action.kind === "remove" ? { id: action.key.id, password } : { id: action.key.id, name: name.trim() } });
      setPassword("");
      if (result.error) { setError(mfaError(result.error, "Could not update this passkey.")); if ("code" in result.error && result.error.code === "MFA_FRESH_VERIFICATION_REQUIRED") setFresh(false); return; }
      setAction(null); setAttempt((value) => value + 1); await onChanged();
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
  return <div className="mfa-form">
    <h3>Your passkeys</h3>
    {!keys ? <p role="status">Loading passkeys…</p> : !keys.length ? <p>No passkeys added yet.</p> : <ul className="mfa-passkey-list">{keys.map((key) => <li key={key.id}><div><strong>{key.name || "Passkey"}</strong><p>{key.createdAt ? "Added " + new Date(key.createdAt).toLocaleDateString() : "Added date unavailable"}</p></div><div className="account-actions">
      <button className="rm-ghost" type="button" disabled={busy} onClick={() => { setAction({ kind: "rename", key }); setName(key.name || "Passkey"); setError(null); }}>Rename</button>
      <button className="rm-ghost nm-danger-action" type="button" disabled={busy} onClick={() => { setAction({ kind: "remove", key }); setFresh(status.fresh); setPassword(""); setError(null); }}>Remove passkey</button>
    </div></li>)}</ul>}
    {action && <div className="mfa-setup-step"><h3>{action.kind === "remove" ? "Remove " : "Rename "}{action.key.name || "passkey"}</h3>
      {action.kind === "remove" && <p>This passkey will stop working. Other devices and pending sign-in requests will be signed out.</p>}
      {action.kind === "remove" && keys?.length === 1 && status.enrolledMethods.length === 1 && <p>This is your last method. Removing it turns off MFA and returns your account to password-only sign-in.</p>}
      {action.kind === "remove" && !fresh ? <MethodVerifier onVerified={async () => setFresh(true)} /> : <form className="rm-panel-form" onSubmit={save}>
        {action.kind === "remove" ? <label className="epl-slide-field"><span>Current password</span><input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label> : <label className="epl-slide-field"><span>Passkey name</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>}
        <button className={action.kind === "remove" ? "rm-ghost nm-danger-action" : "rm-primary"} type="submit" disabled={busy}>{busy ? "Saving…" : action.kind === "remove" ? "Confirm removal" : "Save name"}</button>
      </form>}
      <button className="rm-ghost" type="button" disabled={busy} onClick={() => setAction(null)}>Cancel</button>
    </div>}
    {error && <><p className="rm-state-error" role="alert">{error}</p>{!keys && <button className="rm-ghost" type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button>}</>}
  </div>;
}
