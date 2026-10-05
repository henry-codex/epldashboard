"use client";

import { useEffect, useRef, useState } from "react";
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
import { safeMfaReturnPath, type MfaStatus } from "@epl-fellows-platform/auth/mfa-policy";

const networkError = "Could not reach the server. Please try again.";
type Setup = { totpURI: string; backupCodes: string[] };

export { MfaCodeForm } from "./mfa-shared";
export function MfaEnrollment({ onComplete, replace = false, onCancel, cancelLabel = "Cancel" }: {
  onComplete: () => Promise<void>; replace?: boolean; onCancel?: () => void; cancelLabel?: string;
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
    {replace && !setup && <p>Your old authenticator will stop working and other sessions will be signed out. Finish the new setup to enable your replacement authenticator. If this is your only method, MFA stays off until you finish.</p>}
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
          <MfaCodeForm enrollment saved={saved} onVerified={complete} onCancel={onCancel} cancelLabel={cancelLabel} />
        </section>
      </>}
    {error && <p role="alert" className="rm-state-error">{error}</p>}
    {onCancel && !setup && <button type="button" className="rm-ghost" disabled={busy} onClick={onCancel}>{cancelLabel}</button>}
  </div>;
}

export function MfaSetupSelection({ onComplete, onCancel, cancelLabel }: { onComplete: () => Promise<void>; onCancel?: () => void; cancelLabel?: string }) {
  const [method, setMethod] = useState<"authenticator" | "passkey" | "email">("authenticator");
  return <div className="mfa-form">
    <div className="mfa-method-choices" aria-label="Choose a security method">
      {(["authenticator", "passkey", "email"] as const).map((value) => <button key={value} type="button" className="mfa-method-choice" aria-pressed={method === value} onClick={() => setMethod(value)}>
        <strong>{methodLabels[value as keyof typeof methodLabels]}</strong><span>{value === "authenticator" ? "Six-digit codes from your app" : value === "passkey" ? "Your device PIN or biometrics" : "A code after your password"}</span>
      </button>)}
    </div>
    {method === "authenticator" ? <MfaEnrollment onComplete={onComplete} onCancel={onCancel} cancelLabel={cancelLabel} /> : <MethodEnrollment key={method} method={method} onComplete={onComplete} onCancel={onCancel ?? (() => setMethod("authenticator"))} cancelLabel={cancelLabel} />}
  </div>;
}
export function MfaSecuritySection({ onChanged }: { onChanged?: () => Promise<void> }) {
  const router = useRouter();
  const query = useQuery(trpc.account.mfaStatus.queryOptions());
  const [action, setAction] = useState<"enable" | "replace" | "codes" | "disable" | "email-disable" | "email" | "passkey" | null>(null);
  const [forgetOpen, setForgetOpen] = useState(false);
  const forgetButton = useRef<HTMLButtonElement>(null);
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
  async function forgetBrowser() {
    setBusy(true); setError(null);
    try {
      const result = await authClient.$fetch("/two-factor/forget-browser", { method: "POST" });
      if (result.error) { setError(mfaError(result.error, "Could not forget this browser.")); return; }
      await queryClient.cancelQueries(); queryClient.clear();
      authClient.$store.notify("$sessionSignal");
      router.replace("/login");
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
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
      <p><strong>{status.enabled ? "Enabled" : "Not enabled"}</strong> · Optional for every account.</p>
      <p>{status.enabled ? "After verification, this browser is remembered for seven days, including after sign-out. New browsers still require verification." : "Choose an authenticator app, passkey, or email codes when you want extra account protection."}</p>
      {status.enabled && <p>Changing security methods or regenerating backup codes still requires your password and verification within the last five minutes.</p>}
      {status.browserRememberedUntil && <p>This browser is remembered until <time dateTime={status.browserRememberedUntil}>{new Date(status.browserRememberedUntil).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>.</p>}
      {status.enabled && status.verificationExpiresAt && !status.browserRememberedUntil && <p>Next verification: <time dateTime={status.verificationExpiresAt}>{new Date(status.verificationExpiresAt).toLocaleString()}</time>. This browser will be remembered after your next verification.</p>}
      {status.browserRememberedUntil && <>
        <button ref={forgetButton} className="rm-ghost" disabled={busy} aria-expanded={forgetOpen} aria-controls={forgetOpen ? "forget-browser-confirmation" : undefined} onClick={() => setForgetOpen(true)}>Forget this browser and sign out</button>
        {forgetOpen && <div id="forget-browser-confirmation" className="mfa-form" role="group" aria-label="Forget this browser">
          <p>This signs you out and requires MFA when you next sign in here.</p>
          <div className="account-actions"><button className="rm-ghost nm-danger-action" disabled={busy} onClick={() => { void forgetBrowser(); }}>Confirm and sign out</button><button className="rm-ghost" disabled={busy} onClick={() => { setForgetOpen(false); forgetButton.current?.focus(); }}>Cancel</button></div>
        </div>}
      </>}
      <div className="mfa-method-summary">{methods.map((method) => <span key={method}>{methodLabels[method as keyof typeof methodLabels]} enabled</span>)}</div>
      {codes ? <><BackupCodes codes={codes} /><button className="rm-primary" disabled={busy} onClick={() => { void acknowledge(); }}>I have saved these codes</button></>
        : action === "enable" ? <MfaSetupSelection onComplete={complete} onCancel={() => choose(null)} />
        : action === "replace" ? <MfaEnrollment replace onComplete={complete} onCancel={() => { void complete().catch(() => setError(networkError)); }} />
        : action === "email" || action === "passkey" ? <MethodEnrollment method={action} onComplete={complete} onCancel={() => choose(null)} />
        : action ? <div className="mfa-form"><h3>{action === "codes" ? "Regenerate backup codes" : action === "email-disable" ? "Remove email codes" : "Remove authenticator"}</h3>
          <p>{action === "codes" ? "All previous backup codes will stop working." : "This method will stop working. Other devices and pending sign-in requests will be signed out."}</p>
          {action !== "codes" && methods.length === 1 && <p>This is your last method. Removing it turns off MFA and returns your account to password-only sign-in.</p>}
          {!fresh ? <MethodVerifier onVerified={async () => { setFresh(true); }} /> : <form className="rm-panel-form" onSubmit={manage}>
            <label className="epl-slide-field"><span>Current password</span><input type="password" required autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className={action === "codes" ? "rm-primary" : "rm-ghost nm-danger-action"} type="submit" disabled={busy}>{busy ? "Saving…" : action === "codes" ? "Generate new codes" : "Confirm removal"}</button>
          </form>}
          <button className="rm-ghost" disabled={busy} onClick={() => choose(null)}>Cancel</button>
        </div> : <>
          <div className="account-actions">
            <button className="rm-primary" onClick={() => choose(status.enabled ? "passkey" : "enable")}>{status.enabled ? "Add passkey" : "Enable MFA"}</button>
            {status.enabled && !methods.includes("authenticator") && <button className="rm-ghost" onClick={() => choose("enable")}>Add authenticator</button>}
            {!methods.includes("email") && <button className="rm-ghost" onClick={() => choose("email")}>Set up email codes</button>}
            {status.enabled && <button className="rm-ghost" onClick={() => choose("codes")}>Regenerate backup codes</button>}
            {methods.includes("authenticator") && <><button className="rm-ghost" onClick={() => choose("replace")}>Replace authenticator</button><button className="rm-ghost nm-danger-action" onClick={() => choose("disable")}>Remove authenticator</button></>}
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
  const [leaving, setLeaving] = useState(false);
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
    if (leaving || !identity?.user || status.isError || !status.data || (mode === "verify" && !challengeAuthenticated)) return;
    if (mode === "setup" && status.data.enabled) {
      router.replace((status.data.reason ? mfaPath("verify", returnTo) : safeMfaReturnPath(returnTo) ?? "/dashboard/settings/security") as never);
    }
  }, [identity?.user, status.data, status.isError, mode, returnTo, router, challengeAuthenticated, leaving]);
  async function complete() {
    setLeaving(true); setError(null);
    try { router.replace(await finishMfaSignIn(returnTo) as never); }
    catch (failure) { setLeaving(false); setError(networkError); throw failure; }
  }
  async function skipSetup() {
    if (mode !== "setup" || status.data?.enabled !== false || leaving) return;
    // Refresh server status before continuing: another session may have enabled MFA.
    try { await complete(); } catch { /* complete keeps a retryable error visible. */ }
  }
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
        <p>{mode === "setup" ? "MFA is optional. Set it up now, or enable it later in Settings → Security." : "Verify to remember this browser for seven days. Password sign-ins do not extend that time."}</p>
      </div>
    </header>
    {isPending || loading || leaving || (mode === "setup" && !status.isError && (status.isPending || status.data?.enabled)) ? <p role="status">Loading…</p> : mode === "setup" && status.isError ? <><p role="alert">Could not load account security.</p><button className="rm-ghost" type="button" onClick={() => { void status.refetch(); }}>Try again</button></> : mode === "setup" && identity?.user && status.data ? <MfaSetupSelection onComplete={complete} onCancel={() => { void skipSetup(); }} cancelLabel="Not now" />
      : available ? <MethodVerifier onVerified={complete} returnTo={returnTo} /> : <p role="alert">This verification is missing or expired. Return to sign in to start again.</p>}
    {error && <><p role="alert" className="rm-state-error">{error}</p><button className="rm-ghost" onClick={() => setAttempt((value) => value + 1)}>Try again</button></>}
    <footer className="mfa-page-footer">
      <p>Need help? Contact your platform operator if you’ve lost access to all your verification methods and backup codes.</p>
      <button type="button" className="rm-ghost" onClick={() => { void signOut().catch(() => setError(networkError)); }}>Return to sign in</button>
    </footer>
  </main></AuthShell>;
}
