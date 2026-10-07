# Phase 1–2 implementation report

Updated: 7 October 2026. Scope: scrum phases 1–2, the requested database foundation, and the subsequently requested admin/staff editor for tryout information and links.

## Delivered in source

- Shared black/red public layout; Home, Tryouts, Requirements via `/tryouts?tab=requirements`, FAQ, Privacy, Community, and an honest closed Application page.
- A single published configuration drives rules, maps, policies, and community links. Admins control content instead of hardcoding unresolved clan decisions.
- `/admin/login` and `/admin`, validated Supabase sessions, active admin/staff profiles, admin-only draft/publish/unpublish actions, staff read-only settings, and revision conflicts.
- Six RLS-protected tables with a versioned migration, anonymous published-only reads, admin-only settings writes, audit history, one-mode/idempotency constraints, and immutable attempt snapshots.
- Node 24 scripts, locked dependencies, secret-free GitHub CI, and Laragon/Vercel/Supabase setup instructions.

## Decisions and remaining product inputs

- User confirmed role names **admin/staff**. These replace the plan's technical owner/recruiter labels; the clan owner remains the business decision-maker.
- User requested an admin dashboard to change tryout information and links. The specific settings editor is now included; a general website content-management system remains deferred.
- No Supabase project exists yet. Hosted migration and login tests cannot run until one is created.
- Unconfirmed server/ranks/maps, scoring thresholds, CCN/MAIN FB wording, retention and official links remain empty or unapproved. Admins can fill and publish them later. No source mock maps, Valorant ranks, scores, member counts, or applicant fixtures are published as clan facts.
- The owner supplied the official logo on October 7, 2026. It replaces the temporary DC graphic in the homepage hero and is also used as the browser icon. Header and footer retain the text wordmark without a trailing period.
- Applications stay closed and `noindex` remains. This is not a launch of the complete recruitment workflow.

## Validation evidence

- Configuration and PostgreSQL migration tests: 15 passed, including anonymous/outsider denial, staff publication and role-escalation denial, revocation, draft isolation, publish/unpublish, conflicts, unsafe-link rejection, idempotency, onboarding, immutable snapshots and audit records.
- PostgreSQL tests use an ephemeral PGlite instance. Supabase Auth identities are simulated only in the isolated test harness; no hosted integration success is claimed.
- Final clean-install/build and browser results are recorded below when completed.

## Still outside this increment

Public submission; durable submission rate limits; officer application pipeline; scheduling, evaluation calculators, status transitions, decisions, retry operations, and joining actions; application-data retention execution; full backup/restore verification; production deployment. These remain later scrum work even though their base tables now exist.

No commits, pushes, GitHub issues, or deployment were requested/performed in this implementation run. Existing backlog content was preserved and annotated, not discarded.

## Final execution evidence

- `npm ci` succeeded on Node 24.21.0 / npm 11.19.0, using the committed lockfile.
- `npm run check` passed: zero-warning ESLint, Next.js/TypeScript checks, all 15 tests, and a successful Next.js 16.3.8 production build.
- `npm audit --omit=dev` reported zero vulnerabilities. The full audit retains the five documented development-tool entries; no forced major downgrade was applied.
- Ran the actual production build with `npm start -- --hostname 127.0.0.1` and opened it in Chrome.
- Home, Modes, Requirements, FAQ, Apply, Community, Privacy, Admin setup, and Login rendered at a measured CSS viewport of 360px with no document overflow (343px content width including the scrollbar allowance).
- Requirements navigation persisted through a full page reload. Its two lower panels had equal Y coordinates on desktop and the same X coordinate with different Y positions on mobile, confirming adjacent/stacked behavior.
- FAQ opened with Enter, Tab moved to the next disclosure, and the keyboard focus outline was visible.
- Unconfigured admin preview had zero editable fields and zero save/submit buttons. Unconfigured Login disabled email, password, and sign-in controls.
- Browser console inspection returned no application errors or warnings during the public-page checks.
- Desktop and mobile screenshots were captured and visually reviewed after initial intermittent Chrome capture timeouts. Temporary browser viewport overrides were reset.
- Admin and Login HTTP responses returned 200 in setup mode with private/no-store cache headers. These are setup pages, not authenticated acceptance tests.

Hosted migration, Auth login/session/recovery, actual admin browser publication, and Vercel deployment remain pending because no Supabase project exists. Database publication/role enforcement is tested in isolation. The local production preview is available at http://127.0.0.1:3000 while its process is running.

## Owner rule update

The owner has now confirmed TDM (completed 1v1, win OR ≥85%), ZM HMX (≥350 with rounds considered), Escape (≥700 OR boosting), TDM equipment restrictions, live Discord sharing, and `Dc.*****` / MAIN FB. These populate the disconnected public preview and initial admin editor. The existing empty fallback remains separate so unpublishing or a database outage cannot resurrect old rules. Maps and remaining policies are still unspecified. No database migration or hosted publication was performed for this copy update.

## Hosted development setup — October 7, 2026

The owner created `deicidee-dev` (`fizahrcvegfxymqzbzkp`) in the Deicidee Free organization, Singapore. The local ignored `.env.local` now contains its project URL and publishable key. The CLI is linked and migration `20261007000100` is recorded on both local and remote histories. All six hosted tables have RLS enabled; anonymous Data API reads of every private table are denied. The public settings RPC returns null until an admin publishes. Hosted public sign-up is disabled; anonymous sign-ins remain disabled. All 12 isolated migration tests passed. The local development server loads `.env.local`. First-officer provisioning, browser sign-in/publication, and Vercel deployment remain pending.

### First officer provisioning

The owner-created, confirmed Auth account has an active `admin` officer profile. A hosted authenticated-role query verifies `current_officer_role()` and settings visibility. No password was collected in chat or stored in source. The owner still needs to complete browser sign-in and publish the confirmed draft before public rules appear on the connected site.

### Hosted settings transaction validation

Draft isolation, publication of the owner-confirmed rules, stale revision rejection, and withdrawal with draft preservation passed against the hosted database under the authenticated admin role context. Test changes were rolled back. This verifies PostgreSQL RPC behavior; browser login, cookies, and server-action publication still require a UI check by the owner.

## Review and repairs — October 7, 2026

Reviewed the public routes, shared components, officer authentication and session handling, configuration reads/writes, migration constraints/RLS, tests, environment handling, and CI. Fixed withdrawal being blocked by an invalid unsaved draft (including browser URL validation), missing or out-of-range revisions being coerced into usable values, failed login clearing the email field, and an overly constrained mobile logo layout. Public Supabase configuration now rejects secret/service-role keys and malformed or insecure remote URLs while retaining local HTTP and legacy anon-key support. No database migration or live-content change was needed.

Validation: `npm run check` passed lint, TypeScript, all 21 tests, and production build. Six new regression tests cover withdrawal with invalid/missing draft content, invalid publication payloads/revisions, and public Supabase configuration. `git diff --check` passed. The hosted migration history still matches the local version. `npm audit --omit=dev` reports zero vulnerabilities. The full audit retains five high entries in the development lint dependency chain; npm reports braces 3.0.3 as the latest published version, which remains affected. No forced downgrade was applied. Browser interaction and visual confirmation were not executed during this review because prior browser access to the local preview was blocked.
