# Database setup and migration

This is a new Supabase PostgreSQL schema, not a migration of Laragon MySQL data. No existing database is imported, reset, moved, or deleted. The app can run its informational pages without a database.

## Current verification boundary

The versioned migration is exercised by `npm run test:db` in an isolated PostgreSQL engine with synthetic users and records. No Supabase project exists yet, so remote migration, Supabase Auth, and browser login/publication have not been verified against a hosted project. Docker/psql were not available in the inspected environment; no additional database service was installed.

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

   Expected migration: `20261007000100_recruitment_foundation.sql`. It is transactional and creates only this app's tables, functions, policies, enums, and an empty configuration singleton. It seeds no users or applicant records. Do not rerun migration SQL manually after the CLI has recorded it, and do not run `db reset --linked`.
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
4. For staff, create a separate Auth user and provision with role `'staff'`. Staff can read recruitment settings; only admins may publish. Browser user metadata does not determine roles.

Officer provisioning/role changes are currently performed by the trusted Supabase project administrator. A website UI to manage officer accounts is not included in this increment. The earlier plan's owner/recruiter labels map to the user-requested admin/staff roles.

## Revocation and recovery

To revoke an officer, update their profile through the controlled SQL editor:

```sql
update public.officer_profiles set active = false
where id = 'AUTH-USER-UUID-HERE'::uuid;
```

Both server checks and database policies consult active profiles. Revocation blocks subsequent private reads and settings mutations even if an old session cookie still exists. Previously viewed information cannot be recalled from an already open browser. Do not revoke the only administrator until another trusted admin is provisioned and tested.

For a lost password, the Supabase project administrator must verify the officer and use the provider's controlled account recovery/password update flow. No unauthenticated password reset API or default password exists in this app. Test the chosen recovery procedure in the development project before launch; email delivery and a browser recovery callback are not implemented or verified here. Retain secure access to the Supabase project account for recovery.

## What the migration enforces

- Six tables with RLS and explicit grants: profiles, configuration, configuration history, applications, attempts, and status history.
- Only published configuration is anonymous-readable, through a narrow function. Drafts and officer identities are not returned. Unapproved mode rules/maps are stripped from the public document.
- Only an active admin may save/publish/unpublish. Role checks and optimistic revision updates are inside one database transaction, along with the audit record.
- Neither staff nor admins can directly alter roles or write recruitment records through the Data API. Future recruitment writes require guarded server workflows/RPCs.
- A single valid mode and unique submission key per application. Attempts retain that mode, have unique attempt numbers, and keep immutable rule snapshots. Completed attempts and audit history cannot be overwritten.
- Passed and Joined are distinct. Non-passed applications cannot be marked Joined.
- Intake is locked closed by a check constraint. A future reviewed migration must unlock it when submission and officer workflows are ready.

Free-text rule descriptions are informational. Numeric evaluation calculators, map-choice validation at submission, allowed status transitions, transactional decision operations, durable submission rate limiting, and retention execution still belong to later scrum phases. The present schema must not be used to accept live applicants before those workflows are implemented.

## Optional full local Supabase

Laragon MySQL cannot host this schema. If Docker is available, `npm run db:start` starts the Supabase CLI's separate local services. Use the URL/key from `npx supabase status` only in local configuration. Use `npm run db:stop` to stop those services. Do not use local-stack credentials in production. No Docker installation is required to run the isolated migration tests (`npm run test:db`).

## Hosted acceptance checklist

Use synthetic records/accounts only in the development project:

- Migration list shows the expected version; all six tables have RLS enabled.
- Anonymous callers cannot read private tables or call the save RPC.
- An Auth user with no officer profile cannot open the dashboard.
- Admin can login, save a draft, publish, reload, unpublish, and logout; draft edits never replace live content until publication.
- Staff can login and read; direct RPC publication and role changes fail.
- Two admin tabs editing the same revision produce one successful save and one conflict, not an overwrite.
- Session refresh/expiration works; a revoked officer cannot continue private requests.
- Published configuration changes are visible without redeployment. An unavailable database never opens applications or exposes private information.
- Recovery and account handover are demonstrated through the chosen provider setup.

Deployment status is separate from local test success. Do not mark this checklist passed until executed against the actual project.
