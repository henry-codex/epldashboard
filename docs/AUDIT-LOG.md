# Audit Log

The Audit Log records security and access events and changes to platform records. Open **Settings → Audit Log** at `/dashboard/settings/audit`.

Super admins can view all events. Country admins can view **records and access events** for every hub they currently administer. Tenant Admins assigned to the active EPL Global Platform workspace can view those categories across country hubs, plus global operational records. Global access changes, security events, system events, and unscoped attempts remain Super Admin-only. See [Global Tenant Admin](TENANT-ADMIN.md) for migration and authority. Authentication and account security events remain global and visible only to super admins. Alumni executives, fellows, viewers, and unassigned accounts cannot read audit events. The server checks current memberships and MFA for lists, details, and filter choices.

## Setup

Validate the additive schema against the isolated database described in [ACCOUNT-SETTINGS.md](ACCOUNT-SETTINGS.md#verification), then apply it to the configured development database:

```powershell
pnpm --filter @epl-fellows-platform/db db:setup-audit
```

The command loads `apps/server/.env` without overriding supplied environment variables. It creates the dedicated `audit_events` table, indexes, and triggers on supported business tables. It copies recognized existing invitation/MFA activity entries once using a unique legacy ID. Repeating setup does not duplicate history. Missing historical names, roles, IPs, and devices are not reconstructed from today's data. Unknown historical actors are marked unavailable.

The startup schema check gives the setup command if the table or triggers are missing. Apply schema before starting new application code. Existing application data and authentication records are preserved.

## What an event contains

Each entry has a server-generated ID and request correlation ID, UTC timestamp, action, category, outcome, actor kind and identity snapshot, target ID/type/label, hub snapshot, source, available client IP and browser metadata, and safe field changes. Times display in the browser's local timezone; the details panel also shows UTC.

Actor kinds are user, anonymous, operator, and system. An unsuccessful authentication attempt does not attribute the action to the attempted account. Password acceptance with an enabled method awaiting verification is recorded as `auth.challenge_issued`. When no method is enabled, password-only sign-in is completed authentication and records `auth.sign_in`, for every role. Historical audit entries remain unchanged. Authenticator, passkey, email, and backup-code verification record the method, never the proof itself.

IP addresses come from the server connection and Express's configured trusted proxy handling. Set `TRUSTED_PROXY_CIDRS` only for trusted proxies. Client-supplied internal headers cannot override the server context. Browser/device labels describe supplied metadata; they are not proof of device identity or location.

## Event catalog

| Category | Events |
| --- | --- |
| Security | Sign-in completion/failure, pending MFA, verification, account lockout, profile changes, password changes/reset requests/reset completion, reset-email submission, sign-out and session revocation |
| Security | MFA enabled/disabled/replaced, backup-code regeneration, passkey rename, OTP email submission, operator recovery, public-signup rejection |
| Access | Invitation creation/resend/cancellation/acceptance and SMTP submission outcome; membership role changes/removal |
| Records | Create/update/delete/archive/status changes for hubs, fellows, placements, cohorts and statistics, programs, partners, alumni leaders/executives, events, check-ins, and custom-field definitions |
| Records | Completed mutation summaries, including accepted/failed import counts and shared correlation with individual record events |
| System | Trusted bootstrap, command-line country import, and retention cleanup |
| Security | Failed/denied operations with safe machine-readable reasons |

SMTP success means acceptance by the SMTP server, not arrival in an inbox. Password-reset delivery remains asynchronous and generic responses remain identical for known and unknown emails.

The action registry is in `packages/db/src/audit-policy.ts`. The shared writer is server-only. Application callers must use the writer and an audited transaction; they must never insert unfiltered request objects.

## Redaction

Following [OWASP’s logging exclusion guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude), before/after values are restricted to the explicit operational allowlist: names/titles/labels, roles/statuses, supported record references, dates, counts and ordering. Unknown fields default to **changed, values withheld**. Contact details, demographic values, narrative text, and custom-field values are not copied into the log.

Passwords, cookies, session tokens, invitation/reset/challenge tokens, OTPs, recovery codes, authenticator secrets, and credential material are excluded. Uploaded CSV contents, raw request/response bodies, SQL errors, and provider error contents are not included.

Operator recovery reasons are bounded and sanitized. Supply a support-case reference and a brief operational reason; never put credentials, codes, tokens, identity documents, or medical information in the reason.

## Transactions and failure handling

Business mutations select a transaction through server-side async context. Database triggers produce per-record events only within this explicitly supplied application audit context. Audit inserts and the corresponding changes commit together. This covers indirect writes such as placement and cohort updates during imports.

CSV rows use savepoints so rejected rows do not retain partial database changes or events. Counters are restored after row failure; successfully accepted rows and the final summary commit together.

Invitation/access services keep their existing transaction boundaries and submit invitation email after committing issuance. The email submission result gets a separate event. Better Auth uses its existing transaction adapter; success events commit with authentication state before cookies are returned. Failed operations are recorded after rollback using isolated audit writes. Failure to save a denial event does not grant access or overwrite the denial; a sanitized server message includes the correlation ID.

Audit records have no cascading foreign keys to actors, targets, or hubs. Deleting business records or clearing the mutable activity feed cannot remove their audit trail. There are no application APIs to edit or delete audit events. Database owners still control the database: this is not an external immutable archive or cryptographic proof against database-owner tampering.

## Operator commands

Initial bootstrap now also requires an operator identity:

```powershell
$env:BOOTSTRAP_OPERATOR = Read-Host 'Operator identity'
pnpm db:seed
```

Continue supplying the existing bootstrap email/password securely as documented in [USER-ONBOARDING.md](USER-ONBOARDING.md). Credentials are never printed.

Country import remains a dry run by default. Applying it requires explicit operator attribution:

```powershell
pnpm --filter @epl-fellows-platform/db import:country-data --apply --operator "OPERATOR_ID"
```

Import summaries include created/updated fellows and partners, skipped rows, and unavailable source files. Rejected bootstrap/import runs record a failed outcome with the operator identity after rollback. Existing import validation and dry-run behavior are preserved.

The existing MFA recovery command keeps its operator and identity-verification requirements and records the recovery in the new trail.

## Retention

The API exposes a rolling 12 calendar months. The page initially filters to the last 30 days. Expired entries are physically removed by the server-only retention command; scheduling is an operator responsibility.

```powershell
# Inspect cutoff and row count; no deletion.
pnpm --filter @epl-fellows-platform/db audit:retain --operator "OPERATOR_ID"

# Apply the same 12-month policy.
pnpm --filter @epl-fellows-platform/db audit:retain --operator "OPERATOR_ID" --apply
```

Schedule the apply command daily under the designated operator/service identity and database account. Cleanup and its count event are transactional. Legacy activity entries corresponding to purged audit entries are removed too, preventing their re-import on later setup. Other mutable activity entries are unaffected. Follow the same retention policy for backups separately.

If cleanup fails, inspect the safe command outcome, database connectivity, and permissions, then rerun the dry run. If event writes fail, correct database/schema access and retry the original action; do not disable audit capture to bypass a failed write. Monitor sanitized audit-write failures in server logs.

## Verification and boundaries

Run tests with both database URLs pointing at the guarded loopback `epl_settings_test` database on port **55432** and isolated Mailpit on **11025/18025**. Never use a development or production database for fixture tests.

```powershell
pnpm --filter @epl-fellows-platform/db db:setup-audit
pnpm --filter @epl-fellows-platform/api test --maxWorkers=1 --minWorkers=1
pnpm --filter @epl-fellows-platform/auth test --maxWorkers=1 --minWorkers=1
pnpm --filter @epl-fellows-platform/email test --maxWorkers=1 --minWorkers=1
pnpm --filter web test --maxWorkers=1 --minWorkers=1 --testTimeout=15000
pnpm check-types --concurrency=1
pnpm --filter server build
pnpm --filter web build
```

Tests cover permissions, direct queries, cross-hub attempts, multiple memberships, redaction, rollback, failed audit writes, partial imports, deletion survival, legacy import, pagination, authentication outcomes, and retention dates. Verify the page in separate administrator sessions, both themes, desktop/laptop/mobile widths, and keyboard navigation.

Local verification on 8 September 2026 passed 46 API tests, 70 frontend tests, six email tests, and the authentication/invitation/MFA/recovery regressions, including the focused audit checks. Workspace type checks and both application builds passed. Separate administrator browsers verified a real program update, cross-hub denial, safe details, empty results, keyboard focus, and desktop/laptop/mobile layouts (1920, 1366, and 390 pixels) in both themes. HTTP checks confirmed forged IP/request headers cannot override server attribution. Operator checks covered rejected bootstrap/import attempts and unavailable-source summaries.

Page views, downloads, audit export, personal history, IP geolocation, external log shipping, and database-console changes are outside this release. SQL writes outside an application audit context are not attributed or captured. Production deployment and scheduler provisioning remain separate.

## Remembered MFA browsers

`mfa.browser_remembered` and `mfa.browser_revoked` record account-level browser verification and revocation, visible only to Super Admins. A password sign-in using a valid seven-day allowance records completed `auth.sign_in` with `remembered: true` and the original method; it does not record a new `auth.verification`. Tokens and hashes are excluded. Security resets and access/session revocation commit their browser revocations and audit events transactionally.

## Authentication-state polling

An unauthenticated `account.mfaStatus` query still returns 401, but is omitted from audit events because a background status check can finish after sign-out or session expiry. Other denied queries, every denied mutation, and signed-in status-check denials remain audited. Existing historical events are retained.
