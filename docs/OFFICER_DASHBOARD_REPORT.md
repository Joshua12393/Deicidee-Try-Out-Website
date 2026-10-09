# Officer dashboard — 8 October 2026

The two-section dashboard, staff publication requests, admin review and admin-only account/role management are implemented for development review. All five migrations through `20261008000300_publication_review.sql` are applied to `deicidee-dev`. Intake remains closed and the site is not deployed to Vercel. The dated records below describe earlier increments; the final publication-review record supersedes their staff read-only restrictions.

## Dashboard and permissions

- Requirements and Applications use refresh-safe URLs. Admins have a Manage accounts shortcut that opens account controls within Requirements, keeping two main sections.
- Admin: publish requirements, control intake, create staff, suspend/restore officer access, delete another login account, review applications and reopen closed/withdrawn applications.
- Staff: read requirements and review applications, add private notes, close a pending application or record its withdrawal with a reason. Staff cannot create accounts, elevate roles, manage intake, publish requirements or reopen applications.
- Applications use real counts, literal IGN/reference search, status/mode filters, stable 20-row pagination, private detail views and attributed note/status history. No sample applications or fake performance figures were added to the hosted database.
- Submitted rule/privacy snapshots are presented as readable text. Scheduling, scoring, passed/failed decisions and joining remain separate later workflows; triage cannot silently bypass them.

## Account lifecycle and safeguards

New staff creation accepts display name, email and a 12–72-character initial password. The server checks the active admin, creates the Auth login without sending an invitation, then calls a user-scoped RPC that independently rechecks admin access and always assigns staff. Failed provisioning attempts to clean up the unassigned login. Network/cleanup uncertainty is reported for review rather than claiming success. Public signup remains disabled.

Passwords are never returned in form state. Non-secret form values are preserved on errors; password entry must be repeated after a failed attempt. Initial credentials should be shared privately with the intended officer. A forced password-change/recovery interface is not included.

Suspension is reversible. Deletion requires a reason, exact officer display-name confirmation and a separate acknowledgement. Self-removal and removal of the last active admin are blocked in guarded operations/database checks. Account changes are versioned and audited; recent activity is shown to admins.

Deletion revokes officer access before the external Auth operation. Failed deletion remains disabled/pending and can be retried, with no automatic reactivation. The Auth login is deleted while a disabled historical profile remains for past notes/decisions. The nullable Auth reference resolves the earlier deletion-blocking foreign key. This uses the server-only [Supabase deleteUser API](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser).

Current-role checks exclude suspended, deletion-pending and deleted accounts even if an older JWT is still valid. Anonymous calls and direct staff calls cannot bypass these checks. Account/notes audit records are append-only.

## Verification

- `npm run check`: lint, TypeScript, 38 tests and production build pass.
- Isolated PostgreSQL tests apply all three migrations. Added coverage includes literal search, pagination ties/bounds, private note idempotency/attribution, transition reasons/version conflicts, staff provisioning denial, self/last-admin protection, suspension, deletion retries, retained history and deleted-JWT denial.
- Hosted anonymous requests are denied for new private tables and dashboard/account RPCs. Unauthenticated requests to both dashboard tabs and application detail redirect to login.
- Hosted rollback-only SQL verifies deletion detaches the Auth reference, disables the profile and preserves attribution. An attempted check using the managed Auth database role was unavailable because the project disallows assuming that role; the rollback check was run using the normal trusted database connection instead.
- A disposable staff login was created through the actual Supabase Auth API, provisioned through the guarded database RPC, signed in, and used to fetch both local dashboard tabs. Applications rendered for staff, Requirements rendered read-only, and account creation/management UI was absent. A direct staff provisioning call was denied.
- Suspending that test officer blocked its existing JWT from the pipeline and redirected its dashboard request. Actual Supabase Auth deletion succeeded and retained the disabled historical profile. The disposable Auth login was removed; existing accounts were untouched. Its labelled historical test profile/audit events intentionally remain in the development dashboard.
- Account-history relationship queries work against hosted Supabase. The server key is absent from production client bundles. Public configuration remained at revision 5 with intake closed during verification.
- `git diff --check` passes. Earlier unrelated working-tree changes are preserved; no commit, push or Vercel deployment was performed.

## Review and remaining work

Review `/admin?tab=requirements`, `/admin?tab=applications` and the Manage accounts shortcut. Use approved officer accounts; public visitors cannot open private screens.

Hosted staff behavior and rendered responses were verified through authenticated HTTP checks, not a browser visual/mobile/screen-reader review. Admin UI interaction and recovery/credential handover should be reviewed with the real admin session. Scheduling/evaluation, joining, general applicant retention execution and final Vercel launch checks remain pending. Complete the missing published application-field wording, retention policy and correction contact before opening intake.

`scripts/verify-dashboard-hosted.mjs` is a manual development-only account lifecycle check, not part of CI. Running it creates/deletes another disposable login and retains its historical audit profile; it deliberately refuses other project references. `docs/dashboard-hosted-check.sql` is rollback-only and seeds no persistent fixtures.

## Dashboard usability update — 8 October 2026

- Compact workspace heading and two primary tabs: Rules & settings and Applications. Team accounts sit below the editor with a direct Manage team shortcut.
- Expandable sections separate each tryout mode, community/eligibility, application/privacy, and retries/joining. Admins retain draft/publish controls; staff see disabled fields and an explicit View only label. Unpublishing is separated from routine save actions.
- Recruitment status uses a concise summary with expandable opening guidance. No rules, publication state, or intake values were changed during the UI review.
- The shared navigation displays the verified active officer's name and role, a signed-in indicator, a dashboard link, and Logout. Anonymous visitors retain Staff login. Session refresh covers public routes as well as admin pages; responses remain private/no-store in production.
- Verification: npm run check passed (lint, TypeScript, 40 tests, production build). Existing admin session verified the header on the dashboard and home page, expandable rule sections, and narrow-screen layout without horizontal overflow. Anonymous production HTTP rendering and private/no-store headers passed. The manual staff verification script was updated for the new header copy; a fresh hosted staff login was not created for this UI change. The existing logout action is reused; the user's active session was preserved during review.
- Chrome's development hydration warning was traced to Grammarly injecting data attributes on the body. No application hydration mismatch was identified in that warning.

## Publication review and role management — 8 October 2026

This increment supersedes earlier staff read-only behavior. Staff can edit their own private configuration draft and submit one immutable pending publication request. Admins review readable before/after changes and approve or reject with a note. Staff draft edits cannot alter an already submitted snapshot. Stale requests and self-approval are blocked; approval atomically publishes the approved snapshot and closes intake. Existing admin direct publication remains available. Recoverable form errors retain edits, review notes and valid request keys.

Admins can create either admin or staff accounts and change another officer's role through an audited, version-checked RPC. Existing suspension, deletion confirmation, retained history, current-role authorization and self/last-admin protections remain enforced. Staff cannot administer accounts or control intake.

The desktop header now places logo, navigation and signed-in officer/logout in one row. Responsive wrapping remains for smaller screens. Browser inspection of the authenticated staff dashboard confirmed editable sections, private draft/submission controls, absence of account/direct-publication controls and aligned header centers without horizontal overflow.

Validation: npm run check passed lint, TypeScript, 46 tests and production build. Six new database cases cover draft isolation, request immutability/idempotency, atomic approval/replay, stale review/rejection, revoked authors, role assignment and self/last-admin protections. Both search and publication-review migrations were applied to the linked development project. docs/publication-review-hosted-check.sql exercised actual staff/admin RPCs, approval replay and role promotion inside a rolled-back transaction. Anonymous access to both new tables and all four RPCs was denied. Post-check state confirmed zero requests/drafts, configuration revision 6, unpublished settings and intake closed; no synthetic changes persisted.

Remaining acceptance: real admin browser review/rejection interactions, concurrent hosted requests from separate connections, full keyboard/screen-reader review, production session/recovery checks and final approved content. No real account role, published content, intake state or deployment was changed during acceptance testing.
