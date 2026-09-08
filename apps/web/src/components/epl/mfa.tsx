"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { finishMfaSignIn, loginPath, mfaError, mfaPath } from "@/lib/mfa";
import { queryClient, trpc } from "@/utils/trpc";
import { AuthShell } from "./auth-shell";
import { MfaCodeForm, BackupCodes, MfaStepHeading } from "./mfa-shared";
import { MethodEnrollment, MethodVerifier, PasskeyManagement, methodLabels } from "./mfa-method-controls";
import type { MfaStatus } from "@epl-fellows-platform/auth/mfa-policy";

const networkError = "Could not reach the server. Please try again.";
type Setup = { totpURI: string; backupCodes: string[] };

export { MfaCodeForm } from "./mfa-shared";
export function MfaEnrollment({ onComplete, replace = false, onCancel }: {
  onComplete: () => Promise<void>; replace?: boolean; onCancel?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [saved, setSaved] = useState(false);
  const [fresh, setFresh] = useState(!replace);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function begin(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = replace
        ? await authClient.$fetch<Setup>("/two-factor/replace", { method: "POST", body: { password } })
        : await authClient.twoFactor.enable({ password });
      setPassword("");
      if (result.error) { setError(mfaError(result.error, "Could not start MFA setup.")); if ("code" in result.error && result.error.code === "MFA_FRESH_VERIFICATION_REQUIRED") setFresh(false); return; }
      if (result.data) { setSetup(result.data); setSaved(!result.data.backupCodes.length); }
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
  async function complete() {
    await onComplete();
    setSetup(null); setSaved(false);
  }
  return <div className="mfa-form mfa-enrollment">
    {replace && !setup && <p>Your old authenticator will stop working and other sessions will be signed out. Finish the new setup to restore administrator access.</p>}
    {!fresh ? <MethodVerifier onVerified={async () => { setFresh(true); }} />
      : !setup ? <div className="mfa-start">
        <div className="mfa-start-intro">
          <h2>One more layer of protection</h2>
          <p>Have your authenticator app ready. You’ll connect it to your account, save your backup codes, and verify a six-digit code.</p>
          <p>Confirm your password to begin.</p>
        </div>
        <form className="rm-panel-form" onSubmit={begin}>
          <label className="epl-slide-field"><span>Current password</span><input type="password" required autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="rm-primary" disabled={busy} type="submit">{busy ? "Preparing setup…" : replace ? "Start replacement" : "Set up authenticator"}</button>
        </form>
      </div> : <>
        <h2 className="sr-only">Authenticator setup steps</h2>
        <div className="mfa-enrollment-grid">
          <section className="mfa-setup-step mfa-connect">
            <MfaStepHeading step={1}>Connect your authenticator</MfaStepHeading>
            <p>Scan the QR code with your authenticator app.</p>
            <div className="mfa-qr"><QRCode value={setup.totpURI} size={192} title="EPL authenticator setup QR code" /></div>
            <label className="epl-slide-field mfa-manual-key"><span>Or enter this manual setup key</span><input aria-label="Manual setup key" readOnly value={new URL(setup.totpURI).searchParams.get("secret") ?? ""} onFocus={(event) => event.target.select()} /></label>
            <p className="mfa-account-note">EPL Global Platform · Time-based, six-digit codes</p>
          </section>
          <section className="mfa-setup-step mfa-recovery-step">
            {setup.backupCodes.length ? <BackupCodes codes={setup.backupCodes} step={2} /> : <p>Your existing unused backup codes still work. Keep them somewhere private.</p>}
            <label className={`mfa-ack${saved ? " mfa-ack--saved" : ""}`}><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} /> <span>I have saved my backup codes.</span></label>
          </section>
        </div>
        <section className="mfa-finish">
          <div>
            <MfaStepHeading step={3}>Verify and finish</MfaStepHeading>
            <p>Enter the six-digit code from your app.</p>
          </div>
          <MfaCodeForm enrollment saved={saved} onVerified={complete} />
        </section>
      </>}
    {error && <p role="alert" className="rm-state-error">{error}</p>}
    {onCancel && !setup && <button type="button" className="rm-ghost" disabled={busy} onClick={onCancel}>Cancel</button>}
  </div>;
}

export function MfaSetupSelection({ required, onComplete, onCancel }: { required: boolean; onComplete: () => Promise<void>; onCancel?: () => void }) {
  const [method, setMethod] = useState<"authenticator" | "passkey" | "email">("authenticator");
  return <div className="mfa-form">
    <div className="mfa-method-choices" aria-label="Choose a security method">
      {(["authenticator", "passkey", ...(!required ? ["email"] : [])] as const).map((value) => <button key={value} type="button" className="mfa-method-choice" aria-pressed={method === value} onClick={() => setMethod(value as typeof method)}>
        <strong>{methodLabels[value as keyof typeof methodLabels]}</strong><span>{value === "authenticator" ? "Six-digit codes from your app" : value === "passkey" ? "Your device PIN or biometrics" : "A code after your password"}</span>
      </button>)}
    </div>
    {required && <p>Administrator access requires an authenticator or passkey.</p>}
    {method === "authenticator" ? <MfaEnrollment onComplete={onComplete} onCancel={onCancel} /> : <MethodEnrollment key={method} method={method} onComplete={onComplete} onCancel={() => setMethod("authenticator")} />}
  </div>;
}
export function MfaSecuritySection({ onChanged }: { onChanged?: () => Promise<void> }) {
  const router = useRouter();
  const query = useQuery(trpc.account.mfaStatus.queryOptions());
  const [action, setAction] = useState<"enable" | "replace" | "codes" | "disable" | "email-disable" | "email" | "passkey" | null>(null);
  const [fresh, setFresh] = useState(false), [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const status = query.data;
  const methods = status?.enrolledMethods ?? (status?.enabled ? ["authenticator"] : []);
  async function complete() {
    const destination = await finishMfaSignIn("/dashboard/settings/security");
    setAction(null); setCodes(null); router.replace(destination as never);
    await query.refetch(); await onChanged?.();
  }
  function choose(next: typeof action) { setAction(next); setFresh(Boolean(status?.fresh)); setPassword(""); setCodes(null); setError(null); }
  async function acknowledge() {
    setBusy(true); setError(null);
    try {
      const result = await authClient.$fetch("/two-factor/ack-backup-codes", { method: "POST", body: { saved: true } });
      if (result.error) { setError(mfaError(result.error, "Could not confirm saved codes.")); return; }
      setCodes(null); await query.refetch();
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
  async function manage(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null);
    try {
      if (action === "codes") {
        const result = await authClient.twoFactor.generateBackupCodes({ password });
        if (result.error) { setError(mfaError(result.error, "Could not regenerate backup codes.")); if ("code" in result.error && result.error.code === "MFA_FRESH_VERIFICATION_REQUIRED") setFresh(false); return; }
        setCodes(result.data?.backupCodes ?? null); setAction(null);
      } else {
        const result = action === "email-disable" ? await authClient.$fetch("/two-factor/email-disable", { method: "POST", body: { password } }) : await authClient.twoFactor.disable({ password });
        if (result.error) { setError(mfaError(result.error, "Could not remove this method.")); if ("code" in result.error && result.error.code === "MFA_FRESH_VERIFICATION_REQUIRED") setFresh(false); return; }
        await complete();
      }
    } catch { setError(networkError); }
    finally { setPassword(""); setBusy(false); }
  }
  return <section className="rm-panel-section st-profile-card" aria-labelledby="mfa-heading">
    <h2 id="mfa-heading">Multi-factor authentication</h2>
    {query.isPending ? <p role="status">Loading MFA status…</p> : query.isError ? <><p role="alert">Could not load MFA status.</p><button className="rm-ghost" onClick={() => { void query.refetch(); }}>Try again</button></> : status ? <>
      <p><strong>{status.enabled ? "Enabled" : "Not enabled"}</strong>{status.required ? " · Required for your administrator access." : " · Choose how to protect your account."}</p>
      <div className="mfa-method-summary">{methods.map((method) => <span key={method}>{methodLabels[method as keyof typeof methodLabels]} enabled</span>)}</div>
      {codes ? <><BackupCodes codes={codes} /><button className="rm-primary" disabled={busy} onClick={() => { void acknowledge(); }}>I have saved these codes</button></>
        : action === "enable" ? <MfaSetupSelection required={status.required} onComplete={complete} onCancel={() => choose(null)} />
        : action === "replace" ? <MfaEnrollment replace onComplete={complete} onCancel={() => choose(null)} />
        : action === "email" || action === "passkey" ? <MethodEnrollment method={action} onComplete={complete} onCancel={() => choose(null)} />
        : action ? <div className="mfa-form"><h3>{action === "codes" ? "Regenerate backup codes" : action === "email-disable" ? "Remove email codes" : "Remove authenticator"}</h3>
          <p>{action === "codes" ? "All previous backup codes will stop working." : "This method will stop working. Other devices and pending sign-in requests will be signed out."}</p>
          {!fresh ? <MethodVerifier onVerified={async () => { setFresh(true); }} /> : <form className="rm-panel-form" onSubmit={manage}>
            <label className="epl-slide-field"><span>Current password</span><input type="password" required autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className={action === "codes" ? "rm-primary" : "rm-ghost nm-danger-action"} type="submit" disabled={busy}>{busy ? "Saving…" : action === "codes" ? "Generate new codes" : "Confirm removal"}</button>
          </form>}
          <button className="rm-ghost" disabled={busy} onClick={() => choose(null)}>Cancel</button>
        </div> : <>
          <div className="account-actions">
            <button className="rm-primary" onClick={() => choose(status.enabled ? "passkey" : "enable")}>{status.enabled ? "Add passkey" : "Enable MFA"}</button>
            {status.enabled && !methods.includes("authenticator") && <button className="rm-ghost" onClick={() => choose("enable")}>Add authenticator</button>}
            {!status.required && !methods.includes("email") && <button className="rm-ghost" onClick={() => choose("email")}>Set up email codes</button>}
            {status.enabled && <button className="rm-ghost" onClick={() => choose("codes")}>Regenerate backup codes</button>}
            {methods.includes("authenticator") && <><button className="rm-ghost" onClick={() => choose("replace")}>Replace authenticator</button>{(!status.required || methods.includes("passkey")) && <button className="rm-ghost nm-danger-action" onClick={() => choose("disable")}>Remove authenticator</button>}</>}
            {methods.includes("email") && <button className="rm-ghost nm-danger-action" onClick={() => choose("email-disable")}>Remove email codes</button>}
          </div>
          {methods.includes("passkey") && <PasskeyManagement key={methods.join(",")} status={status as MfaStatus} onChanged={complete} />}
        </>}
      {error && <p role="alert" className="rm-state-error">{error}</p>}
    </> : null}
  </section>;
}

export function MfaPage({ mode, returnTo }: { mode: "setup" | "verify"; returnTo: string | null }) {
  const router = useRouter();
  const { data: identity, isPending } = authClient.useSession();
  const [challengeAuthenticated, setChallengeAuthenticated] = useState(false);
  const status = useQuery({ ...trpc.account.mfaStatus.queryOptions(), enabled: Boolean(identity?.user) && (mode === "setup" || challengeAuthenticated), retry: false });
  const [available, setAvailable] = useState(mode === "setup");
  const [loading, setLoading] = useState(mode === "verify");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (isPending) return;
    if (mode === "setup" && !identity?.user) { router.replace(loginPath(returnTo) as never); return; }
    let cancelled = false;
    if (mode === "verify") {
      setLoading(true);
      authClient.$fetch<{ available: boolean; authenticated: boolean }>("/two-factor/challenge-status").then((result) => {
        if (cancelled) return;
        if (result.error) setError(mfaError(result.error, "Could not load verification."));
        else { setAvailable(Boolean(result.data?.available)); setChallengeAuthenticated(Boolean(result.data?.authenticated)); setError(null); }
      }).catch(() => { if (!cancelled) setError(networkError); }).finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [mode, isPending, identity?.user.id, router, attempt, returnTo]);
  useEffect(() => {
    if (!identity?.user || !status.data || (mode === "verify" && !challengeAuthenticated)) return;
    if (mode === "verify" && status.data.reason === "MFA_ENROLLMENT_REQUIRED") router.replace(mfaPath("setup", returnTo) as never);
    if (mode === "setup" && status.data.enabled && status.data.reason !== "MFA_ENROLLMENT_REQUIRED") {
      router.replace(mfaPath("verify", returnTo) as never);
    }
  }, [identity?.user, status.data, mode, returnTo, router, challengeAuthenticated]);
  async function complete() { router.replace(await finishMfaSignIn(returnTo) as never); }
  async function signOut() {
    const result = await authClient.signOut();
    if (result.error) { setError(mfaError(result.error, "Could not sign out.")); return; }
    queryClient.clear(); router.replace(loginPath(returnTo) as never);
  }
  return <AuthShell wide={mode === "setup"}><main className={`gc account-recovery mfa-page${mode === "setup" ? " mfa-page--setup" : ""}`}>
    <header className="mfa-page-header">
      <div className="mfa-page-icon"><ShieldCheck size={26} aria-hidden="true" /></div>
      <div>
        <p className="rm-kicker">EPL account security</p>
        <h1>{mode === "setup" ? "Choose your account protection" : "Verify your sign-in"}</h1>
        <p>{mode === "setup" ? "Protect your account with an extra step at sign-in. Required for administrator access." : "Choose an available method to complete verification."}</p>
      </div>
    </header>
    {isPending || loading || (mode === "setup" && status.isPending) ? <p role="status">Loading…</p> : mode === "setup" && status.isError ? <><p role="alert">Could not load account security.</p><button className="rm-ghost" type="button" onClick={() => { void status.refetch(); }}>Try again</button></> : mode === "setup" && identity?.user && status.data ? <MfaSetupSelection required={status.data.required} onComplete={complete} />
      : available ? <MethodVerifier onVerified={complete} returnTo={returnTo} /> : <p role="alert">This verification is missing or expired. Return to sign in to start again.</p>}
    {error && <><p role="alert" className="rm-state-error">{error}</p><button className="rm-ghost" onClick={() => setAttempt((value) => value + 1)}>Try again</button></>}
    <footer className="mfa-page-footer">
      <p>Need help? Contact your platform operator if you’ve lost access to all your verification methods and backup codes.</p>
      <button type="button" className="rm-ghost" onClick={() => { void signOut().catch(() => setError(networkError)); }}>Return to sign in</button>
    </footer>
  </main></AuthShell>;
}
