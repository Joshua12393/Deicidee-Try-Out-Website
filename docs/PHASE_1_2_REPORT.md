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
