
# Deicidee Scrum plan and product backlog

Created: 6 October 2026 · Target: first usable recruitment release

## Product goal

Enable a CrossFire player to understand Deicidee's requirements, apply for exactly **one** tryout mode, and complete recruitment with an officer who can review, schedule, evaluate, and record the outcome securely.

Confirmed modes: **TDM**, **ZM HMX**, and **Escape**. Stack: Next.js, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth, and Vercel Hobby. Target zero monthly cost within provider eligibility and limits.

This document breaks the five broad stages in [WEBSITE_PLAN.md](./WEBSITE_PLAN.md) into **eight development phases**. The website plan remains the product/design reference; this file tracks delivery order and acceptance. [README.md](./README.md) remains the setup guide.

## Current baseline

- Complete foundation: Next.js scaffold, coming-soon page, development dependencies, Supabase helper factories, environment template, and setup documentation.
- Previously verified foundation: lint, TypeScript, production build, and homepage HTTP smoke check. These checks do not establish completion of recruitment features.
- Repository connected: [Deicidee-Try-Out-Website](https://github.com/Joshua12393/Deicidee-Try-Out-Website).
- Implemented in source during this increment: public pages, database migration/policies, officer authentication foundation, and admin/staff settings editor. Not yet implemented: application submission, scheduling/evaluation operations, and recruitment pipeline dashboard. Hosted integration is pending a Supabase project.
- Phases 1–2 are implemented for review with final branding/content and hosted acceptance still pending. Selected Phase 3 foundations were advanced by explicit user request. Later recruitment phases remain planned. See the implementation record below; source completion is not deployment or owner acceptance.

## Working method

Treat phases as ordered product increments, not fixed-length sprints. Start with a **one-week sprint cadence**, adjusting capacity after the first review. A phase may span several sprints; one sprint may include ready stories from adjacent phases. Dates and velocity are not committed yet.

- **Product Owner:** clan owner; confirms rules, priorities, content, and acceptance.
- **Developers:** implement selected stories and provide verification evidence.
- **Scrum facilitator:** a role assigned by the team, potentially shared on a small project; keeps blockers and reviews visible.
- **Sprint planning:** choose one sprint goal and a realistic set of ready stories. Break them into implementation tasks, checks, and documentation.
- **Daily check-in:** record progress toward the sprint goal, the next action, and blockers. A short written update is sufficient for this small project.
- **Sprint review:** demonstrate working behavior to the owner and record accepted stories or remaining gaps.
- **Retrospective:** identify one practical process improvement for the next sprint.
- **Refinement:** clarify upcoming stories and split oversized work before sprint planning.

Backlog statuses: `Backlog → Ready → In Progress → Review → Done`. Mark an item `Blocked` only with the missing decision/dependency and the person or action needed to resolve it. Return it to its prior working status once resolved. Limit work in progress to one main story per developer where practical.

Priority definitions: **P0** = release-critical correctness, access, or workflow; **P1** = required first-release usability/content; **P2** = post-release option. Priority does not override dependency order.

Story estimates use **1, 2, 3, 5, 8** relative points. They are provisional complexity estimates, not days or deadlines. Re-estimate during refinement and split work that exceeds 8 points. No velocity or completion date is inferred from these estimates.

## Definition of Ready

A story can enter a sprint when its purpose, acceptance criteria, dependencies, and validation approach are understood; required product decisions are available; and the developer can demonstrate it within the sprint. Missing content may allow independent layout work, but unconfirmed rules must not be published as facts.

## Definition of Done

- Acceptance criteria pass and the feature is demonstrated with representative test data.
- Relevant lint, type, build, workflow, and security checks pass. Tests verify behavior and risks rather than merely reproducing implementation.
- UI stories include mobile and keyboard checks; private-data stories include authorization checks.
- No secrets, real applicant fixtures, fake production statistics, or broken placeholder actions are introduced.
- Documentation and migrations are included where needed; known material limitations are recorded.
- Changes receive review, are integrated into the agreed branch through focused commits, and have evidence recorded below the story or in its linked issue/PR.
- A local code change being done does not automatically mean it is deployed. Record deployment status separately.

## Phase 1 — Confirm requirements and prepare delivery

**Goal:** a shared rule set and a reproducible development workflow.  
**Status:** implementation ready for review; final content/branding and integration pending.  
**Dependencies:** owner decisions and existing scaffold.  
**Maps to website plan:** broad Phase 1.

### DC-001 — Confirm recruitment rules

**Story:** As the clan owner, I want one approved rule set so applicants and officers see consistent requirements.  
**Priority / estimate / status:** P0 · 3 points · Review

**Acceptance:** Confirm server/region, rank scheme, map lists, required fields, retry policy, thresholds, ZM observations, Escape boosting criteria, and exact CCN/MAIN FB wording. Preserve one mode per application. Record decisions in the website plan; remove generated Valorant ranks and unverified map claims from publishable content.

### DC-002 — Prepare approved assets and copy

**Story:** As a player, I want recognizable branding and real community links so I know where to join.  
**Priority / estimate / status:** P1 · 2 points · Review

**Acceptance:** Obtain the approved logo and official Discord/Facebook URLs. Approve concise home, FAQ, privacy, and recruitment copy. Do not invent membership counts, achievements, or response-time promises.

### DC-003 — Make the foundation reproducible

**Story:** As a developer, I want a repeatable setup so each development phase starts from a working baseline.  
**Priority / estimate / status:** P0 · 3 points · Review

**Acceptance:** Confirm a clean install and `npm run check` on Node 24; preserve the lockfile and environment template. Add GitHub CI for checks without production secrets. Review the documented development-dependency advisory and record its disposition. Existing scaffold and local checks are complete; clean-install verification and CI remain.

**Phase exit/demo:** owner can review the agreed requirements; a fresh checkout can run the starter and checks. No production database access is needed for the starter.

## Phase 2 — Deliver the public clan experience

**Goal:** players can understand the clan and how recruitment works.  
**Status:** implemented in source for review; final content and hosted acceptance pending.  
**Dependencies:** DC-001 and DC-002 for final content; DC-003 for integration.  
**Maps to website plan:** broad Phase 2.

### DC-004 — Build shared navigation and home

**Story:** As a visitor, I want to learn about Deicidee and find the joining process quickly.  
**Priority / estimate / status:** P1 · 5 points · Review

**Acceptance:** Match Stitch's black/red identity, hero, logo, and three clan values. Provide working Home, Tryouts, Requirements, FAQ, and community navigation. Keep applications visibly unavailable until the submission workflow is ready.

### DC-005 — Explain tryout modes and requirements

**Story:** As an applicant, I want to compare the three modes before choosing one.  
**Priority / estimate / status:** P0 · 5 points · Review

**Acceptance:** Modes and Requirements tabs show approved rules and maps. A Requirements link opens the correct tab after navigation/refresh. Preserve the adjacent Discord and after-passing panels on desktop and stack them on mobile. Published numeric rules match the approved evaluation specification.

### DC-006 — Answer recruitment questions and explain privacy

**Story:** As a player, I want clear next steps and data-use information before applying.  
**Priority / estimate / status:** P1 · 3 points · Review

**Acceptance:** FAQ covers scheduling, retries, Discord sharing, decisions, and joining using approved policies. Privacy explains collected fields, officer access, retention, and contact for corrections. Distinguish live gameplay sharing from recording/storage. Check 360px layouts and keyboard navigation across public pages.

**Phase exit/demo:** a player can navigate all informational pages on a phone and explain the application process. Unimplemented submission controls cannot imply that an application has been sent.

## Phase 3 — Establish database and officer access

**Goal:** provide a secure foundation for real applications.  
**Status:** planned.  
**Dependencies:** DC-001, DC-003, and an available Supabase development environment.  
**Maps to website plan:** foundations of broad Phases 3 and 4.

### DC-007 — Create versioned recruitment schema

**Story:** As an officer, I want durable application and attempt records so recruitment history is not lost.  
**Priority / estimate / status:** P0 · 5 points · Review

**Acceptance:** Migrations create officer profiles, applications, attempts, history, and configuration with relationships and constraints. Enforce one selected mode, valid status values, and unique submission keys. Support multiple attempts and immutable rule snapshots. Apply migrations successfully to an isolated database with synthetic fixtures.

### DC-008 — Implement officer authentication

**Story:** As an officer, I want secure login and logout so only assigned staff can enter recruitment tools.  
**Priority / estimate / status:** P0 · 5 points · In Progress

**Acceptance:** Owner-provisioned Supabase Auth accounts can log in/out. Public registration is disabled. SSR cookies and session refresh work; expired sessions are handled clearly. Verify private requests using validated identity, and document a tested recovery path within the chosen setup.

### DC-009 — Enforce roles and row-level security

**Story:** As an applicant, I want my contact information limited to authorized officers.  
**Priority / estimate / status:** P0 · 5 points · In Progress

**Acceptance:** Owner/recruiter permissions are enforced on server reads and mutations and by database policies where applicable. Anonymous users cannot list/read applications or mutate roles. Recruiters cannot elevate themselves or manage owner-only settings. Privileged server operations have explicit access checks. Authorization tests cover direct requests, not just hidden UI.

**Phase exit/demo:** an officer can sign in to a protected shell; anonymous and insufficient-role requests fail. Do not open public recruitment yet.

## Phase 4 — Deliver reliable application submission

**Goal:** one valid player submission becomes one private application.  
**Status:** implemented for development review; public intake remains closed.
**Dependencies:** Phases 2–3 and approved fields/privacy content.  
**Maps to website plan:** broad Phase 3.

### DC-010 — Build the application form

**Story:** As a player, I want to submit my details and choose one tryout without creating a website account.  
**Priority / estimate / status:** P0 · 5 points · Review

**Acceptance:** Form contains approved fields, a required single-mode radio group, relevant map choices, and clear sharing/privacy acknowledgement. Previous clan accepts None. Errors identify fields, retain valid input, and work with keyboard/screen-reader navigation. No game credentials are requested.

### DC-011 — Persist submissions safely

**Story:** As an applicant, I want my application saved once even if I retry after a slow response.  
**Priority / estimate / status:** P0 · 5 points · Review

**Acceptance:** Server allowlists fields and validates mode/map combinations; supplied status/evaluator/outcome fields are rejected or ignored safely. Enforce shared durable rate limits and database-backed idempotency. Persist acknowledgement version/time and initial Pending Review status. Double-clicks/retries do not duplicate a submission; a database outage never reports success.

### DC-012 — Confirm submission and respect recruitment closure

**Story:** As a player, I want to know whether I applied successfully and what to do next.  
**Priority / estimate / status:** P0 · 3 points · Review

**Acceptance:** Confirmation appears only after persistence, provides a reference and Discord next steps, and does not expose private records through a guessable URL. Closed recruitment blocks submissions in both UI and server. Preserve entered data on recoverable errors. No public applicant list or mandatory applicant account is introduced.

**Phase exit/demo:** submit a synthetic application, verify one saved record, retry safely, and show rejection while recruitment is closed. Keep production intake closed until officer processing is ready.

## Phase 5 — Build recruitment review operations

**Goal:** officers can find, inspect, and triage applications.  
**Status:** planned.  
**Dependencies:** Phases 3–4.  
**Maps to website plan:** broad Phase 4.

### DC-013 — Display a real recruitment pipeline

**Story:** As a recruiter, I want searchable applications and accurate counts so I can prioritize reviews.  
**Priority / estimate / status:** P1 · 5 points · Backlog

**Acceptance:** Search IGN/Discord; filter by mode, status, and date; sort and paginate. Counts come from stored data with explicitly labelled date windows. Pending/scheduled and passed/failed metrics follow agreed definitions. Empty/loading/error states are useful; mobile layout stays readable.

### DC-014 — Review applicant details and notes

**Story:** As a recruiter, I want application details and private notes in one place.  
**Priority / estimate / status:** P0 · 3 points · Backlog

**Acceptance:** Detail view shows submitted fields, one selected mode/map, current status, officer notes, and history. Notes record actor/time and remain private. Private pages and responses are not publicly cached. No synthetic K/D or sample applicant data appears in production.

### DC-015 — Control recruitment and triage states

**Story:** As the owner, I want to pause recruitment and keep application status changes accountable.  
**Priority / estimate / status:** P0 · 5 points · Backlog

**Acceptance:** Owner-only settings manage approved configuration and the intake-open flag. Define valid status transitions centrally. Withdrawal/closure requires a reason and records actor/time. Decisions and history write atomically. Concurrent conflicting edits fail safely or require a fresh review; no silent overwrite of an officer's decision.

**Phase exit/demo:** find the Phase 4 application, inspect it, add a note, and demonstrate owner-only closure of intake plus a rejected unauthorized mutation.

## Phase 6 — Schedule and evaluate tryouts

**Goal:** officers can conduct the selected mode and record a defensible result.  
**Status:** planned.  
**Dependencies:** Phase 5, approved evaluation rules, and transition controls.  
**Maps to website plan:** broad Phase 4.

### DC-016 — Schedule and reschedule an attempt

**Story:** As a recruiter, I want an evaluator, map, and scheduled time recorded for each tryout.  
**Priority / estimate / status:** P0 · 5 points · Backlog

**Acceptance:** Persist consistent timestamps and display Asia/Manila explicitly. Record evaluator, approved map, and schedule history. Valid transitions support Pending Review → Scheduled → Under Evaluation. Rescheduling preserves prior schedule information; officers communicate arrangements manually through Discord.

### DC-017 — Evaluate TDM

**Story:** As an evaluator, I want the completed-match rule and score threshold calculated consistently.  
**Priority / estimate / status:** P0 · 3 points · Backlog

**Acceptance:** Subject to DC-001 approval, require match completion and qualify a win OR at least `ceil(opponent score × 0.85)`. Verify 40 → 34 and 41 → 35, below-threshold results, incomplete matches, and zero-opponent handling. Reject invalid/negative scores. Show eligibility separately from the officer's recorded decision.

### DC-018 — Evaluate ZM HMX and Escape

**Story:** As an evaluator, I want mode-specific evidence rather than irrelevant fields from other modes.  
**Priority / estimate / status:** P0 · 5 points · Backlog

**Acceptance:** ZM records score, rounds, and approved qualitative observations; test 349/350. Escape supports score ≥700 OR documented boosting skill; test 699/700 and the alternative independently. Thresholds remain subject to DC-001 confirmation. Show only the selected mode's evaluation, snapshot applicable rules, and save a decision note with evaluator/time.

**Phase exit/demo:** complete one synthetic attempt for each mode and demonstrate the relevant boundary cases. Passing a tryout does not automatically mark the player Joined.

## Phase 7 — Complete decisions, retries, and joining

**Goal:** recruitment reaches a clear final outcome without losing earlier attempts.  
**Status:** planned.  
**Dependencies:** Phase 6 and confirmed retry/CCN policies.  
**Maps to website plan:** broad Phase 4.

### DC-019 — Record outcomes and retry attempts

**Story:** As an officer, I want Pass, Fail, and Retry decisions with preserved history.  
**Priority / estimate / status:** P0 · 5 points · Backlog

**Acceptance:** Persist decision, note, actor, and time atomically with history. Duplicate decision submissions do not duplicate events. Retry creates a new attempt and returns to Scheduled after scheduling; it never overwrites an old result. Keep the chosen mode unless an explicit authorized change is recorded. Reject invalid transitions.

### DC-020 — Track joining after passing

**Story:** As an officer, I want to track post-tryout requirements so Passed and Joined have distinct meanings.  
**Priority / estimate / status:** P0 · 3 points · Backlog

**Acceptance:** Separate onboarding state supports Awaiting Requirements → Joined for passed applicants only. Display the approved CCN and main-Facebook requirements. Record completion and officer attribution; dashboard labels and counts distinguish tryout success from actual membership.

### DC-021 — Manage data retention and officer handover

**Story:** As the clan owner, I want an agreed way to maintain records and staff access responsibly.  
**Priority / estimate / status:** P1 · 3 points · Backlog

**Acceptance:** Document and verify the approved retention/correction process using synthetic records; no automatic deletion before policy approval. Provide an owner-only process to provision/revoke recruiter access and verify revocation blocks subsequent private actions. Document manual Discord communication, missed tryouts, and retry handling for officers.

**Phase exit/demo:** demonstrate submission → review → schedule → attempt → retry → pass → joining, plus a failed/closed case. Officers can operate the flow from the documented procedure.

## Phase 8 — Validate and release

**Goal:** publish the completed recruitment workflow with tested access controls and recovery steps.  
**Status:** planned.  
**Dependencies:** Phases 1–7; Vercel/Supabase account configuration.  
**Maps to website plan:** broad Phase 5.

### DC-022 — Run release acceptance checks

**Story:** As the owner, I want evidence that the first release works before opening recruitment.  
**Priority / estimate / status:** P0 · 5 points · Backlog

**Acceptance:** Run `npm run check` and meaningful workflow/security tests. Demonstrate mobile/keyboard use, duplicate prevention, outage handling, session expiration, role enforcement, rule boundaries, concurrency, retries, and real metrics. Review dependency advisories and resolve or explicitly assess remaining release risks. Record owner review results; do not defer basic security implementation to this phase.

### DC-023 — Deploy through GitHub to Vercel

**Story:** As the owner, I want a repeatable release on the agreed free hosting setup.  
**Priority / estimate / status:** P0 · 3 points · Backlog

**Acceptance:** Verify current free-tier eligibility/quotas, production branch, environment variables, and authentication URLs. Keep previews isolated from real applicants. Apply reviewed migrations separately from preview builds. Verify the HTTPS `.vercel.app` site with a controlled end-to-end application. Remove noindex only for the ready public release and set final metadata/assets/links.

### DC-024 — Verify operations and recovery

**Story:** As the owner, I want to recover from deployment or database problems without losing recruitment records.  
**Priority / estimate / status:** P0 · 3 points · Backlog

**Acceptance:** Restore a private database export into an isolated environment and verify representative fields/history. Document deployment rollback separately from database recovery, Supabase pause recovery, error inspection, and quota checks. Confirm backups/secrets are excluded from Git. Open intake only after the live workflow passes; record release evidence and known limitations.

**Phase exit/demo:** first production release is accepted, intake can be opened deliberately, and recovery instructions have been exercised. Free-tier limits remain an operational constraint, not an unlimited-availability promise.

## Initial sprint proposal

**Sprint goal:** make the existing foundation reproducible and resolve enough recruitment content to build the public experience.

Candidate stories: DC-001, DC-002, and the remaining tasks in DC-003. Commit only what fits available capacity after refinement; these are candidates, not a fixed delivery promise. If an owner decision is pending, continue independent CI/setup or layout work while keeping affected final content blocked.

The next sprint should target a usable public-information increment from Phase 2. Database/access preparation may be pulled forward when ready, but public application intake must wait for the complete officer workflow and release checks.

## Deferred product backlog

These P2 ideas are outside the first release and require separate refinement, estimates, and acceptance criteria before development:

- **DC-025:** private applicant status tracking through secure unguessable links.
- **DC-026:** automated Discord notifications or a recruitment bot.
- **DC-027:** public roster, gallery, achievements, or tournament content using approved real data.
- **DC-028:** gameplay evidence uploads with defined access, retention, and storage limits.
- **DC-029:** full content editing or advanced analytics beyond recruitment operations.

Paid messaging, custom domains, and video storage are not first-release dependencies. Deferred features must be checked against the zero-cost target before being selected.

## Tracking each development phase

Create one GitHub milestone per phase and one issue per selected story when issue creation is requested. Use story IDs in branch/PR titles, for example `feat/DC-010-application-form`. Keep commits focused by module or distinct action. Split oversized work into reviewable PRs without pretending incomplete workflows are ready for public intake.

For each story, retain its acceptance criteria and append:

```text
Owner:
Sprint:
Status:
Dependencies / blocker:
Issue / PR:
Validation evidence:
Owner review result:
Deployment status:
```

At a sprint boundary, carry unfinished stories back to refinement rather than marking partial work Done. Update this document when decisions or scope change; do not quietly weaken acceptance criteria to match an implementation.

The original backlog established planning scope. The user subsequently authorized scrum phases 1–2, database migrations, and an admin/staff settings dashboard. No issues/milestones, automations, commits, pushes, or deployment have been created by this implementation run.

## Implementation record — 7 October 2026

Latest user decisions override the earlier role/editor assumptions: technical roles are **admin/staff**, and admins must be able to change tryout information and official links. Staff have read-only settings access in this increment. General content management and recruitment operations remain later work.

Story dispositions below supplement the original acceptance criteria; none is marked Done without review/integration and required hosted evidence:

- **DC-001 — Review / final content pending:** one-mode rule preserved. Unconfirmed details are admin-managed drafts; publish only confirmed CrossFire rules and maps. No generated Valorant ranks or unverified map claims appear publicly.
- **DC-002 — Review / approved logo and links pending:** public copy is implemented and links can be published by an admin. The temporary typographic graphic is not the approved clan logo.
- **DC-003 — Review:** Node 24 lockfile, environment template, clean-install/check workflow, tests, and GitHub CI implemented. Development advisory disposition is recorded in README; final execution evidence is in the report.
- **DC-004 — Review:** shared navigation, Home, values, community page, and closed application state implemented. Final original-logo approval remains pending.
- **DC-005 — Review:** Modes/Requirements navigation, refresh-safe Requirements URL, paired Discord/after-passing panels, and configurable approved mode details implemented. Numeric rules are not assumed approved.
- **DC-006 — Review:** FAQ/privacy pages with explicit pending policies and no implied recording storage. Final retention/contact decisions remain admin inputs before intake opens.
- **DC-007 — Review (advanced by request):** versioned schema applied in isolated PostgreSQL; synthetic data validates constraints, RLS, idempotency, snapshots, and history.
- **DC-008 — In Progress (advanced dependency):** officer login/logout and SSR refresh implemented. Hosted sign-in, expiration, and administrator-assisted recovery require an actual Supabase development project.
- **DC-009 — In Progress (advanced dependency):** server role checks and database policies implemented; direct database permission tests pass. Hosted direct-request acceptance remains pending.
- **Requested settings editor:** admin-only transactional draft/publish/unpublish, current-role authorization, optimistic revisions, and audit history implemented. This advances only the information/settings portion of DC-015; recruitment transitions/intake operations are still pending.

Deployment: not deployed, no Supabase project connected, applications closed. See [Phase 1–2 report](./docs/PHASE_1_2_REPORT.md) for validation and [database setup](./docs/DATABASE_SETUP.md) for the next external dependency. Phases 4–8 and the rest of Phase 3/5 are not implicitly complete.


### Rule confirmation follow-up

DC-001 now has owner confirmation for the three mode rules (TDM 85%, ZM 350 plus rounds, Escape 700 OR boosting), the TDM weapon/character/armor/accessory restrictions, live Discord sharing, and `Dc.*****` / MAIN FB after passing. Initial public/admin content is updated. Remaining content decisions include actual map names, server/ranks, official links, retry/retention policies, and detailed qualitative evaluation criteria. This does not open application intake.

### Hosted setup follow-up — October 7, 2026

DC-007 migration is applied to `deicidee-dev`, with matching CLI migration history and RLS on all six tables. DC-009 hosted anonymous private-table denial is verified. Public sign-up is disabled. DC-008 first-officer provisioning, real login/session/recovery acceptance, and admin/staff publication acceptance remain pending. No intake or deployment is opened.

## Application increment — 7 October 2026

DC-010–012 are implemented for review with the user-approved required IGN/Discord/reason/single mode/consent and optional first/last name, rank, previous clan and Facebook. ZM HMX/Escape require actual published map names; no examples were published as real maps. Intake controls from DC-015 were pulled forward. Officer pipeline, scheduling, decisions, joining and release remain pending. See [Phase 4 report](./docs/PHASE_4_REPORT.md) for current verification and launch gates.

## Officer review and account management — 8 October 2026

DC-013 and DC-014 are implemented for development review: a real filtered/paginated pipeline, private details, notes, and history. DC-015 now includes audited close/withdraw and admin reopening, plus earlier intake controls. Protected account creation/suspension/deletion was added at the user’s request; staff cannot provision accounts or elevate roles. Scheduling/evaluation/joining and release remain pending. See [dashboard verification](./docs/OFFICER_DASHBOARD_REPORT.md).
