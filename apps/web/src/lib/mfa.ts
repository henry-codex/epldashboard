import { authClient } from "./auth-client";
import { queryClient, trpc } from "@/utils/trpc";
import { homePathForSession } from "./home-path";
import { safeMfaReturnPath } from "@epl-fellows-platform/auth/mfa-policy";

export function mfaPath(page: "setup" | "verify", returnTo?: string | null) {
  const safe = safeMfaReturnPath(returnTo);
  return "/mfa/" + page + (safe ? "?returnTo=" + encodeURIComponent(safe) : "");
}
export function loginPath(returnTo?: string | null) {
  const safe = safeMfaReturnPath(returnTo);
  return "/login" + (safe ? "?returnTo=" + encodeURIComponent(safe) : "");
}
export function mfaError(error: { status?: number; code?: string; message?: string } | null, fallback: string) {
  if (error?.code === "MFA_ACCOUNT_LOCKED") return "Too many incorrect codes. Try again in 15 minutes.";
  if (error?.status === 429) return "Too many attempts. Wait a minute before trying again.";
  if (error?.status === 401 && !["INVALID_CODE", "INVALID_BACKUP_CODE", "PASSKEY_VERIFICATION_FAILED"].includes(error?.code ?? "")) return "Your verification or session has expired. Return to sign in.";
  if (error?.code === "INVALID_TWO_FACTOR_COOKIE") return "This verification has expired or is missing. Return to sign in.";
  return error?.message || fallback;
}
export async function finishMfaSignIn(returnTo?: string | null) {
  await queryClient.cancelQueries(); queryClient.clear();
  // Custom $fetch endpoints do not notify Better Auth\'s session atom. Refresh it
  // before mounting a dashboard gate that reads useSession().
  const session = authClient.$store.atoms.session;
  await session.get().refetch({ query: { disableCookieCache: true } });
  if (session.get().error) throw new Error("Could not refresh your session. Try again.");
  if (!session.get().data?.user) throw new Error("Your session has expired. Sign in again.");
  const status = await queryClient.fetchQuery(trpc.account.mfaStatus.queryOptions());
  if (!status) throw new Error("Your session has expired. Sign in again.");
  if (status.reason) return mfaPath(status.reason === "MFA_ENROLLMENT_REQUIRED" ? "setup" : "verify", returnTo);
  const safe = safeMfaReturnPath(returnTo);
  if (safe) return safe;
  const me = await queryClient.fetchQuery(trpc.privateData.queryOptions());
  return homePathForSession({ role: me.role, tenantId: me.tenant?.id ?? me.tenantId });
}
export async function verifyMfaCode(code: string, backup: boolean, backupCodesSaved?: boolean) {
  return backup
    ? authClient.twoFactor.verifyBackupCode({ code: code.trim() })
    : authClient.twoFactor.verifyTotp({ code: code.trim(), ...{ backupCodesSaved } });
}
export function downloadBackupCodes(codes: string[]) {
  const url = URL.createObjectURL(new Blob(["EPL Global Platform MFA backup codes\nKeep these private. Each code can be used once.\n\n" + codes.join("\n")], { type: "text/plain" }));
  const link = document.createElement("a"); link.href = url; link.download = "epl-backup-codes.txt"; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
