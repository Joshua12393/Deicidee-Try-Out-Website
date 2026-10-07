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
