# Deicidee

CrossFire clan recruitment website built with Next.js, TypeScript, Tailwind CSS, and Supabase PostgreSQL/Auth. Deployment target: Vercel. Players choose exactly one mode: **TDM**, **ZM HMX**, or **Escape**.

## Current implementation

- Public Home, Tryouts, refresh-safe Requirements section, FAQ, Community, Privacy, and an application form with a closed-intake preview.
- Responsive black/red styling based on the supplied Stitch reference; the owner-supplied official Deicidee logo is used in the homepage hero and browser icon. Header and footer use the text wordmark without a trailing period.
- Officer sign-in/out and Supabase session refresh. Active **admin** and **staff** roles are checked on the server and in PostgreSQL.
- Admin settings for mode descriptions, evaluation-rule text, approved maps, server/ranks, joining/retry/privacy policies, and official Discord/Facebook links. Admins can save drafts, publish, and unpublish. Staff can read settings and review applications in a separate Applications tab. Admins can create staff accounts, suspend/restore access, and delete login accounts while retaining officer history.
- Versioned SQL migration for officer profiles, configuration, configuration audit history, applications, attempts, and status history. RLS, unique submission keys, single-mode constraints, and immutable attempt snapshots are included.
- Secret-free CI and isolated PostgreSQL migration/authorization tests.

**Applications remain closed for development review.** The Phase 4 submission form and server save flow are implemented with one-mode/map validation, durable rate limits, idempotency, consent snapshots and private receipts. Admins control intake; publication/withdrawal automatically pauses it. Keep public intake closed until officer processing and release checks are ready. The recruitment pipeline now supports real search, filters, private notes/history and guarded triage. Scheduling/evaluation and joining workflows remain pending. See [Phase 4 evidence](./docs/PHASE_4_REPORT.md).

**The local site is connected to the `deicidee-dev` Supabase project; Vercel deployment remains pending.** Without credentials, public pages render the owner-confirmed starting rules and `/admin` shows an explicitly read-only setup preview. With Supabase connected, public pages use only the admin-published version; unpublished settings and outages show safe pending content. There are no default accounts or authentication bypasses. A hosted login/publication smoke test remains necessary after setup.

The product/design source is [WEBSITE_PLAN.md](./WEBSITE_PLAN.md); delivery tracking is [SCRUM_PRODUCT_BACKLOG.md](./SCRUM_PRODUCT_BACKLOG.md).

## Local development with Laragon

Use Node.js **24.x** and npm in Laragon's terminal or PowerShell:

```powershell
Set-Location D:\xampp\htdocs\deicidee
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The directory name does not change the stack. Apache, PHP, and Laragon MySQL are not needed for this Next.js/Supabase application; existing Laragon databases are untouched. Do not import the PostgreSQL migration into MySQL or phpMyAdmin.

For reproducible installs, keep `package-lock.json` and use `npm ci`. `.nvmrc` and `package.json` require Node 24. Laragon may bundle another Node version; check `node --version` in the actual terminal used to run the project.

## Connect the database

Follow [Database setup and migration guide](./docs/DATABASE_SETUP.md). It covers creating a development Supabase project, applying migrations, disabling public sign-up, provisioning an admin/staff member, and recovery/revocation.

Copy the template only if you do not already have local configuration:

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Set these values locally, then restart Next.js:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

These public connection values are used with user-scoped authorization and RLS. Officer login uses the public key and user-scoped authorization. Application submission additionally requires the server-only `SUPABASE_SECRET_KEY` and a random `APPLICATION_RATE_LIMIT_SECRET` of at least 32 characters. See `.env.example`. Never put database passwords, Supabase secrets, or service-role keys in `NEXT_PUBLIC_` variables or Git.

## Admin and staff workflow

1. A provisioned officer signs in at `/admin/login`.
2. An admin edits the settings in `/admin`. Staff see the same fields read-only.
3. **Save draft** preserves private edits without changing the public site.
4. Mark a mode approved only after confirming its rules and map list. **Save & publish** updates public content without a new deployment.
5. **Unpublish settings** withdraws the public version while retaining the last saved draft.

Unapproved mode details are removed from the public database response, not merely hidden in the UI. Public pages render plain text, not administrator-supplied HTML. Discord/Facebook links require HTTPS on allowlisted provider domains. Blank policy fields are labelled awaiting confirmation. Publishing rules closes intake. An admin must explicitly reopen it after reviewing the new published version. Missing privacy/retention/contact, Discord requirements/invite, or all ready modes blocks opening.

Every configuration save checks the current admin role, updates a revision, and appends an audit event in one transaction. A stale editor is rejected; copy unsaved edits before reloading. New staff roles are assigned by an admin-only database RPC after server-side Auth creation, never browser-editable metadata. Open **Manage accounts** from the dashboard to create future staff, suspend/restore access or delete an account. Account deletion requires a reason, exact display-name confirmation and acknowledgement; self-removal and last-admin removal are blocked. Passwords are never echoed into action state.

## Commands and checks

- `npm run dev` — development server.
- `npm run lint` — ESLint; warnings fail.
- `npm run typecheck` — Next.js route types and TypeScript.
- `npm test` — configuration validation and isolated migration/RLS tests.
- `npm run test:db` — migration, authorization, and persistence-constraint tests only.
- `npm run build` / `npm start` — production build / local production server.
- `npm run check` — lint, types, tests, and production build.
- `npm run db:start` / `npm run db:stop` — optional full local Supabase stack; requires Docker.
- `npm run db:push:check` / `npm run db:push` — inspect/apply migrations to the explicitly linked Supabase project.

The test database is an ephemeral PGlite PostgreSQL instance. Tests apply the actual migration and exercise anonymous, authenticated non-officer, staff, admin, and revoked-officer roles. Supabase's Auth schema/JWT identity is stubbed in this isolated test harness; no production database or secrets are used. These tests do not substitute for hosted Auth, cookie refresh, or PostgREST integration checks.

GitHub Actions runs `npm ci`, `npm run check`, and the production dependency audit without production secrets. CI does not deploy or migrate a remote database.

### Dependency advisory disposition

On 7 October 2026 the full npm audit still reports five high-severity development dependency entries in the `braces` → `micromatch` → `fast-glob` → Next.js ESLint chain, describing stack exhaustion from deeply nested patterns. The proposed automatic fix downgrades the Next.js lint configuration across major versions and was not applied. Production dependency results are recorded in the implementation report. Avoid introducing untrusted glob patterns into tooling; recheck compatible upstream fixes before release. This development-tool advisory is not being labelled resolved.

## Vercel deployment

The app uses the standard Next.js preset; no PHP server, custom output directory, or `vercel.json` is required.

1. Create and configure a Supabase development project first. Apply the reviewed migration separately from Vercel builds.
2. Import the existing [GitHub repository](https://github.com/Joshua12393/Deicidee-Try-Out-Website) into Vercel. Select Next.js, Node 24, repository root, `npm run build`, and the framework's default output.
3. Supply the public URL/key plus server-only `SUPABASE_SECRET_KEY` and `APPLICATION_RATE_LIMIT_SECRET` for the intended environment. Keep preview deployments unconfigured or connected to a separate development project; never give previews production applicant access.
4. Disable public Supabase sign-up. Set the Auth site URL to the final HTTPS deployment and allow only intended redirect URLs. The password sign-in uses no arbitrary return URL. Recovery is administrator-assisted until a tested recovery UI/provider is added.
5. Run the hosted acceptance checks in the database guide: admin login/save/publish/logout, staff denial, unauthenticated denial, expiration, revocation, and public refresh.
6. Keep `noindex` and intake closed during development. Publishing this informational site is distinct from launching recruitment. Complete later scrum phases before accepting players' information.

Use the free `.vercel.app` address if desired. Vercel Hobby and Supabase Free eligibility/quotas must be checked in the actual accounts before launch. No paid services, email/SMS automation, gameplay uploads, or custom domain are required by this implementation.

A code rollback does not undo database changes. Keep later migrations additive and forward-only; back up any real data before database changes and test restoration in isolation.

## Main files

- `src/app/` — public pages and restricted officer screens/actions.
- `src/components/` — shared navigation, panels, and settings/login forms.
- `src/lib/recruitment-config.ts` — shared validation, confirmed starting rules, and separate empty safe fallbacks.
- `src/lib/public-config.ts` — published-only public reads with unavailable-state fallback.
- `src/lib/officer-auth.ts`, `src/proxy.ts` — validated identities, active roles, and SSR refresh.
- `supabase/migrations/` — versioned PostgreSQL schema, policies, and settings RPCs.
- `tests/` — isolated validation and database authorization checks.
- `docs/` — setup and implementation evidence.

## References

- [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
