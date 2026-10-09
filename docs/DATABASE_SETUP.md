# Database setup and migration

This is a new Supabase PostgreSQL schema, not a migration of Laragon MySQL data. No existing database is imported, reset, moved, or deleted. The app can run its informational pages without a database.

## Current verification boundary

On October 7, 2026, the owner created `deicidee-dev` in the Deicidee Free organization, Singapore (`fizahrcvegfxymqzbzkp`). The CLI is linked locally and migration `20261007000100` is applied remotely. All six tables have RLS enabled. Hosted Data API checks confirmed that anonymous reads of all six private tables are denied and the public configuration is initially unpublished. All 12 isolated database tests passed. Hosted public sign-up is disabled, and anonymous sign-ins remain disabled. The first confirmed Auth user is provisioned as an active admin. A hosted authenticated-role query verifies admin recognition and settings visibility. Browser login/publication remain pending. Docker/psql were not installed.

## Create a development project and apply migrations

1. Create a Supabase project in your own account on the intended plan. Choose a strong database password and keep it in your password manager. Do not paste it into source files or chat. Use a separate development project for synthetic tests.
2. In this repository's terminal, authenticate and link the exact development project reference:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_DEVELOPMENT_PROJECT_REF
   npx supabase migration list
   npm run db:push:check
   ```

   Follow CLI prompts for authentication/database credentials. Review the target project and pending migration before proceeding. If the project already contains tables with these names, stop and reconcile the schema instead of replacing it.
3. Apply the migration and inspect the remote history:

   ```powershell
   npm run db:push
   npx supabase migration list
   ```

   Expected migrations: `20261007000100_recruitment_foundation.sql` and `20261007000200_application_submission.sql`. It is transactional and creates only this app's tables, functions, policies, enums, and an empty configuration singleton. It seeds no users or applicant records. Do not rerun migration SQL manually after the CLI has recorded it, and do not run `db reset --linked`.
4. Disable public user sign-up in the hosted project's Auth settings. The committed `supabase/config.toml` disables sign-up for the optional local stack only; it does not change hosted settings.
5. Add the project URL/publishable key to `.env.local` as described in README and restart `npm run dev`.

## Provision the first admin

There is no public signup or role assignment endpoint. Account ownership alone does not grant officer access.

1. In Supabase Authentication, create the intended officer user through the controlled dashboard flow. Complete any required confirmation there. Do not put passwords in migration files. Copy that user's UUID.
2. In the project's SQL editor, substitute the real Auth UUID and a display name:

   ```sql
   insert into public.officer_profiles (id, display_name, role)
   values ('AUTH-USER-UUID-HERE'::uuid, 'Clan administrator', 'admin');
   ```

3. Sign in at `/admin/login`. Create a draft, publish confirmed information, verify the public pages, and sign out.
4. For staff, create a separate Auth user and provision with role `'staff'`. Staff can edit private drafts and request publication; only admins may approve/publish. Browser user metadata does not determine roles.

After first-admin provisioning, admins manage officer accounts and assign admin/staff roles through the dashboard. The earlier plan's owner/recruiter labels map to the user-requested admin/staff roles.

## Revocation and recovery

To revoke an officer, update their profile through the controlled SQL editor:

```sql
update public.officer_profiles set active = false
where id = 'AUTH-USER-UUID-HERE'::uuid;
```

Both server checks and database policies consult active profiles. Revocation blocks subsequent private reads and settings mutations even if an old session cookie still exists. Previously viewed information cannot be recalled from an already open browser. Do not revoke the only administrator until another trusted admin is provisioned and tested.

For a lost password, the Supabase project administrator must verify the officer and use the provider's controlled account recovery/password update flow. No unauthenticated password reset API or default password exists in this app. Test the chosen recovery procedure in the development project before launch; email delivery and a browser recovery callback are not implemented or verified here. Retain secure access to the Supabase project account for recovery.

## What the migration enforces

- Eight tables with RLS and explicit grants: intake history and rate-limit buckets, plus profiles, configuration, configuration history, applications, attempts, and status history.
- Only published configuration is anonymous-readable, through a narrow function. Drafts and officer identities are not returned. Unapproved mode rules/maps are stripped from the public document.
- Only an active admin may save/publish/unpublish. Role checks and optimistic revision updates are inside one database transaction, along with the audit record.
- Neither staff nor admins can directly alter roles or write recruitment records through the Data API. Future recruitment writes require guarded server workflows/RPCs.
- A single valid mode and unique submission key per application. Attempts retain that mode, have unique attempt numbers, and keep immutable rule snapshots. Completed attempts and audit history cannot be overwritten.
- Passed and Joined are distinct. Non-passed applications cannot be marked Joined.
- The application migration replaces the closed-only constraint with admin-only, revision-checked intake controls. Required published policies/contact/Discord and at least one approved ready mode are validated in PostgreSQL. Publication and withdrawal automatically pause intake. Development intake remains closed.

Free-text rule descriptions are informational. Numeric evaluation calculators, allowed status transitions, transactional officer decisions and retention execution still belong to later scrum phases. The application migration now enforces map choices and durable hashed rate limits. The present schema must not be used to accept live applicants before those workflows are implemented.

## Optional full local Supabase

Laragon MySQL cannot host this schema. If Docker is available, `npm run db:start` starts the Supabase CLI's separate local services. Use the URL/key from `npx supabase status` only in local configuration. Use `npm run db:stop` to stop those services. Do not use local-stack credentials in production. No Docker installation is required to run the isolated migration tests (`npm run test:db`).

## Hosted acceptance checklist

Use synthetic records/accounts only in the development project:

- Migration list shows the expected version; all eight tables have RLS enabled.
- Anonymous callers cannot read private tables or call the save RPC.
- An Auth user with no officer profile cannot open the dashboard.
- Admin can login, save a draft, publish, reload, unpublish, and logout; draft edits never replace live content until publication.
- Staff can login and read; direct RPC publication and role changes fail.
- Two admin tabs editing the same revision produce one successful save and one conflict, not an overwrite.
- Session refresh/expiration works; a revoked officer cannot continue private requests.
- Published configuration changes are visible without redeployment. An unavailable database never opens applications or exposes private information.
- Recovery and account handover are demonstrated through the chosen provider setup.

Deployment status is separate from local test success. Do not mark this checklist passed until executed against the actual project.

## Server-only application submission

Set `SUPABASE_SECRET_KEY` to the existing secret key under Supabase Settings → API Keys → Secret keys. Keep it out of chat, Git and all `NEXT_PUBLIC_` variables. Set `APPLICATION_RATE_LIMIT_SECRET` to a random secret of at least 32 characters; keep this stable across production instances to share buckets. Restart development after environment edits.

Only the server key can execute `submit_application`; anonymous/authenticated direct calls are denied. Do not broaden its grants. Production request identity uses Vercel’s trusted forwarded IP header, HMAC-hashed before storage. Development uses a shared local bucket. Other production hosts are rejected until a trusted identity adapter is implemented. Reference: [Vercel request headers](https://vercel.com/docs/headers/request-headers).

The SQL function saves payload, published rules/consent version and initial status history in one transaction. Repeating the same key/payload returns the same receipt without another rate-limit count; changing details under the same key fails. Five new submissions per connection per ten minutes are allowed. Stored hashes are lazily cleaned on new submissions after a day; general applicant retention/deletion still requires its own approved workflow.

## Officer dashboard migration and accounts

`20261008000100_officer_dashboard.sql` adds private notes/account history, guarded review/account RPCs and historical officer identity links (ten RLS tables total). The login UUID is stored in nullable `auth_user_id`; deleting Auth sets it null and disables the retained officer profile. Current-role checks exclude suspended/deleted/pending accounts, including still-valid older JWTs.

Admins create admin/staff accounts at `/admin?tab=requirements&accounts=open#officer-accounts`; Auth creation uses the server secret, and `provision_officer` independently rechecks admin access and validates the selected role. The legacy `provision_staff` RPC remains staff-only. Public signup stays disabled. Profile creation failure attempts to remove the unassigned Auth login; if network/cleanup fails, inspect development Auth users before retrying. No automatic invitation email or forced password-change flow is implemented. Share initial credentials privately.

Account deletion revokes access transactionally before calling Supabase Auth. A failed external deletion remains disabled and pending, with safe retry. Historical profile/notes/audit attribution is intentionally retained, so deletion removes the login rather than erasing prior officer actions. [Supabase deleteUser reference](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).

The optional `node scripts/verify-dashboard-hosted.mjs` check is restricted to the linked `deicidee-dev` project and a running local server. It creates/deletes one disposable Auth staff login and intentionally leaves a disabled historical test profile/audit events. It never prints credentials or affects existing accounts. `docs/dashboard-hosted-check.sql` validates FK/history behavior in a rollback-only transaction. Neither hosted check runs in secret-free CI.

## Staff publication review migration

20261008000300_publication_review.sql adds two private RLS tables (twelve total) and guarded staff-draft, publication-review, role-change and officer-provisioning RPCs. Staff requests freeze their content and base revision without changing public settings. Only an active admin may approve another officer's current request; approval uses the existing publication transaction and closes intake. A stale request must be rejected and resubmitted after refreshing its draft. Direct table writes and anonymous RPC access are denied.

All five migrations are applied to the linked development project. docs/publication-review-hosted-check.sql validates real authenticated RPC behavior inside a transaction that always rolls back on successful completion. It requires an existing active admin and an active staff account without a pending request. Real account deletion/credential handover and production browser/session acceptance remain separate checks.
