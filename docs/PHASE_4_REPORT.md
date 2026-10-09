# Application submission — 7 October 2026

DC-010–012 are implemented for development review. Intake remains closed; officer processing, scheduling, decisions, joining and production release are not complete. Admin intake controls from DC-015 were pulled forward.

## Implemented behavior

- `/apply` has required IGN, Discord contact, reason, exactly one mode, and privacy/live-sharing acknowledgement. First/last name, rank, previous clan (including None) and Facebook link are optional.
- ZM HMX/Escape require an exact map from the published admin list. TDM has no map field. Unapproved modes and modes without required maps are unavailable. Nothing invents real map names.
- Server actions extract applicant-owned fields only. PostgreSQL independently rejects invalid modes/maps, stale rules, malformed payloads, supplied privileged fields, and closed intake.
- Only the server-only Supabase key can call the submission RPC. Browser keys and officer sessions cannot bypass the server's rate-bucket calculation by calling it directly.
- Rate limits share PostgreSQL buckets: five new applications per connection per ten minutes. The identifier is HMAC-hashed before storage. Local development uses one shared bucket; production requires Vercel's trusted request header. [Vercel header documentation](https://vercel.com/docs/headers/request-headers).
- A unique submission key serializes retries. Equal key/payload/acknowledgement version returns the same private receipt without another record or rate-limit count. Changed details under that key fail.
- Application, published rule/policy snapshot, acknowledgement version/time and initial Pending Review history are saved in one transaction. Confirmation appears only after a verified database receipt, with Discord next steps and no public lookup/directory.
- Errors preserve controlled input, including the server-rendered response before hydration. Field messages and pending controls are available. No passwords, gameplay files or recordings are collected.
- Active admins can open/close intake with a separate version check. Complete published application fields, retention/contact, Discord information and at least one ready mode are required. Publishing/withdrawing settings pauses intake; saving a draft preserves it. Staff cannot change intake.

## Verification

- `npm run check`: lint, TypeScript, 31 tests and optimized production build.
- Isolated PGlite PostgreSQL tests apply both actual migrations, with synthetic Auth context and records. They cover anonymous/staff/admin/revoked access, malformed submissions, closure, maps, stale publication, atomic history/snapshot persistence, duplicate receipts, rate rejection/window reset, draft/publication behavior and withdrawal.
- `20261007000200_application_submission.sql` was reviewed with a dry run and applied to linked development project `fizahrcvegfxymqzbzkp`. Both local/remote migration versions match.
- Hosted Data API checks: anonymous submission RPC denied; all eight private tables deny anonymous reads; server key authenticated successfully and a valid synthetic request was rejected because intake is closed.
- Actual local Next.js server-action HTTP checks: valid request rejected while closed, tampered multiple-mode request returned a field error, and a failed request retained the applicant's IGN/reason in the rendered response. `/apply` and `/admin/login` return 200; unauthenticated `/admin` redirects with 307. Submission is disabled in rendered closed-intake markup.
- `npm audit --omit=dev`: zero production vulnerabilities. Existing development-tool advisory disposition remains documented in README.
- The server key is absent from production client bundles; `.env.local` is Git-ignored. No key value is included in this report.

## Review and release gates

Current hosted published revision observed during verification: 5; intake false. Admin-published TDM, ZM HMX and Escape each contain two maps. Application-field wording, retention policy and correction contact remain blank. Existing published content was preserved.

Review the form at `/apply` and intake/settings at `/admin`. Browser visual, mobile and screen-reader interaction checks remain pending; HTTP rendering checks are not a visual review. Hosted Auth/session acceptance and recovery remain separate from these submission checks. No live intake was opened and no successful applicant was inserted into the hosted project by these checks; successful submission fixtures exist only in the isolated test database.

Before public launch, publish approved policies/contact/field wording, finish the officer pipeline and later workflows, and perform the Vercel acceptance/recovery checks. General applicant retention/deletion automation remains pending. Preview deployments must use separate development data/keys, and all four environment variables must be set for the intended deployment. This increment does not deploy the site or remove noindex.

## Reliability and module review — 8 October 2026

The existing Phase 4 implementation was retained and reviewed against DC-010–012. The officer dashboard now also exists; its earlier hosted evidence is in `OFFICER_DASHBOARD_REPORT.md`. The results above describe the earlier run, not fresh hosted acceptance of this change.

Changes in this run:

- Repeated multipart fields now reach schema validation as ambiguous values instead of silently accepting the first value. Multiple mode fields are rejected even when each individual value is a valid mode. Privileged fields are still excluded.
- Recoverable responses retain the original valid submission key and acknowledgement revision alongside player input and consent. The mounted form also keeps its original identity through server rerenders. This prevents a retry from silently becoming a new application or acknowledging a different rules revision.
- Consent errors now have `aria-invalid` and an associated error description.
- Reviewed public routes, form/server actions, settings/intake, Supabase helpers, officer access/account management, application review, and migration policies. Fixed missing Discord search in the private pipeline with `20261008000200_application_search.sql`. Existing literal IGN/reference search and officer authorization are preserved.

Current validation:

- `npm run check` passed: lint, TypeScript, all **40 tests**, and optimized production build.
- Tests applied all four actual migrations in isolated PGlite PostgreSQL. Existing closure, receipt idempotency, initial status/history, snapshot, rate-window and authorization tests passed; added FormData/recovery tests and a case-insensitive Discord search assertion passed.
- A real local Next.js multipart action request with two valid mode fields was rejected with a mode error. Its returned HTML retained the synthetic IGN/reason and the original hidden submission key. This test deliberately failed validation before any database insert.
- Browser review of `/apply`: closed status and disabled submit button; ZM/Escape map options changed with the selected mode; arrow-key radio navigation selected exactly one mode. At 360px, fields and mode cards stacked without horizontal overflow. This is a targeted form check, not full screen-reader acceptance or an authenticated dashboard browser review.
- No hosted writes, intake changes, production deployment, commit or push were performed. Existing published rules/maps were preserved.

Remaining checks:

1. Apply the new search migration to the intended development project and verify staff/admin Discord searches and anonymous denial over PostgREST.
2. In isolated hosted development, verify a successful synthetic application through the actual action, returned confirmation/reference, same-key retries after an uncertain response, concurrent duplicates from separate connections, and closure while a form is open. PGlite checks do not establish cross-connection behavior or hosted network recovery.
3. Complete screen-reader/error-flow review, hosted admin interaction/session recovery, approved policy wording and remaining scheduling/evaluation/joining workflows before opening public intake.

The backlog retains Review status. Date filters and selectable ordering for DC-013 remain outstanding; no claim of complete Phase 5 acceptance is made.

## Hosted migration follow-up — 8 October 2026

The Discord search migration and subsequent publication-review migration are now applied to deicidee-dev. The earlier outstanding migration-application item is complete; authenticated Discord search through the actual dashboard remains an acceptance check. The new staff draft/admin approval backend passed hosted rollback-only checks and anonymous denial. All synthetic requests, approval and role changes were rolled back; public settings stayed unpublished at revision 6 and intake stayed closed. Current local validation passed 46 tests, lint, TypeScript and production build. The successful application/receipt, concurrent retries, uncertain-save recovery and remaining hosted release checks above remain outstanding.
