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
```

## Project layout

| Path | Purpose |
|---|---|
| `app/layout.tsx` | Root layout: site metadata, header, footer |
| `app/page.tsx` | Homepage: hero, `#model` allocation section, `#security` controls |
| `app/investor/` `app/admin/` `app/apply/` `app/disclosures/` | Portal preview pages |
| `components/` | Client components (allocation chart, apply form) |
| `lib/platform-data.ts` | Single source of truth for all demo content: platform facts, pools, metrics, queues, controls |
| `app/globals.css` | The entire design system (tokens, chrome, cards, forms, tables) |

To change site copy or numbers, edit `lib/platform-data.ts` — pages render from it.

## CI

Every push to `main` and every pull request runs lint, typecheck, and a production build via GitHub Actions (`.github/workflows/ci.yml`).

## Roadmap

See [`ASSESSMENT.md`](./ASSESSMENT.md) for the full assessment and phased plan. Phases 1 (single-router consolidation) and 2 (engineering hygiene) are complete; Phase 3 (working apply flow, mock auth, accessibility, smoke tests) is next.
