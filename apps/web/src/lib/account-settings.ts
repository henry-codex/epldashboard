import type { AccessCapabilities } from "@epl-fellows-platform/auth/access-policy";
import { hasPermission, type UserRole } from "@epl-fellows-platform/auth/permissions";

export const PROFILE_PATH = "/dashboard/settings/profile";
export const SECURITY_PATH = "/dashboard/settings/security";

export function canAccessSettingsPage(role: UserRole | undefined, page: string, capabilities?: AccessCapabilities): boolean {
  if (page === "profile" || page === "security") return true;
  if (!role) return false;
  if (page === "audit") return capabilities?.readAudit ?? hasPermission(role, "audit:read");
  if (page === "users") return capabilities?.inviteCountryAdmins ?? hasPermission(role, "users:manage");
  if (page === "events" || page === "executives") return capabilities?.globalOperations ?? role === "super_admin";
  return capabilities?.manageHubs ?? role === "super_admin";
}

export function authErrorMessage(error: { status?: number; message?: string } | null | undefined, fallback: string): string {
  if (error?.status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (error?.status === 401) return "Your session has expired. Please sign in again.";
  return error?.message || fallback;
}

export function deviceDescription(userAgent?: string | null): string {
  if (!userAgent) return "Unknown browser or device";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const device = /iPhone/.test(userAgent) ? "iPhone" : /iPad/.test(userAgent) ? "iPad" : /Android/.test(userAgent) ? "Android" : /Windows/.test(userAgent) ? "Windows" : /Macintosh|Mac OS X/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "unknown device";
  return browser + " / " + device;
}
