# LP Portal (working name)

Pre-release software that gives emerging fund managers a branded investor portal: investor intake, an approval queue, and an audit trail, in one isolated workspace per fund.

**Software only.** It never holds or moves money and is not a broker-dealer, adviser, funding portal or bank. See [`docs/LAUNCH_PLAN.md`](./docs/LAUNCH_PLAN.md) for the product direction, milestones and the regulatory reasoning.

> "LP Portal" is a working name. It lives in one place, `lib/product.ts`.

## What works today

| Area | Status |
|---|---|
| Accounts: email + password, server-side sessions, sign out | Available |
| Workspaces: one isolated tenant per fund, owner membership | Available |
| Public investor intake form per workspace (`/w/<slug>/apply`) | Available |
| Manager review queue: approve / reject, live counts | Available |
| Audit log of every decision, shown as recent activity | Available |
| Investor register per workspace, with an append-only ledger of commitments, capital calls and distributions (records only; no money moves) | Available |
| Invitations: single-use, expiring links the manager sends; the investor creates an account or signs in as the invited email | Available |
| Investor dashboard: each investor sees only their own real figures and activity | Available |
| Manager's investor view preview | Sample data, clearly labelled |
| Email delivery of invitations, teammate (admin) invites, configurable intake form, reporting, document vault, 2FA, white-labelling, billing | Not built yet (see the plan) |

## Stack

- [Next.js 14](https://nextjs.org/) App Router, React 18, TypeScript (strict)
- Postgres through [Drizzle ORM](https://orm.drizzle.team/): real Postgres in production (`postgres-js`), embedded [PGlite](https://pglite.dev/) for zero-setup development
- Vitest for the data layer, Playwright for end-to-end tests
- Custom CSS design system in `app/globals.css`

## Getting started

Requires Node 20+ (`.nvmrc` pins 22).

```bash
npm ci
npm run dev        # http://localhost:3000, no database setup needed
```

With no `DATABASE_URL`, development uses an embedded Postgres stored in `.data/pglite` (gitignored). Create an account at `/signup` and you land in your workspace's admin console.

Using a real Postgres locally (optional):

```bash
export DATABASE_URL=postgres://user:password@localhost:5432/portal
npm run db:migrate
npm run dev
```

### Scripts

```bash
npm run dev           # dev server
npm run build         # production build
npm run start         # serve the production build
npm run lint          # ESLint (next/core-web-vitals)
npm run typecheck     # TypeScript, no emit
npm test              # Vitest data-layer tests (embedded Postgres, or DATABASE_URL)
npm run test:e2e      # Playwright end-to-end tests against the production build
npm run db:generate   # create a new SQL migration after editing lib/db/schema.ts
npm run db:migrate    # apply migrations to the Postgres at DATABASE_URL
```

Run `npm run build` before `npm run test:e2e`; the e2e suite serves the build.

### Environment variables

See `.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **Production** | Postgres connection string. Production refuses to start without it. |
| `SIGNUP_INVITE_CODE` | No | If set, creating a workspace requires this code (closed beta). |
| `PGLITE_DIR` | No | Embedded database location (default `.data/pglite`, or `memory://`). |
| `ALLOW_EMBEDDED_DB` | No | Set to `1` to let a production build use the embedded database (local e2e only). |

## Deploying

1. Provision a Postgres database (a serverless provider such as Neon works; the driver is pooler-safe).
2. Set `DATABASE_URL` (and optionally `SIGNUP_INVITE_CODE`) on the host.
3. Run `npm run db:migrate` against that database as part of every deploy, before the new build takes traffic.
4. `npm run build && npm run start`, or deploy to a Next.js host.

## Security model

- **Tenancy.** `workspaces` is the tenant boundary. Every customer-owned row carries a `workspace_id`, and every query in `lib/applications.ts` filters on it, including updates, so a guessed id from another tenant matches nothing.
- **Authorization.** `requireMembership` in `lib/tenancy.ts` is the single gate for workspace pages and server actions. A signed-in user without a role in the workspace gets a 404, which does not reveal whether it exists. Server actions re-check it themselves, since actions can be invoked directly.
- **Sessions.** Random 256-bit tokens in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie. Only a SHA-256 of the token is stored.
- **Passwords.** scrypt (N=2^15, r=8, p=3) with a per-password salt, minimum 10 characters. Unknown-email logins take as long as wrong-password ones.
- **Database-enforced tenancy.** Ledger entries and invitations reference their investor through a composite foreign key `(investor_id, workspace_id)`, so the database itself rejects a row whose workspace differs from its investor's, whatever the application code does. Ledger amounts are positive integer cents (a `CHECK` enforces it) and entries are never edited.
- **Investor privacy inside a workspace.** An investor's data is found through their own login (`getOwnPortfolio`); no parameter can select another investor. Tests prove two investors in one workspace never receive each other's figures.
- **Invitations.** 256-bit tokens, stored only as a SHA-256, single-use (claimed with one atomic `UPDATE`), 7-day expiry, and revoked when a new link is issued. The invited email is fixed by the invitation. The link page sends `Referrer-Policy: no-referrer` so the token can't leak.
- **Capital calls** cannot exceed the uncalled commitment, checked and inserted under a row lock so simultaneous calls can't both pass.
- **Server actions authorize themselves.** Actions can be called directly, bypassing pages, so each re-checks membership and role. A structural test requires every manager action to call `requireMembership`, and an e2e test captures real action requests and replays them from an investor and an anonymous client.
- **Tests.** Data-layer tests (64) run on embedded and real Postgres. The e2e suite (19) includes browser attacks that tamper with form fields to act on another tenant. All of it was mutation-checked: removing a workspace filter, the row lock, the single-use claim, the investor filter, or the role check makes a test fail.
- **Not done yet:** login rate limiting, 2FA, row-level security in Postgres as a second layer, a CSP, and a security review. These are tracked in the plan.

## Project layout

| Path | Purpose |
|---|---|
| `app/` | Routes: marketing home, `/signup`, `/login`, `/workspaces`, `/legal`, `/invite/[token]`, and `/w/[slug]/{apply,admin,admin/investors,investor}` |
| `app/**/actions.ts` | Server actions (signup, login/logout, apply, review, investors, ledger, invitations) |
| `components/` | Client components (forms, invite panel, session bar, allocation chart) |
| `lib/db/` | Drizzle schema, driver selection (Postgres / PGlite), error helpers |
| `drizzle/` | Generated SQL migrations (commit these) |
| `lib/accounts.ts` `lib/workspaces.ts` `lib/applications.ts` `lib/investors.ts` `lib/invitations.ts` | Data access. Pure database code, unit-tested |
| `lib/money.ts` | Dollar parsing to integer cents and formatting (no floating point) |
| `lib/tenancy.ts` `lib/auth/` | Authorization guard and cookie/session layer |
| `lib/product.ts` | Product name and legal disclaimer |
| `lib/sample-data.ts` | Illustrative data for the investor preview |
| `tests/` | Playwright e2e. Vitest unit tests sit beside the code as `*.test.ts` |

## CI

Every push to `main` and every pull request runs, against a Postgres 16 service: lint, typecheck, migrations, unit tests (on both embedded and real Postgres), build, and the Playwright suite (`.github/workflows/ci.yml`).

## Roadmap

[`docs/LAUNCH_PLAN.md`](./docs/LAUNCH_PLAN.md) has the goal, milestones and what is needed from the owner. [`ASSESSMENT.md`](./ASSESSMENT.md) is the original repository assessment.
