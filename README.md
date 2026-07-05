# Global Standard Capital

Premium fintech website and investor portal prototype for a long-term diversified investment platform.

## Status

This is a product prototype. It does not process real deposits or withdrawals, does not create accounts, and does not constitute an offer to sell securities or investment advice. All portfolio, performance, and queue numbers are sample data.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router, fully static output)
- React 18 + TypeScript (strict)
- [Recharts](https://recharts.org/) for the allocation donut chart
- Custom CSS design system in `app/globals.css` (no CSS framework)

## Getting started

Requires Node 20+ (see `.nvmrc`).

```bash
npm ci        # install exact locked dependencies
npm run dev   # start the dev server on http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint (next/core-web-vitals)
npm run typecheck  # TypeScript, no emit
npm run test:e2e   # Playwright smoke tests (builds/serves automatically)
```

## Demo portal

The investor dashboard (`/investor`) and admin console (`/admin`) are gated behind a demo login at `/login`. Pick a role and enter the access code:

- Default access code: `gsc-demo`
- Override it by setting the `DEMO_ACCESS_CODE` environment variable

The apply form (`/apply`) writes submissions to a JSON-backed review queue (`data/applications.json`, gitignored, seeded in code) that surfaces in the admin console, where an admin can approve or reject each pending application.

## Project layout

| Path | Purpose |
|---|---|
| `app/layout.tsx` | Root layout: site metadata, header, footer |
| `app/page.tsx` | Homepage: hero, `#model` allocation section, `#security` controls |
| `app/login/` `app/investor/` `app/admin/` `app/apply/` `app/disclosures/` | Login and portal pages |
| `app/**/actions.ts` | Server actions (apply submission, login/logout, application review) |
| `components/` | Client components (allocation chart, apply/login forms, session bar) |
| `lib/platform-data.ts` | Single source of truth for all demo content: platform facts, pools, metrics, queues, controls |
| `lib/application-store.ts` | JSON-backed application queue (seeded, filesystem-persisted) |
| `lib/auth.ts` | Cookie-based demo session helpers |
| `app/globals.css` | The entire design system (tokens, chrome, cards, forms, tables) |
| `tests/` | Playwright end-to-end smoke tests |

To change site copy or numbers, edit `lib/platform-data.ts` — pages render from it.

## CI

Every push to `main` and every pull request runs lint, typecheck, a production build, and the Playwright smoke tests via GitHub Actions (`.github/workflows/ci.yml`).

## Roadmap

See [`ASSESSMENT.md`](./ASSESSMENT.md) for the full assessment and phased plan. Phase 1 (single-router consolidation), Phase 2 (engineering hygiene), and Phase 3 (working apply flow, mock auth, accessibility, smoke tests) are all complete.
