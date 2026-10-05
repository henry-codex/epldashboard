export const MFA_CHALLENGE_SECONDS = 600;
export const MFA_FRESH_SECONDS = 300;
export const MFA_REMEMBER_SECONDS = 7 * 24 * 60 * 60;
export const MFA_ISSUER = "EPL Global Platform";
export type MfaMethod = "authenticator" | "email" | "passkey" | "backup";
export type MfaStatus = {
  required: boolean; enabled: boolean; verified: boolean; fresh: boolean;
  enrolledMethods: MfaMethod[]; permittedMethods: MfaMethod[];
  verificationMethod: MfaMethod | null;
  verificationExpiresAt: string | null;
  browserRememberedUntil: string | null;
  reason: "MFA_ENROLLMENT_REQUIRED" | "MFA_VERIFICATION_REQUIRED" | null;
};
export function mfaStatus(input: {
  roles: string[]; enabled: boolean; verifiedAt?: Date | string | null;
  totpEnabled?: boolean; emailOtpEnabled?: boolean; passkeyCount?: number;
  backupCodes?: boolean; verificationMethod?: string | null;
  browserValid?: boolean; browserExpiresAt?: Date | string | null;
}, now = Date.now()): MfaStatus {
  // Every role chooses whether to enroll. Enabled methods still require proof.
  const required = false;
  const enrolledMethods: MfaMethod[] = [];
  if (input.totpEnabled ?? input.enabled) enrolledMethods.push("authenticator");
  if (input.emailOtpEnabled) enrolledMethods.push("email");
  if (input.passkeyCount) enrolledMethods.push("passkey");
  const enabled = enrolledMethods.length > 0;
  const permittedMethods = [...enrolledMethods];
  if (enabled && input.backupCodes !== false) permittedMethods.push("backup");
  const verificationMethod = ["authenticator", "email", "passkey", "backup"].includes(input.verificationMethod ?? "") ? input.verificationMethod as MfaMethod : null;
  const time = input.verifiedAt ? new Date(input.verifiedAt).getTime() : NaN;
  // Legacy sessions deliberately have no inferred proof method.
  const expiry = time + MFA_REMEMBER_SECONDS * 1000;
  const verified = enabled && input.browserValid !== false && verificationMethod !== null && permittedMethods.includes(verificationMethod) && Number.isFinite(time) && time <= now && now < expiry;
  const browserExpiry = input.browserExpiresAt ? new Date(input.browserExpiresAt).getTime() : NaN;
  return { required, enabled, verified, enrolledMethods, permittedMethods, verificationMethod,
    verificationExpiresAt: enabled && Number.isFinite(time) ? new Date(expiry).toISOString() : null,
    browserRememberedUntil: verified && browserExpiry > now ? new Date(Math.min(expiry, browserExpiry)).toISOString() : null,
    fresh: verified && now - time < MFA_FRESH_SECONDS * 1000,
    reason: enabled && !verified ? "MFA_VERIFICATION_REQUIRED" : null };
}
/** Only dashboard destinations and the exact invitation route may resume after MFA. */
export function safeMfaReturnPath(value?: string | null): string | null {
  if (typeof value !== "string" || !value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return null;
  try {
    const url = new URL(value, "https://epl.invalid");
    if (url.origin !== "https://epl.invalid" || url.hash) return null;
    if (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/")) return url.pathname + url.search;
    if (url.pathname === "/accept-invitation" && /^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get("token") ?? "")) return url.pathname + "?token=" + url.searchParams.get("token");
  } catch { /* Invalid destinations fall back to the user's home. */ }
  return null;
}
