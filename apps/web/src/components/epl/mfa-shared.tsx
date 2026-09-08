"use client";
import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { downloadBackupCodes, loginPath, mfaError, verifyMfaCode } from "@/lib/mfa";
const networkError = "Could not reach the server. Please try again.";
export function MfaCodeForm({ onVerified, enrollment = false, saved = false, returnTo, initialBackup = false, allowSwitch = true }: {
  onVerified: () => Promise<void>; enrollment?: boolean; saved?: boolean; returnTo?: string | null; initialBackup?: boolean; allowSwitch?: boolean;
}) {
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(initialBackup);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await verifyMfaCode(code, backup, enrollment ? saved : undefined);
      setCode("");
      if (result.error) {
        setError(mfaError(result.error, "Could not verify the code."));
        setExpired(result.error.status === 401 && !["INVALID_CODE", "INVALID_BACKUP_CODE"].includes(result.error.code ?? "")); return;
      }
      await onVerified();
    } catch { setError(networkError); }
    finally { setBusy(false); }
  }
  return <form className={`rm-panel-form mfa-form mfa-code-form${enrollment ? " mfa-code-form--enrollment" : ""}`} onSubmit={submit}>
    <label className="epl-slide-field"><span>{backup ? "Backup code" : "Authenticator code"}</span>
      <input aria-label={backup ? "Backup code" : "Authenticator code"} value={code} onChange={(event) => setCode(event.target.value)}
        autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} required placeholder={backup ? undefined : "000000"} disabled={busy} aria-invalid={Boolean(error)}
        pattern={backup ? undefined : "[0-9]{6}"} minLength={backup ? undefined : 6} maxLength={backup ? 32 : 6} autoCapitalize="none" spellCheck={false} />
    </label>
    {error && <p className="rm-state-error" role="alert">{error}</p>}
    {expired && <Link href={loginPath(returnTo) as never}>Return to sign in</Link>}
    <button className="rm-primary" type="submit" disabled={busy || (enrollment && !saved)}>{busy ? "Verifying…" : enrollment ? "Enable MFA" : "Verify code"}</button>
    {!enrollment && allowSwitch && <button className="rm-ghost" type="button" disabled={busy} onClick={() => { setBackup(!backup); setCode(""); setError(null); }}>{backup ? "Use authenticator app" : "Use a backup code"}</button>}
  </form>;
}

export function MfaStepHeading({ step, children }: { step: number; children: React.ReactNode }) {
  return <h3 className="mfa-step-heading"><span className="mfa-step-number"><span className="sr-only">Step </span>{step}</span>{" "}{children}</h3>;
}

export function BackupCodes({ codes, step }: { codes: string[]; step?: number }) {
  return <div className="mfa-backup">
    {step ? <MfaStepHeading step={step}>Save your backup codes</MfaStepHeading> : <h3>Save your backup codes</h3>}
    <p>Keep these somewhere private outside this browser. Each code works once.</p>
    <ul aria-label="Backup codes">{codes.map((code) => <li key={code}><code>{code}</code></li>)}</ul>
    <button className="rm-ghost" type="button" onClick={() => downloadBackupCodes(codes)}><Download size={16} aria-hidden="true" />Download backup codes</button>
  </div>;
}
