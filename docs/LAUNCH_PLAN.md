# Launch Plan: from prototype to a product people pay for

**Written:** 2026-10-05 · **Horizon:** public launch the week of Dec 7, 2026
**Status of the codebase:** assessed, consolidated, hardened, CI green (see `ASSESSMENT.md`)

---

## 1. The goal

> **By Dec 31, 2026: a live, secure, legally honest product with real paying customers, launched in front of the audience that needs it.**

"One of the best internet projects of 2026" and "goes viral" are outcomes, not plans. Nobody can build virality in. What can be built is a product worth talking about and distribution loops that can be measured. So the goal is split:

| | Target | Controllable? |
|---|---|---|
| **Product** | Passes the "worthy" bar in section 6 (security, a11y, performance, reliability) | Yes |
| **Business** | 5 design partners → 3 paying customers by Dec 31 | Mostly |
| **Launch** | Product Hunt top 10 of the day, Show HN reaching the front page | Partly |
| **Virality** | A built-in referral loop that is measured, not assumed | Loop: yes. Outcome: no |

These are targets, not promises.

## 2. The gate: what this must not become

As written today, the site pitches the public on pooled "Stocks / Forex / Real Estate / IT Businesses" pools with a 3-year lock and a $1,200 minimum. **Taking money from the public into a pool like that is an offering of securities.** It needs a legal entity, a fund structure, a registration or exemption (e.g. Reg D / Reg CF / Reg A+ in the US, and equivalents elsewhere), KYC/AML, custody and securities counsel. There is no fund, entity or asset behind this repo.

So the plan **does not** include collecting deposits, advertising returns, or growth-hacking an investment pool. That path puts both the owner and the depositors at risk, and "go viral and earn money" with it is the pattern regulators go after. (This is not legal advice. Talk to securities counsel before any version of this touches real money.)

## 3. The pivot that keeps everything already built

The repo already contains the skeleton of **investor-portal software**: apply → intake review queue → admin approval → investor dashboard (commitment, lock period, reporting) → disclosures. That's what small fund managers, syndicate leads, SPV sponsors and real-estate sponsors currently run on spreadsheets, email and PDFs.

**Chosen product (direction confirmed by the owner, 2026-10-05):** *an investor portal in a box for emerging managers.* The manager gets a branded workspace, invites their investors, reviews applications, publishes reporting and shares documents. **The software never touches money**, since capital moves through the manager's own bank and administrator. That sidesteps money-transmission and custody entirely, and makes this a normal SaaS business.

Hypotheses to **validate with interviews before building too much** (incumbents such as Juniper Square and Carta exist and mostly serve larger managers):

1. Sub-$20M managers are underserved and currently use spreadsheets plus email.
2. They will pay roughly $100–300/month per fund for a branded portal that makes them look institutional.
3. Investors who are limited partners in several funds see the product repeatedly, which creates the one *real* referral loop here.

**Alternatives if the interviews say no:**
- **Template or starter kit** for developers: fastest revenue, lowest risk, builds an audience.
- **Simulated portfolio / education product:** consumer-friendly and shareable, with no real money.

## 4. Milestones

Each milestone has exit criteria. Don't start the next one until the current one is met.

### M0: Truth and safety baseline ✅ *(done)*
- Consolidated to one site, CI green on GitHub (lint, typecheck, build, e2e).
- **Found and fixed a forgeable session cookie.** `demo-session=admin` used to open the admin console. Sessions are now HMAC-signed and expiring, with per-role codes, no production defaults, and a regression test.
- Baseline security headers.

### M1: Foundation + validation (Oct 5–18): engineering ✅, validation and legal open
- **Validate:** 15 interviews with target managers. Exit: ≥5 say they would trial it. *(Open: needs the owner.)*
- **Decide:** ~~direction~~ ✅ confirmed. Product name and domain, and a legal entity are still open. "LP Portal" is a working name in `lib/product.ts`.
- **Legal:** counsel reviews positioning; draft ToS, privacy policy and DPA. They must state that we are software, not a broker, adviser or funding portal. *(Open. The `/legal` page is a labelled draft; signup collects emails and passwords with no ToS or privacy policy yet, so keep it closed-beta only.)*
- **Tech, done ✅:** Postgres data layer (Drizzle, generated SQL migrations; real Postgres in production, embedded PGlite for zero-setup dev), real accounts (scrypt passwords, server-side hashed sessions), multi-tenant model (workspaces and memberships), tenant-scoped data access with an audit log, closed-beta signup gate. The old JSON file store and shared-code demo auth are gone.
- **Tech, still open (needs the owner's accounts):** a hosted Postgres, a Vercel project and preview deployment, secrets set on the host, a domain.
- **Exit criterion (isolation proven by tests): met.** Unit tests on both drivers plus a browser attack test, mutation-checked, all run in CI against Postgres. Only the *preview deployment* half of the exit criterion waits on accounts.

### M2: MVP product (Oct 19–Nov 15): core loop ✅, remainder open
**Done (first slice, verified):**
- ✅ Investor register per workspace and an append-only ledger of commitments, capital calls and distributions. It *records* what the manager reports and moves no money. Capital calls cannot exceed the uncalled commitment (row-locked, concurrency-tested).
- ✅ Invitations: single-use, expiring, hashed-at-rest links; the investor creates an account or signs in as the invited email. Re-issuing a link revokes the old one.
- ✅ Investor dashboard driven by real records. Each investor sees only their own figures (tested between investors in the same workspace and across workspaces).
- ✅ Audit log on investor creation, every ledger entry, and invitation creation/acceptance, shown as recent activity.
- ✅ Tenant isolation hardened at the database: composite foreign keys make cross-workspace ledger/invitation rows impossible, regardless of application code.
- ✅ Authorization of server actions tested directly (replayed requests from an investor and an anonymous client), plus a structural test and mutation checks.

**Still open in M2:**
- Email delivery of invitations and notifications (needs an email provider account; today the manager copies the link).
- Teammate (admin) invites, so a workspace can have more than one manager.
- Configurable intake form.
- Document vault with signed URLs, and publishing reporting.
- 2FA (TOTP or passkeys). White-label basics: logo, colors, custom domain.
- Exit: one design partner can run a real (small) raise's investor onboarding end-to-end. The core loop for that exists now; it needs a hosted deployment and a design partner.

### M3: Money for us + hardening (Nov 16–29): hardening ✅ (first pass), billing and a few items open
**Done (verified, mutation-checked where it guards security):**
- ✅ Rate limiting on sign-in (layered per account+address, per account, per address), signup, the public intake form, and invitation acceptance; DB-backed so it holds across serverless instances; client address read through a configurable number of trusted proxy hops.
- ✅ Strict nonce-based Content-Security-Policy; tests prove an injected script and an injected form are blocked, framing is denied, and every main flow runs with zero violations.
- ✅ Accessibility audit with axe-core (WCAG 2.2 A/AA) on every page and interaction state in CI, zero violations. *Automated testing finds only part of WCAG: a manual keyboard-only and screen-reader pass is still owed.*
- ✅ Data export (owner workspace export; personal export) and deletion (workspace; account), with exports provably secret-free and scoped.
- ✅ Error boundaries that leak nothing, proven against an unreachable database and 13 hostile URLs.
- ✅ Backup/restore drill (`npm run db:drill`) that restores a dump into a scratch database and proves it identical; run, and shown able to fail.
- ✅ Security self-assessment against OWASP ASVS L1 (`docs/SECURITY.md`) and an operations guide (`docs/OPERATIONS.md`).
- ✅ **Framework upgrade forced by an audit finding:** every Next.js 14.x release has published advisories (several critical or high, including one about CSP nonces, which this app uses) and no 14.x fix exists. Upgraded to Next 15.5.27 with React 19; production audit is now 0, enforced by a CI gate.
- ✅ Password minimum raised to 12 characters (ASVS 2.1.1), enforced and tested server-side.

**Still open in M3:**
- **Password reset and change** (needs an email provider). This is the most important missing security feature for real users.
- Stripe subscriptions: **deliberately not started.** Pricing is still an unvalidated hypothesis (the customer interviews have not happened) and checkout needs your Stripe account.
- Postgres row-level security as a second layer behind the application-level tenant filters, then re-run the tenancy tests as a non-superuser role.
- Error monitoring, product analytics, uptime checks and alerting (need accounts); a performance budget.
- Per-investor erasure for managers (today a manager can only delete the whole workspace), a breached-password check, 2FA, per-user session management.
- An independent security review and a formal threat model.
- Exit: the "worthy" bar in section 6 is met. The security items above are the gap.

### M4: Private beta (Nov 16–Dec 6, overlapping)
- 5–10 design partners onboarded by hand; weekly feedback calls.
- Capture one case study and testimonials. Fix the top 10 issues.
- Build launch assets: demo video, screenshots, a public sandbox, and a free tool (e.g. a distribution-waterfall or lock-period calculator) that stands on its own as a shareable asset.

### M5: Public launch (week of Dec 7)
- **Tuesday Dec 8:** Product Hunt + Show HN + LinkedIn/X, with the sandbox and free tool as the hook.
- Targeted outreach to emerging-manager communities, newsletters and podcasts.
- A "powered by" badge on every investor-facing portal, the measured referral loop.
- **Window note:** the last two weeks of December are a weak launch window. If M4 slips, move the launch to **Jan 12–14** instead of forcing it.
- Dec 14–31: convert beta users to paid, write a "what we learned" post, plan Q1.

## 5. Monetization (hypothesis, to be tested)

| Plan | Price | Includes |
|---|---|---|
| Free | $0 | 1 fund, ≤10 investors, "powered by" badge |
| Pro | ~$99/mo per fund | ≤50 investors, documents, custom branding |
| Scale | ~$299/mo per fund | ≤250 investors, custom domain, audit exports, priority support |

A realistic year-end bar is **3 paying customers (~$300–900 MRR)** with a validated willingness to pay. A bigger number would be a bonus, not a plan.

## 6. The "worthy" bar (ship criteria)

- **Security:** hashed passwords and revocable server-side sessions ✅, per-workspace authorization ✅, tenant isolation tests ✅, audit log ✅, fails closed without a production database ✅, rate limiting ✅, strict CSP ✅, clean production dependency audit enforced in CI ✅, data export and deletion ✅. Still to do: **password reset**, 2FA, row-level security, monitoring and alerting, an independent review (see `docs/SECURITY.md`).
- **Quality:** CI green (lint, typecheck, build, e2e) ✅. Add axe accessibility checks and a Lighthouse budget (≥95 performance, ≥95 accessibility).
- **Reliability:** error monitoring, uptime check, tested backup restore.
- **Legal:** ToS, privacy policy, DPA, counsel-approved positioning.
- **Honesty:** no fabricated testimonials, metrics or "as seen in" claims, ever.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Regulatory drift (becoming an offering platform) | Software-only, no money movement, counsel review, ToS wording |
| PII breach (investor data is sensitive) | M3 hardening, minimal data retention, plan SOC 2 later |
| Incumbents / long B2B sales cycles | Niche down to emerging managers, free tier, hands-on beta |
| Virality doesn't happen | Plan on measured loops and direct outreach, not luck |
| Holiday launch window | Fallback launch date Jan 12–14 |

## 8. What I need from you (I can't do these)

1. **Confirm the direction** (section 3) or pick an alternative. Everything after M1 depends on it.
2. **Legal:** a business entity and a securities-aware lawyer for the positioning and the ToS.
3. **Accounts and budget:** a Vercel team, a Postgres provider, Stripe, an email provider, and a domain.
4. **Introductions** to 15 target managers for the interviews. This is the highest-leverage item on the list.
5. Whether this repo stays public. That's fine for a template, but the SaaS core may want to be private.
