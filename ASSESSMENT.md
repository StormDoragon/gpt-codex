# Repository Assessment & Improvement Plan

**Repo:** `gpt-codex` — "Global Standard Capital" fintech website + investor portal prototype
**Stack:** Next.js 14.2.4, React 18.3.1, TypeScript 5.5.3, Recharts
**Date:** 2026-07-05

## Verdict

The project builds and deploys, but it is currently **two half-finished websites stitched together**: an unstyled App Router homepage and a polished Pages Router site, with different brands, different stylesheets, and navigation links that dead-end between them. Before adding any features, the repo needs consolidation, then baseline engineering hygiene, then product completion.

---

## 1. What's here today

| Area | File(s) | State |
|---|---|---|
| Homepage (`/`) | `app/page.tsx` (App Router) | **Visually broken** — see finding C1 |
| Investor / Admin / Apply / Disclosures | `pages/*.tsx` (Pages Router) | Renders well; static demo data |
| Shared layout | `components/frame.tsx` | Used by all `pages/` routes |
| Demo content | `lib/platform-data.ts` | Good single source of truth, underused |
| Styling | `app/globals.css` + `styles/globals.css` | Two near-duplicate global stylesheets |

The build passes (`next build`, 9 static routes, no type errors). Everything below is structural, not a compile failure — which is why it has gone unnoticed.

## 2. Critical findings

### C1 — The homepage is unstyled because Tailwind is not installed
`app/page.tsx` is written entirely with Tailwind utility classes (`min-h-screen bg-zinc-950`, `grid md:grid-cols-2`, …), but the repo has **no `tailwindcss` dependency, no `tailwind.config`, no PostCSS config, and no `@tailwind` directives** in any CSS file. Every class is inert. Verified by running the production build and screenshotting `/`: raw unformatted text, no fixed navbar, no grid, default browser buttons. The Recharts donut renders but the layout around it is collapsed.

### C2 — Two routers, two sites, two brands
- `app/` serves only `/` and calls the product **"PrivateCapital"** (also in the site `<title>`).
- `pages/` serves `/investor`, `/admin`, `/apply`, `/disclosures` and calls it **"Global Standard Capital"** (matching `README.md` and `lib/platform-data.ts`).
- Each router imports its own global stylesheet (`app/globals.css` vs `styles/globals.css`) — ~95% duplicated content that will silently drift.
- Clicking **Home** from any inner page drops the user from the polished gold/blue "Global Standard Capital" design onto the broken "PrivateCapital" page.

### C3 — Navigation is wired to routes and anchors that don't exist
- Homepage nav links to `#documents` and `#admin` — no such anchors on the page.
- `Frame` nav links to `/#model` and `/#security` — no such anchors exist on the current homepage (they belonged to a previous homepage version).
- The homepage has **no link at all** to `/investor`, `/apply`, or `/disclosures`.
- "Investor Login", "Learn More", and "Submit Application Preview" buttons have no handlers or hrefs — they do nothing.

### C4 — Placeholder copy shipped on the homepage
Each allocation pool on `/` renders literal **"Lorem ipsum description for this pool..."** — even though real descriptions for all four pools already exist in `lib/platform-data.ts` (the homepage hardcodes its own allocation array instead of importing them).

## 3. Dead code & dependency hygiene

- `components/site-chrome.tsx` — never imported anywhere (superseded by `frame.tsx`).
- `styles/Site.module.css` — one line, never imported.
- `pages/app-wrapper.tsx` — vestigial `/app-wrapper` route whose only content is "use the main navigation".
- `lucide-react` — declared in `package.json`, never imported.
- **No lockfile committed** — builds are not reproducible; a transitive dependency bump can break CI/deploys with no diff.

## 4. Missing engineering foundations

- No ESLint config or `lint` script (Next ships `eslint-config-next`; it's a one-line add).
- No `typecheck` script, no tests of any kind, no CI (`.github/workflows` absent) — nothing stops a broken PR from merging. Findings C1–C4 all merged through PRs.
- Next.js pinned at **14.2.4** — the 14.2.x line received multiple security patches after .4 (including cache-poisoning fixes affecting the Pages Router, and the middleware-bypass fix in 14.2.25). No middleware here, so exposure is limited today, but it should be on the latest 14.2.x patch at minimum.
- `tsconfig.json` targets `es5` — obsolete for Next 14; ES2017 is the recommended floor.
- No `engines` field or `.nvmrc`; no README setup instructions (README is 7 lines).
- Metadata/SEO: wrong site title ("PrivateCapital"), no favicon, no per-page titles or descriptions, no Open Graph tags, no custom 404 for the Pages Router. As a prototype it should probably also ship `robots` noindex until launch.
- `frame.tsx` carries an inline-style `ui` object that duplicates rules already present in `globals.css` (cards, buttons, muted text) — two styling systems inside the surviving router alone.

---

## 5. The plan

### Phase 1 — Make it one coherent site (highest priority, ~1 day) ✅ *Completed on this branch*

1. **Pick one router and one styling system.** Recommended: consolidate on the **App Router** (Next's strategic direction) with the existing custom-CSS design system (it's what the polished 80% of the site uses — adopting Tailwind properly is a bigger job for no visual gain). Move `investor`, `admin`, `apply`, `disclosures` into `app/`, convert `Frame` into the root `app/layout.tsx`, delete the `pages/` directory and `styles/globals.css`.
2. **Rebuild the homepage** in the surviving design system: hero, four-pool allocation section (keep the Recharts donut as a client component), security section — sourcing all copy from `lib/platform-data.ts`. This kills C1 and C4 together.
3. **Unify the brand** to "Global Standard Capital" everywhere, including `metadata` title/description.
4. **Fix navigation end-to-end:** give the homepage real `#model` / `#security` anchors so the existing nav works; link the homepage to `/investor`, `/apply`, `/disclosures`; make every button either navigate somewhere or be removed.
5. **Delete dead code:** `site-chrome.tsx`, `Site.module.css`, `app-wrapper.tsx`, the duplicate global stylesheet, and the `lucide-react` dependency.
6. **Fold `frame.tsx`'s inline `ui` object into CSS classes** so there is exactly one place styles live.

### Phase 2 — Engineering hygiene (~half day) ✅ *Completed on this branch (Node pin is 22, not 20 — Node 20 reached end-of-life in April 2026)*

7. Commit `package-lock.json`; add `engines` + `.nvmrc` (Node 20).
8. Add ESLint (`next lint` + `eslint-config-next`) and a `typecheck` script (`tsc --noEmit`); fix whatever they surface.
9. Upgrade Next.js to the latest 14.2.x patch (or take the Next 15 jump while the app is still small); bump `tsconfig` target to `ES2017`.
10. Add GitHub Actions CI: install → lint → typecheck → build on every PR. This is the guardrail that would have caught C1–C4.
11. Expand `README.md`: what the project is, setup, scripts, architecture notes, deploy target.

### Phase 3 — Make the prototype worthy of demoing (iterative)

12. **Working apply flow:** submit the form to an API route / server action with validation, store applications (even a JSON/SQLite queue), and surface them in the admin "Investor applications" queue so the demo tells a full story.
13. **Mock auth gating** for `/investor` and `/admin` — the site advertises "role-based access with 2FA"; even a demo login screen makes the claim credible and keeps the admin view from being world-readable when deployed.
14. **Accessibility pass:** label/input associations on the apply form (currently implicit only), focus-visible states, a real mobile nav (links wrap awkwardly below ~620px), `prefers-reduced-motion` for the animated background.
15. **SEO/meta polish:** favicon, per-page metadata, OG image, custom 404.
16. **Smoke tests:** a handful of Playwright tests (each route renders, nav links resolve, form validates) added to the CI pipeline.

### Sequencing rationale

Phase 1 comes first because every visitor lands on the broken page — no amount of tooling matters while `/` is unstyled and off-brand. Phase 2 exists so Phase 1 can never regress silently again. Phase 3 turns a static brochure into a demoable product and can be shipped incrementally.
