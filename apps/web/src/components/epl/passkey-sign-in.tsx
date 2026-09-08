"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { finishMfaSignIn, mfaError } from "@/lib/mfa";

export function passkeyError(error: { code?: string; message?: unknown; status?: number } | null) {
  if (["AUTH_CANCELLED", "ERROR_CEREMONY_ABORTED", "REGISTRATION_CANCELLED"].includes(error?.code ?? "")) return "The device prompt was cancelled or no matching passkey was available. Try again or choose another method.";
  if (error?.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") return "This passkey is already registered. Choose another device or use the existing passkey.";
  if (error?.code === "PASSKEY_VERIFICATION_FAILED") return "Use your device PIN or biometrics to verify this passkey, then try again.";
  if (error?.code === "CHALLENGE_NOT_FOUND") return "This passkey request expired or was used. Try again.";
  return mfaError(error ? { ...error, message: typeof error.message === "string" ? error.message : undefined } : null, "Could not verify the passkey. Try again or choose another method.");
}
export function supportsPasskeys() { return typeof window !== "undefined" && Boolean(window.PublicKeyCredential && navigator.credentials); }
export function PasskeySignIn({ returnTo, onVerified, disabled, onBusyChange }: {
  returnTo?: string | null; onVerified?: () => Promise<void>; disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  async function signIn() {
    if (busy || disabled) return;
    if (!supportsPasskeys()) { setError("This browser does not support passkeys. Use an up-to-date browser or sign in with your password."); return; }
    setBusy(true); onBusyChange?.(true); setError(null);
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) { setError(passkeyError(result.error)); return; }
      if (onVerified) await onVerified();
      else router.replace(await finishMfaSignIn(returnTo) as never);
    } catch { setError("Could not reach the server. Try again or choose another method."); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return <div className="mfa-passkey-signin">
    <button className="rm-ghost mfa-passkey-button" type="button" disabled={busy || disabled} onClick={() => { void signIn(); }}><Fingerprint size={18} aria-hidden="true" />{busy ? "Waiting for your device…" : "Sign in with a passkey"}</button>
    {busy && <p role="status">Complete the prompt using your device PIN or biometrics.</p>}
    {error && <p className="rm-state-error" role="alert">{error}</p>}
  </div>;
}
