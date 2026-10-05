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

**Proposed product:** *an investor portal in a box for emerging managers.* The manager gets a branded workspace, invites their investors, reviews applications, publishes reporting and shares documents. **The software never touches money**, since capital moves through the manager's own bank and administrator. That sidesteps money-transmission and custody entirely, and makes this a normal SaaS business.

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

### M1: Foundation + validation (Oct 5–18)
- **Validate:** 15 interviews with target managers. Exit: ≥5 say they would trial it.
- **Decide:** direction, product name and domain, and a legal entity.
- **Legal:** counsel reviews positioning; draft ToS, privacy policy and DPA. They must state that we are software, not a broker, adviser or funding portal.
- **Tech:** real Postgres (replace the JSON file store, which cannot persist on serverless hosting), real auth with accounts and email login, multi-tenant data model, migrations, secrets management, Vercel preview deployments.
- Exit: a preview deployment where two test workspaces cannot see each other's data (proven by tests).

### M2: MVP product (Oct 19–Nov 15)
- Workspaces and roles (owner / admin / investor), email invites.
- Configurable intake form → review queue → approve / reject, with notification emails.
- Investor dashboard driven by real records. The ledger *records* commitments, calls and distributions but moves no money.
- Document vault with signed URLs, plus an audit log on every review and publish action.
- 2FA (TOTP or passkeys). White-label basics: logo, colors, custom domain.
- Exit: one design partner can run a real (small) raise's investor onboarding end-to-end.

### M3: Money for us + hardening (Nov 16–29)
- Stripe subscriptions: free tier (1 fund, ≤10 investors), Pro, Scale. *Pricing is a hypothesis; test it in interviews.*
- Rate limiting, error monitoring, product analytics, backups and restore drill, data export and deletion.
- Accessibility audit (axe in CI, WCAG 2.2 AA), performance budget, OWASP ASVS L1 self-review.
- Exit: the "worthy" bar in section 6 is met.

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

- **Security:** signed sessions ✅, per-role access ✅, no default credentials in production ✅, tenant isolation tests, rate limiting, 2FA, audit log, secrets only via env.
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
