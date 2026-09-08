export const MFA_REQUIRED_ROLES = new Set(["super_admin", "tenant_admin", "country_admin"]);
export const MFA_CHALLENGE_SECONDS = 600;
export const MFA_FRESH_SECONDS = 300;
export const MFA_ISSUER = "EPL Global Platform";
export type MfaMethod = "authenticator" | "email" | "passkey" | "backup";
export type MfaStatus = {
  required: boolean; enabled: boolean; verified: boolean; fresh: boolean;
  enrolledMethods: MfaMethod[]; permittedMethods: MfaMethod[];
  verificationMethod: MfaMethod | null;
  reason: "MFA_ENROLLMENT_REQUIRED" | "MFA_VERIFICATION_REQUIRED" | null;
};
export function mfaStatus(input: {
  roles: string[]; enabled: boolean; verifiedAt?: Date | string | null;
  totpEnabled?: boolean; emailOtpEnabled?: boolean; passkeyCount?: number;
  backupCodes?: boolean; verificationMethod?: string | null;
}, now = Date.now()): MfaStatus {
  const required = input.roles.some((role) => MFA_REQUIRED_ROLES.has(role));
  const enrolledMethods: MfaMethod[] = [];
  if (input.totpEnabled ?? input.enabled) enrolledMethods.push("authenticator");
  if (input.emailOtpEnabled) enrolledMethods.push("email");
  if (input.passkeyCount) enrolledMethods.push("passkey");
  const enabled = enrolledMethods.length > 0;
  const strong = enrolledMethods.includes("authenticator") || enrolledMethods.includes("passkey");
  const permittedMethods = enrolledMethods.filter((method) => !required || method !== "email");
  if (enabled && input.backupCodes !== false && (!required || strong)) permittedMethods.push("backup");
  const verificationMethod = ["authenticator", "email", "passkey", "backup"].includes(input.verificationMethod ?? "") ? input.verificationMethod as MfaMethod : null;
  const time = input.verifiedAt ? new Date(input.verifiedAt).getTime() : NaN;
  // Legacy sessions deliberately have no inferred proof method.
  const verified = enabled && verificationMethod !== null && permittedMethods.includes(verificationMethod) && Number.isFinite(time) && time <= now;
  return { required, enabled, verified, enrolledMethods, permittedMethods, verificationMethod,
    fresh: verified && now - time < MFA_FRESH_SECONDS * 1000,
    reason: required && !strong ? "MFA_ENROLLMENT_REQUIRED" : enabled && !verified ? "MFA_VERIFICATION_REQUIRED" : null };
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
