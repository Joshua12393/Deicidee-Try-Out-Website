# Deicidee

CrossFire clan recruitment website, based on the [Google Stitch design](https://stitch.withgoogle.com/projects/849386464158307617). Players will choose exactly one tryout mode: **TDM**, **ZM HMX**, or **Escape**.

## Current status

Initial project foundation only. Includes a responsive black-and-red coming-soon page, Next.js App Router, strict TypeScript, Tailwind CSS, ESLint, Supabase client helpers, and Zod validation support.

Applications, database tables, officer login, session-refresh proxy, scheduling, evaluation, and admin authorization are **not implemented yet**. No application data is collected. No Supabase account or Vercel deployment is created by this scaffold. The initial page is marked `noindex` until the public launch.

See [WEBSITE_PLAN.md](./WEBSITE_PLAN.md) for the agreed scope and delivery phases.

## Requirements

- Node.js **24.x** and npm (the project includes `.nvmrc` and a Node engine requirement).
- Git when connecting the repository you create.
- Supabase and Vercel accounts when database setup and deployment begin.

Apache, PHP, and XAMPP MySQL are not required, even though the project lives in an XAMPP folder.

## Run locally

From the project directory:

```powershell
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The initial home page runs without Supabase credentials.

When connecting Supabase, copy the environment template once (do not overwrite an existing local configuration):

```powershell
Copy-Item .env.example .env.local
```

Set these values from your Supabase project API settings:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Restart the development server after changing environment variables. These are the project URL and **publishable** key; never place a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable. Local environment files are ignored by Git. Only placeholder variable names belong in `.env.example`.

## Commands

- `npm run dev` — local development server.
- `npm run lint` — ESLint, with warnings treated as failures.
- `npm run typecheck` — generate Next.js route types and check TypeScript.
- `npm run build` — production build.
- `npm start` — serve an existing production build.
- `npm run check` — lint, typecheck, and production build in sequence.

The lockfile records the installed dependency versions; use `npm ci` for reproducible installs. Workflow and access-control tests will be added with those features; this scaffold does not claim to test an unimplemented recruitment backend.

### Tooling compatibility and audit

TypeScript is constrained to 6.0.x to match the current TypeScript ESLint parser support. ESLint stays on 9.39.x because the React/import/accessibility plugins bundled with the current Next.js lint configuration do not all declare ESLint 10 compatibility. npm marks ESLint 9 deprecated; upgrade the lint stack together once compatible versions are available.

At setup on 6 October 2026, `npm audit --omit=dev` reported zero production vulnerabilities. The full audit reported five high-severity development dependency entries from the `braces` → `micromatch` → `fast-glob` → Next.js lint-plugin chain. npm's proposed forced fix downgrades the Next.js lint configuration to an older major, so it was not applied. Recheck this tooling advisory before CI processes untrusted input; do not run `npm audit fix --force` blindly.

## Project layout

```text
src/
  app/
    globals.css          Tailwind import and base theme
    layout.tsx           Root layout and starter metadata
    page.tsx             Coming-soon landing page
  lib/
    clan.ts              Clan identity and the three confirmed modes
    supabase/
      config.ts          Environment validation, evaluated on client creation
      client.ts          Browser Supabase factory
      server.ts          Server action / route handler Supabase factory
.env.example             Public Supabase configuration placeholders
WEBSITE_PLAN.md           Recruitment scope and delivery plan
```

## Supabase integration boundaries

The helper files do not create tables, authenticate officers, or grant permissions. The server helper writes cookies and is intended for **server actions and route handlers**, not read-only Server Components. Before implementing authenticated pages, add the [Supabase session-refresh proxy and SSR integration](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Next database steps:

1. Create versioned migrations for officer profiles, applications, attempts, status history, and recruitment configuration.
2. Enable and test row-level security. Anonymous users must not read applicant records; officers must not assign themselves higher roles.
3. Disable public officer sign-up and provision the first owner through a controlled setup step.
4. Implement server-validated submissions with shared rate limiting, database-backed duplicate protection, and private contact data.
5. Implement session verification and role checks on every private read and mutation. UI visibility is not an authorization check.

Use the publishable key with user-scoped access wherever possible. Add server-only privileged credentials only when an implemented operation needs them, with explicit access checks. Do not commit database exports, real applicant data, or secrets.

## GitHub and Vercel

Source repository: [Deicidee-Try-Out-Website](https://github.com/Joshua12393/Deicidee-Try-Out-Website). Changes are committed separately by module or distinct action before pushing. Generated files, dependencies, and local environment secrets are excluded.

Deployment checklist for later:

1. Import the GitHub repository in Vercel and select the Next.js framework preset, Node.js 24.x, and the repository root directory. The normal build command is `npm run build`; leave the output directory at the framework default.
2. Keep the account on Hobby and use the free `.vercel.app` address; a custom domain is optional and outside the zero-cost plan.
3. Configure Supabase environment variables for the intended environment. The coming-soon page can deploy without a database; future recruitment features cannot.
4. Keep preview deployments isolated from production applicant data. Use local Supabase or an available separate free project for testing; otherwise keep previews without production database credentials.
5. Before enabling officer auth, configure the allowed site/redirect URLs in Supabase and verify login, logout, expiration, and account recovery.
6. Apply reviewed database migrations separately from preview builds. Run `npm run check`, deploy, and verify the full implemented workflow on the live URL.
7. Remove `noindex` when the finished public site is ready. Configure final metadata, official community links, and approved assets then.

No custom `vercel.json` is required for the standard Next.js deployment at this stage.

## Free-tier expectations

Target **zero monthly cost within provider limits**. [Vercel Hobby](https://vercel.com/docs/plans/hobby) is restricted to personal, non-commercial use and has finite quotas. [Supabase Free](https://supabase.com/pricing) has quotas and may pause after a week of inactivity. Recheck both providers before launch; zero cost does not guarantee unlimited capacity or uninterrupted availability.

Initial communication stays manual through Discord; no paid email/SMS, stored gameplay video, bot, or custom-domain service is required. Keep private database backups and document restoration when persistence is added.

## Next implementation milestones

1. Confirm CrossFire server/rank scheme, approved maps, exact CCN wording, clan logo, and official Discord/Facebook links.
2. Build the Home, Tryouts/Requirements, FAQ, and Apply screens from Stitch.
3. Implement application persistence and protected officer operations.
4. Test rule boundaries, permissions, mobile layouts, and the deployment workflow.

## References

- [Next.js documentation](https://nextjs.org/docs)
- [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side)
- [Website plan](./WEBSITE_PLAN.md)
