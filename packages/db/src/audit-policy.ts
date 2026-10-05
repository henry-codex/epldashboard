import type { AuditChange } from "./schema/audit";
export const AUDIT_TABLES = {
  tenants: "hub", fellows: "fellow", placements: "placement", hub_cohorts: "cohort",
  hub_cohort_mcf_stats: "cohort_statistics", hub_programs: "program", hub_partners: "partner",
  hub_alumni_leaders: "alumni_leader", alumni_executives: "alumni_executive", hub_events: "event",
  check_ins: "check_in", network_field_defs: "field_definition",
} as const;
export const SECURITY_ACTIONS = [
  "mfa.browser_remembered", "mfa.browser_revoked",
  "auth.sign_in", "auth.challenge_issued", "auth.sign_out", "auth.session_revoked", "auth.sessions_revoked",
  "auth.password_reset_requested", "auth.password_reset", "auth.password_changed", "auth.profile_updated",
  "auth.email_submitted", "auth.verification", "auth.account_locked", "auth.signup_denied",
  "mfa.enabled", "mfa.disabled", "mfa.replaced", "mfa.backup_codes_regenerated", "mfa.passkey_renamed",
  "mfa.operator_recovery", "mfa.email_submitted", "invitation.created", "invitation.resent",
  "invitation.cancelled", "invitation.accepted", "invitation.email_submitted",
  "membership.removed", "membership.role_changed", "operation.completed", "operation.failed",
  "system.bootstrap", "system.import", "audit.retention", "system.tenant_admin_migration",
] as const;
export type AuditAction = typeof SECURITY_ACTIONS[number] | `${typeof AUDIT_TABLES[keyof typeof AUDIT_TABLES]}.${"created" | "updated" | "deleted" | "archived" | "status_changed"}`;
export const auditActions: string[] = [...SECURITY_ACTIONS, ...Object.values(AUDIT_TABLES).flatMap((name) => ["created", "updated", "deleted", "archived", "status_changed"].map((verb) => name + "." + verb))];
export const AUDIT_SAFE_FIELDS = [
  "name", "first_name", "last_name", "title", "label", "role", "status", "is_active", "is_current",
  "tenant_id", "fellow_id", "cohort_id", "program_id", "partner_id", "placement_id", "parent_id",
  "cohort_year", "cohort_number", "program", "kind", "tier", "sort_order",
  "starts_at", "ends_at", "starts_on", "ends_on", "start_date", "end_date", "period_month", "period_year",
  "started_count", "graduated_count", "placed_count", "to_be_recruited_count", "fellow_count", "days_worked",
] as const;
const safe = new Set<string>(AUDIT_SAFE_FIELDS);
export function auditText(value: unknown, max = 200): string | null {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || null : null;
}
export function auditChanges(before: Record<string, unknown> = {}, after: Record<string, unknown> = {}) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap<AuditChange>((field) => {
    if (/password|token|secret|cookie|credential|backup|otp/i.test(field) || ["id", "createdAt", "updatedAt", "created_at", "updated_at"].includes(field)) return [];
    if (JSON.stringify(before[field] ?? null) === JSON.stringify(after[field] ?? null)) return [];
    const key = field.replace(/[A-Z]/g, (s) => "_" + s.toLowerCase());
    const scalar = (v: unknown) => v == null || typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && v.length <= 300);
    return safe.has(key) && scalar(before[field]) && scalar(after[field])
      ? [{ field, before: typeof before[field] === "string" ? auditText(before[field], 300) : before[field] ?? null, after: typeof after[field] === "string" ? auditText(after[field], 300) : after[field] ?? null }]
      : [{ field, redacted: true }];
  });
}
export function retentionCutoff(now = new Date()) {
  const cutoff = new Date(now); const day = cutoff.getUTCDate();
  cutoff.setUTCDate(1); cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const last = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(day, last)); return cutoff;
}
