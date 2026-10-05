# Global Tenant Admin

Tenant Admin is the platform operations role, assigned to the existing **EPL Global Platform** workspace (`countryCode = GLOBAL`). It opens `/dashboard`. Country Admin remains assigned to a country hub.

| Capability | Super Admin | Tenant Admin | Country Admin |
| --- | --- | --- | --- |
| Global dashboards and country browsing | Yes | All active hubs | Own hub |
| Existing country operational management | Existing permissions | All active hubs | Own hub |
| Global events and alumni board | Yes | Yes | No |
| Invite Country Admins | Any active country | Any active country | Own active country |
| Invite other supported roles | Yes | No | No |
| Change roles / remove memberships | Yes | No | No |
| Create, configure, activate, delete hubs | Yes | No | No |
| Audit history | All events | Country records/access and global operational records | Own country records/access |
| Global access/security and system audit events | Yes | No | No |

An active GLOBAL membership is required for Tenant Admin authority. An old country-scoped Tenant Admin row, an inactive GLOBAL workspace, or a Viewer membership in GLOBAL cannot grant platform privileges. All current memberships are considered. MFA enrollment is optional for every role. Tenant Admins may enable an authenticator, passkeys or email codes in Security; enabled protection still applies to every password sign-in.

## Invitations and role changes

Selecting Tenant Admin fixes the invitation workspace to EPL Global Platform. Country Admin invitations always target an active country. The API rechecks the issuer and assignment policy at creation, resend, and acceptance. Tenant Admins cannot grant Tenant Admin, Super Admin, Viewer, or Alumni Executive roles.

Only Super Admin changes existing access. Promotion to Tenant Admin moves the selected membership to GLOBAL. Changing a global Tenant Admin to a country role requires an active destination country. Conflicting destination memberships must be resolved first; unrelated memberships are retained. Changes revoke sessions and pending login challenges, preserve enrolled authentication methods, and write transactional audit events.

An active country's last Country Admin cannot be removed or promoted away. A global Tenant Admin does not count as that country's resident administrator. Self-change and last-Super-Admin protections remain.

## Migrate existing assignments

Validate using the isolated database configuration in [ACCOUNT-SETTINGS.md](ACCOUNT-SETTINGS.md), then run against the configured development database. Commands load `apps/server/.env` without overriding explicitly supplied environment variables.

```powershell
pnpm --filter @epl-fellows-platform/db db:migrate-tenant-admins
pnpm --filter @epl-fellows-platform/db db:migrate-tenant-admins --apply --operator "OPERATOR_ID"
```

The first command is read-only. It reports membership IDs, account IDs/names, source hubs, affected pending invitations, and blockers. Application requires an exact operator identity. The command rechecks the report under the existing access lock; moves, revocation, invitation cancellation, and audit entries commit together. The report includes an operation ID.

Before applying:
- Assign a Country Admin to every affected active country lacking one. Invite and accept a replacement through the existing application before switching application versions.
- Resolve existing GLOBAL memberships and multiple legacy Tenant Admin assignments for the same account explicitly; the migration never overwrites other roles.
- Ensure exactly one active GLOBAL workspace exists.

The migration moves all legacy Tenant Admin memberships, clears their custom permission overrides, signs affected users out, and cancels pending country-scoped Tenant Admin invitations. Re-invite those recipients under GLOBAL from Users & Roles. Old links stay cancelled; no email is sent automatically. Existing historical entries, passwords, factors, and unrelated memberships remain intact.

The migration is repeatable: completed moves and cancellations are skipped. No new role, authentication table, or structural database migration is required. Startup reports the command above if assignments remain incompatible.

## Recovery and verification

If preflight reports blockers, nothing is applied. Correct the named records through Super Admin access and rerun. If audit persistence fails, the complete migration rolls back. Do not repair by deleting audit history or resetting users' MFA.

Tests cover capabilities for all six roles, unassigned and multiple memberships, invalid GLOBAL assignments, direct API access, cross-hub invitations, current issuer authority, audit visibility, concurrent administrator moves, destination conflicts, rollback, session/challenge invalidation, and migration repeatability. Existing authentication, invitation, recovery, MFA, and audit suites remain part of verification.

Local validation passed 257 tests across authentication, API, frontend, and email packages, workspace type checks, and both application builds. Isolated database tests covered migration rollback/repeatability and session revocation. Laptop browser checks confirmed the global dashboard, operational controls, hidden hub-administration navigation, direct-page denial, and invitation submission through Mailpit followed by acceptance and return to login. The final mobile, keyboard, and separate-browser revocation checks were not completed after the browser runner and isolated database connection timed out; complete these before production rollout.

Production rollout and scheduling are separate operator steps.

## Weekly MFA verification

MFA is optional for every role. Enrolled accounts automatically remember each verified browser for seven days, including after ordinary sign-out. New browsers still require verification; password sign-ins do not extend the seven-day window. Security-method changes and backup-code regeneration still require the password and verification within five minutes. Settings > Security shows the expiry and offers **Forget this browser and sign out**. Password recovery and access/security revocation invalidate remembered browsers without disabling enrolled factors. See [MFA setup and recovery](MFA.md) for the additive `db:setup-mfa` command and rollout details.
