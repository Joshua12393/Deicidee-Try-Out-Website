# Deicidee clan recruitment website plan

Plan updated — 7 October 2026. Public pages, an admin/staff recruitment-settings editor, and a tested database migration are implemented in source. No Supabase project is connected; applicant submission and officer recruitment operations remain later work. See README.md and docs/PHASE_1_2_REPORT.md for evidence and limitations.

## 1. Purpose and evidence

Help CrossFire players understand Deicidee, check the recruitment rules, apply for a tryout, and receive clear next steps. The owner confirmed Deicidee is a clan in CrossFire from Smilegate and applicants must choose exactly one of the three modes: TDM, ZM HMX, or Escape. Give clan officers a private place to review applications, schedule tryouts, and record decisions.

Source inspected directly in the signed-in browser: [Google Stitch project — Clan Vanguard Recruitment Portal](https://stitch.withgoogle.com/projects/849386464158307617).

Four screens were visible: Deicide - Home, Deicide - Apply Now, Deicide - Tryouts System (With Tabs), and Deicide - Admin Dashboard. A separate clan-logo image was also present. The local project directory was empty at inspection, so there is no existing stack or application behavior to preserve.

The Stitch screens are a visual and content reference, not proof of a working backend. Counts, applicant names, ranks, map options, and example statistics must not be treated as real clan data.

## 2. Design direction

Preserve the reference's near-black background, red accents, white text, angular panels, strong uppercase headings, and clan emblem. Use red primarily for the main action, active tabs, and small emphasis areas. Keep body text comfortably readable rather than extending the condensed headline style to every field.

- Use DEICIDEE consistently in branding, page titles, and footer; the source also contains DEICIDE and Deicide.
- Keep Apply Now as the main public action and Join Discord as the secondary action once the actual invite is supplied.
- On desktop, retain the home hero's text/logo pairing and the tryout mode panels.
- Preserve the two adjacent panels below Escape: Discord requirements and instructions for successful applicants. Stack them on phones.
- Make all layouts usable at 360px, tablet, and desktop widths. Convert the admin table to readable cards or a deliberate scroll region on phones.
- Use real icons rather than exposing icon-font names such as `my_location` and `sports_esports` as text.
- Include keyboard focus, readable contrast, labels, inline errors, and reduced-motion support.
- Replace the hardcoded 2024 footer year with the current year.

## 3. Public pages and recruitment journey

### Home — `/`

Retain the hero message, logo, Apply Now / View Tryouts actions, and the three clan values: skill, teamwork, and drive. Add a compact joining overview: read requirements, apply, attend tryout, receive a decision. Identify the game as CrossFire; confirm the server/region before publishing. Do not invent clan achievements, member counts, or testimonials.

### Tryouts — `/tryouts`

Keep Modes and Requirements tabs. Explain each mode's rules, map choices, how evaluation works, and what happens after passing. Link the main navigation's Requirements item directly to the Requirements tab, including on page refresh. Include a clear application action.

Observed rules to preserve pending the owner's confirmation:

- **TDM:** completed 1v1 against a clan member; win OR achieve at least 85% of the opponent's score. Example: opponent 40, applicant needs 34.
- **ZM HMX:** minimum score 350, with rounds and overall performance also considered.
- **Escape:** score at least 700 OR demonstrate boosting skill.
- **Discord:** share gameplay during the tryout.
- **After passing:** source displays `CCN Format: Dc.*` and `MAIN FB`; exact spelling and meaning require clarification before publishing.

For TDM, propose `ceil(opponent score × 0.85)` when scores are whole numbers: 41 requires 35, not 34. Require match completion. An explicit win qualifies independently. A zero opponent score should require a recorded win or officer review rather than accidentally passing on a zero threshold. Numeric eligibility assists officers; it does not automatically grant clan membership.

### Application — `/apply`

Keep the source fields visible in the plan: first name, last name, IGN, rank, previous clan, Facebook link, Discord name, reason for joining, selected mode, and conditional map. Confirm whether real names are necessary; recommend making them optional unless officers need them. Previous clan should allow “None.” Use game-correct ranks and approved maps only.

Confirmed behavior: choose exactly one mode: TDM, ZM HMX, or Escape. Use a required radio group and enforce a single valid mode on the server. Replace the dashboard example `TDM / ZM` with a single mode. Retry attempts retain the selected mode; changing it requires an explicit officer action with history rather than silently evaluating multiple modes.

Show only fields relevant to the chosen mode. Include a concise acknowledgement about Discord gameplay sharing and a separate privacy notice describing who sees the application. Do not silently expand live screen sharing into stored recordings or voice retention.

On submission: validate on the server, save once, show a reference number and concrete next steps, and provide the official Discord link. Prevent repeated button clicks from creating duplicate records. Preserve valid input if validation fails. Do not show a success message before persistence succeeds.

### FAQ — `/faq`

Answer confirmed questions about applying, required equipment/Discord, scheduling, failed attempts, retries, changing an application, and joining after passing. Response-time promises, retry limits, age requirements, and activity expectations remain owner decisions, not invented website copy.

### Submission confirmation and policies

Provide a submission confirmation page, a privacy page, and clan rules/terms as appropriate. No public list of applicants. For the first release, officers can coordinate and communicate results manually through the applicant's supplied Discord contact. Do not require players to create website accounts merely to apply.

Optional later: private application tracking using a secure, unguessable access link with minimal displayed data. A sequential reference number alone must not grant access to an application.

## 4. Officer dashboard

Provide an admin login and protected recruitment area. Admin accounts are provisioned by the owner; there is no public admin registration.

- Summary cards derived from actual records: total applications, pending review, scheduled tryouts, and passed/failed within a clearly labelled last-30-days window.
- Search by IGN/Discord and filter by mode, status, and application date; add pagination and explicit sorting.
- Open an applicant detail view with submitted fields, selected mode/map, private officer notes, scheduled time, evaluator, and history.
- Record mode-specific evaluations instead of requiring all three mode sections for every player.
- Schedule or reschedule a tryout, displaying Asia/Manila clearly. Store timestamps consistently and retain scheduling changes.
- Offer Pass, Fail, and Retry actions with a decision note and protection against accidental double submission.
- Track joining separately from passing: a passed player can still need to complete the clan-name and main-Facebook requirements.

Proposed progression: Pending Review → Scheduled → Under Evaluation → Passed / Failed / Retry Requested. A retry creates a new attempt and then returns to Scheduled; it must preserve the previous attempt. An application may also be Withdrawn or Closed with a reason. Invalid transitions should be rejected on the server.

Use separate onboarding status for passed applicants: Awaiting Requirements → Joined. Do not label every passed applicant a member immediately.

Confirmed technical roles: admin (settings publication and controlled officer access) and staff (read-only settings now; applications, schedules, and evaluations in later phases). The user selected these role names during implementation. Record which officer changed a status and when. Restrict private data to authorized officers.

## 5. Content conflicts and missing decisions

Resolve these before finalizing implementation:

1. **CrossFire server and ranks:** game confirmed by the owner: CrossFire from Smilegate. Replace the generated Valorant rank options with the appropriate CrossFire rank scheme after confirming the server/region and whether the clan means military rank or ranked-match tier.
2. **Mode selection resolved:** the owner confirmed exactly one of TDM, ZM HMX, or Escape per application. Correct the dashboard sample and support repeat attempts without adding multi-mode selection.
3. **Map list:** the source contains Death Trap, Bio-Lab Alpha, Reactor Core, Treasure Island, Prison Break, and The Facility. Treat these as unverified options.
4. **Rules:** confirm 85%, 350, 700, the Escape alternative, and whether thresholds vary by map. Define what qualifies as boosting skill and what officers assess in ZM HMX.
5. **After passing:** confirm the exact CCN format and whether MAIN FB means the applicant's main Facebook account/link.
6. **Clan assets and contacts:** supply the original logo, official Discord invite, Facebook page/group, and any approved images.
7. **Recruitment policies:** required personal fields, age/activity rules if any, officer responsibilities, retry policy, data retention, and whether applications can be paused.
8. **Deployment resolved:** use Next.js on Vercel Hobby with Supabase Free and a free `.vercel.app` address. Target zero monthly cost within provider limits. The repository is connected at https://github.com/Joshua12393/Deicidee-Try-Out-Website. The user confirmed there is no Supabase project yet.

## 6. Agreed implementation approach

Use one Next.js application with the App Router, TypeScript, and responsive styling. Deploy public pages, application submission handlers, and officer dashboard to Vercel Hobby. Use Supabase Free for PostgreSQL and officer authentication. This replaces the earlier Laravel/Blade/MySQL proposal. The local folder is only the workspace location. The user uses Laragon; this stack runs with Node.js and Supabase PostgreSQL and does not need Apache, PHP, or Laragon MySQL. Verify supported Node.js and package versions when implementation begins and commit the lockfile.

Render public information statically where practical. Use server components for private data and server actions or route handlers for validated mutations. Keep interactive client components small. Never cache private applicant responses publicly.

Use Supabase Auth for owner-provisioned officer accounts, with public sign-up disabled. Validate sessions and database-backed roles on every private read and mutation; hiding an admin menu is not authorization. Use PostgreSQL row-level security for exposed tables, and test that anonymous users cannot retrieve applicant records or grant themselves officer roles. Public application submissions go through a validated server endpoint; allowlist writable fields so applicants cannot set status, evaluator, or outcome.

Keep privileged Supabase credentials server-only, outside Git and browser bundles. Use user-scoped access for officer operations wherever possible; privileged server paths must explicitly enforce their own authorization. Store schema migrations, constraints, and access policies in the repository. Use transactions for decisions and history updates, and a database uniqueness constraint for submission idempotency. Rate limiting must use shared durable state rather than process memory because serverless instances do not share memory. Handle database outages with a retryable error, never a false submission success.

Core records:

- Officer profiles: Supabase Auth user IDs and protected owner/recruiter roles.
- Applications: applicant fields, selected mode/map, acknowledgement version/time, current status, and reference.
- Tryout attempts: application, evaluator, schedule, map, scores/observations, outcome, and notes. Multiple attempts per application preserve retries.
- Status history: old/new status, actor, time, and reason.
- Recruitment configuration: approved modes/maps, thresholds, recruitment-open flag, and official links. Snapshot the applicable rules on an attempt so later rule changes do not rewrite old evaluations.

Start with officer-maintained configuration and a recruitment open/closed control. The user explicitly requested an admin editor for tryout information and official links; that scoped editor is included now. A general content editor, public roster, gallery, leaderboards, tournaments, player accounts, automatic Discord messages, and bot integration remain deferred features.

Protect application and admin forms with server validation, CSRF protection, rate limiting, authorization, escaped output, and secure sessions. Store contact data privately. Do not collect game passwords, account credentials, or payment details. Avoid file uploads for the initial release; any future evidence uploads need explicit storage, access, and retention rules.

### Zero-cost hosting boundaries

- Vercel Hobby is for personal, non-commercial use. Verify the clan's use still qualifies before launch; monetization or business use requires reassessing the plan. Its free quotas are finite, and exceeding them can suspend affected features until limits reset. See [Vercel Hobby](https://vercel.com/docs/plans/hobby).
- Supabase Free has storage and usage quotas and can pause after a week of inactivity. Check the account's available free-project allocation before setup. A paused database can interrupt applications and officer login even if public pages remain available. See [Supabase pricing](https://supabase.com/pricing).
- Use a free Vercel-generated `.vercel.app` address, with its final name subject to availability. A purchased custom domain is outside the zero-cost plan. See [Vercel generated URLs](https://vercel.com/docs/deployments/generated-urls).
- Keep initial communications manual through Discord. Do not make paid email, SMS, video storage, analytics, or bot services dependencies of the first release. Use officer password login and document account recovery; any email-based recovery must be tested against the chosen provider's restrictions before launch.
- Remain on explicit free plans rather than paid trials. Recheck provider terms and quotas before launch. Zero cost is a target within those terms, not a promise of unlimited capacity or permanent availability.
- Maintain private manual database exports and verify restoration; do not assume paid automatic backups are included. Do not commit applicant data or backups to GitHub.

### GitHub-to-Vercel delivery

1. The owner creates the GitHub repository and supplies its URL. Prefer a personal-account repository for the intended Hobby workflow; verify provider repository restrictions before connecting it.
2. When implementation/delivery is authorized, connect the local project to that repository, preserving any existing remote content. Commit source, migrations, the lockfile, and an `.env.example` containing variable names and placeholders only. Ignore local environment files and build artifacts.
3. Configure Supabase schema/policies and provision the first owner account through a controlled setup step. No hardcoded credentials or self-service role elevation.
4. Import the GitHub repository into Vercel using its Next.js settings. Configure environment variables and authentication redirect URLs for the intended deployment. Use the production branch for production releases.
5. Keep preview testing isolated from production applicant data. If another free Supabase project is unavailable, use local Supabase for database tests and keep previews without production credentials; do not consume paid resources automatically.
6. Apply reviewed migrations separately from ordinary preview builds, then deploy and run a controlled submission-to-decision smoke test. Document code rollback and database recovery separately because reverting a deployment does not revert its database.

Current implementation authorization covers scrum phases 1–2, database migrations, and the requested admin/staff settings editor. No account creation, push, or deployment has been performed.

## 7. Ordered delivery phases

### Phase 1 — Confirm content and scope

Use the confirmed CrossFire game and single-mode selection. Resolve server/ranks/maps, application fields, evaluation rules, contact links, and CCN wording. Inventory/export approved Stitch assets when implementation is authorized. Obtain the owner's GitHub URL and verify Node.js compatibility, free-plan eligibility, and Supabase project availability for the agreed stack.

Acceptance: one agreed content/rules checklist; no game-specific placeholders presented as real requirements.

### Phase 2 — Build the public experience

Implement shared branding/navigation, Home, Tryouts, Requirements, FAQ, and the responsive application layout. Connect all navigation and official community links. Retain the paired requirements panels.

Acceptance: usable on phone and desktop; all primary actions lead somewhere meaningful; logo and typography follow the Stitch reference.

### Phase 3 — Make applications work

Add Supabase PostgreSQL migrations and access policies, server-side persistence, conditional validation, recruitment-open handling, duplicate-submit protection, privacy acknowledgement, and confirmation.

Acceptance: a valid submission creates exactly one record; invalid submissions show field errors and preserve input; closed recruitment blocks new submissions on both UI and server.

### Phase 4 — Deliver officer operations

Add Supabase Auth officer login, protected roles, real dashboard counts, search/filters, applicant details, scheduling, evaluation calculators, decisions, retries, onboarding status, and audit history.

Acceptance: an officer can take an application from submission through joining or rejection; another visitor cannot access applicant data; previous attempts remain intact after a retry.

### Phase 5 — Verify and launch

Check the public-to-admin flow, mobile layout, keyboard use, validation, authorization, rule boundaries, and deployment configuration. Replace all mock content, set official URLs and page/social metadata, and verify database backup/restore before launch. Run lint, TypeScript checks, relevant workflow/security tests, and a production build. Follow the GitHub-to-Vercel delivery steps above and verify the live free-domain deployment.

Acceptance: end-to-end trial application succeeds, sensitive routes are protected, no fake statistics remain, production errors do not expose secrets, and the agreed hosting setup can serve the site over HTTPS.

## 8. Verification checklist

- TDM: 40 → 34; 41 → 35; below threshold fails numeric eligibility; incomplete match cannot qualify; win branch works; zero-opponent case cannot auto-pass accidentally.
- ZM: 349 versus 350; qualitative observations remain part of the decision.
- Escape: 699 versus 700; documented boosting-skill alternative works without silently requiring both.
- Mode/map validation rejects unavailable maps and contradictory fields.
- Application retries/double-clicks do not create unintended duplicates.
- Unauthenticated and unauthorized requests cannot read or modify recruitment records.
- Invalid status transitions fail; retry history and officer attribution remain correct.
- Dashboard counts match stored data and the stated date window.
- Phone layouts, tabs, navigation, error messages, keyboard focus, and community links work.
- Supabase policies deny anonymous record reads and role escalation; server endpoints enforce authorization even when using privileged credentials.
- Production secrets are absent from Git, client bundles, and previews; preview tests cannot mutate production data.
- Paused/unavailable database submissions return a clear failure without losing valid form input or reporting success.
- The deployed production build completes one controlled application/review flow, and both provider accounts remain on their intended free plans.

Success means a player knows what is required and how to apply, and an officer can manage that player's recruitment without losing information or relying on placeholder dashboard data.

## 9. Phase 1–2 implementation decisions (7 October 2026)

The scrum backlog remains the delivery sequence. The user's follow-up explicitly includes admin-editable tryout information and official links, with admin/staff roles. This advances the schema and officer settings/auth foundation from later phases without claiming the complete recruitment dashboard is finished.

Unknown clan rules are managed as drafts. Administrators approve modes and publish a version; public pages never display unapproved mode thresholds or map names. The Requirements URL survives navigation and refresh. Missing community URLs appear as pending labels instead of broken buttons. The owner supplied the official clan logo on October 7, 2026; it is now used in the homepage hero and browser icon. Header and footer use the text wordmark without a trailing period.

Applications and intake are locked closed at both the UI and configuration-schema level. Public forms and numeric evaluation calculators will be implemented with the later workflows. Rule text edited now is informational, not an active scoring engine. Final content and retention decisions remain admin responsibilities before launch.

The versioned migration has been applied and tested in an isolated PostgreSQL engine using synthetic fixtures. Hosted Supabase migration, Auth/cookie behavior, and Vercel deployment remain unverified until project setup. See [implementation evidence](./docs/PHASE_1_2_REPORT.md) and [database setup](./docs/DATABASE_SETUP.md).

## 10. Owner-confirmed rules

The owner has now confirmed the following. These supersede earlier notes that treated these specific rules as unapproved:

- Choose exactly one mode: TDM, ZM HMX, or Escape.
- TDM: finish a 1v1 with a clan member/clanmate; win OR reach at least 85% of the opponent score. The calculation is 40 × 0.85 = 34 (not division). Whole-number required scores round up.
- TDM loadout: CS GUN — HK, AK47, M4, M14EBR, TRG, AWM; any pistol; any melee. CS CHAR — SWAT. No body/head armor. Accessories allowed. Preserve the owner's emphasis: weapon lang importante.
- ZM HMX: choose a map; score ≥350, with rounds also considered. Score alone does not determine the entire evaluation.
- Escape: choose a map; score ≥700 OR know how to boost. Do not silently require both.
- Discord is required for live gameplay sharing during the tryout.
- After passing: exact CCN format `Dc.*****`; MAIN FB (main Facebook account).

These are the initial admin content and the unconnected local site's public rules. Once Supabase is connected, admins still control publication. Database outages or deliberately unpublished settings never restore an older approved version automatically.

Map names, server/rank scheme, official URLs, retry/retention policy, and detailed qualitative evaluation criteria remain to be supplied. Applications remain closed until the submission and officer workflows are implemented.
