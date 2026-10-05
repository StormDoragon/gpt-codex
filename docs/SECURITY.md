# Security self-assessment (OWASP ASVS 4.0.3, Level 1)

Written 2026-10-05, for commit state at the end of milestone M3. **This is a self-assessment,
not a certification and not a penetration test.** The controls were written and tested by the
same party that assessed them. Before holding real investor data, get an independent review.

Status key: **Met** = a control exists *and* an automated test or check demonstrates it ·
**Partial** = exists with a stated limit · **Not met** · **Host** = depends on the deployment,
which does not exist yet, so it cannot be verified here · **N/A** = the feature does not exist.

## Summary

| | Rows |
|---|---|
| Met | 43 |
| Partial | 3 |
| Not met | 7 |
| Host | 2 |
| N/A | 2 |

**Scope:** each row groups related ASVS requirements into one control, so these counts are of
*this document's rows*, not of ASVS's individual requirements. It maps the main areas of
Level 1 and cites the ASVS numbers it is sure of; it is not an item-by-item assessment of every
Level 1 requirement.

The seven "Not met" rows are the honest to-do list for launch: a formal threat model, a
breached-password check, password reset and change, multi-factor authentication, per-user
session management, row-level security as a second tenancy layer, and log collection with
alerting.

## V1 Architecture, design and threat modeling

| Control | Status | Evidence / note |
|---|---|---|
| Tenancy and trust boundaries are designed and documented | Met | README "Security model"; one tenant boundary (`workspace_id`), one authorization gate (`requireMembership`) |
| Formal threat model / data-flow diagram | Not met | None written. Do this before a security review. |
| Security controls enforced server-side, never trusting the client | Met | Server actions re-check membership; replay test sends captured actions as an investor and an anonymous client (`tests/investors.spec.ts`) |

## V2 Authentication

| Control | Status | Evidence / note |
|---|---|---|
| Passwords ≥ 12 characters (2.1.1) | Met | `MIN_PASSWORD_LENGTH = 12`, enforced server-side even with the browser check removed (`tests/e2e.spec.ts`), pinned by `lib/auth/password-policy.test.ts` |
| Long passphrases allowed, ≥ 64 (2.1.2); no composition rules | Met | Maximum 200 |
| Check passwords against a breached-password list (2.1.7) | Not met | Needs a data source or API |
| Anti-automation against guessing and stuffing (2.2.1) | Met | Layered DB-backed limits: per account+address, per account, per address (`tests/rate-limit.spec.ts`; 7 mutations caught) |
| Passwords stored with a salted, slow hash (2.4) | Met | scrypt N=2^15 r=8 p=3, parameters stored per hash (`lib/auth/password.ts`) |
| Generic failure messages; no account enumeration | Met | Identical error and timing for unknown vs wrong; unknown accounts rate-limited identically (tests) |
| Credential recovery / change password (2.5) | **Not met** | **No reset or change flow exists.** Needs an email provider. |
| Multi-factor authentication | Not met | Not required at L1; planned |

## V3 Session management

| Control | Status | Evidence / note |
|---|---|---|
| Random 256-bit tokens; only a hash is stored | Met | `lib/tokens.ts`, `lib/accounts.ts`; unit test checks the DB never holds the token |
| New session on every login; logout ends it server-side | Met | `endSession` deletes the row; e2e: signed-out cookie grants nothing |
| Cookie flags: HttpOnly, SameSite=Lax, Secure in production | Met | e2e asserts HttpOnly and SameSite |
| Forged or guessed cookies grant nothing | Met | e2e tries five forgeries |
| Session lifetime | Partial | Absolute 14-day expiry; no idle timeout; no `__Host-` cookie prefix |
| User can list and end their own sessions | Not met | |

## V4 Access control

| Control | Status | Evidence / note |
|---|---|---|
| Deny by default: no membership means 404, which hides existence | Met | `requireMembership`; e2e opens other workspaces' pages as every role |
| Every object reference is scoped to the caller's workspace (IDOR) | Met | Every query filters `workspace_id`; mutation-checked; browser attacks that tamper with ids and slugs |
| Cross-tenant rows impossible even if code is wrong | Met | Composite foreign keys + CHECKs, tested with raw SQL that must be rejected (`lib/investors.test.ts`) |
| Investors cannot see each other's data | Met | `getOwnPortfolio` has no id parameter; tested between investors in one workspace |
| Every server action and route handler authorizes itself | Met | Structural test (`lib/actions-authorization.test.ts`) plus the replay test; 3 mutations caught |
| CSRF | Met | Server actions use Next's origin check; exports are POST-only with SameSite=Lax; a GET is refused (405) |
| Second tenancy layer in the database (row-level security) | Not met | Planned |

## V5 Validation, sanitization and encoding

| Control | Status | Evidence / note |
|---|---|---|
| Server-side validation with length caps on every field | Met | `readText`, `isValidEmail`, `isUuid`, money and date parsers (unit tests) |
| SQL injection | Met | Parameterized queries throughout (Drizzle); hostile-URL tests (13 cases) |
| Output encoding / XSS | Met | React escapes by default; nonce-based CSP blocks injected scripts (tested by injecting one) |
| Open redirect | Met | `safeNextPath` allows same-site relative paths only (unit tested) |
| Money is never floating point | Met | Integer cents, exhaustive parser tests |
| Unsafe deserialization, command execution, SSRF | N/A | The app makes no outbound requests and runs no commands |

## V6 Cryptography

| Control | Status | Evidence / note |
|---|---|---|
| Cryptographic randomness from the platform CSPRNG | Met | `crypto.randomBytes` for tokens |
| Standard algorithms only; no custom crypto | Met | scrypt, SHA-256, `timingSafeEqual` |
| Encryption at rest | Host | The application stores no field-level secrets; disk encryption is the database provider's |

## V7 Error handling and logging

| Control | Status | Evidence / note |
|---|---|---|
| Errors never expose internals | Met | Error boundary shows an opaque reference only; tested against an unreachable database and 13 hostile URLs for SQL, stack traces, paths, connection strings |
| Security events logged without secrets | Partial | Failures, blocks, exports and deletions are logged as JSON (`docs/OPERATIONS.md`); successful logins are **not** logged |
| Log collection, retention and alerting | Not met | No log store or alerts exist yet |

## V8 Data protection

| Control | Status | Evidence / note |
|---|---|---|
| Sensitive pages are not cached | Met | Every page returns `Cache-Control: private, no-cache, no-store` (checked on public and authenticated pages) |
| No sensitive data in URLs | Partial | The invitation token is in the link path by design; it is single-use, expires in 7 days, hashed at rest, and the page sends `no-referrer` |
| Data export and deletion available | Met | Owner workspace export, personal export, workspace and account deletion; secrets provably excluded (`lib/export.test.ts`) |
| Backups restorable | Met | `npm run db:drill` passes and was shown able to fail (`docs/OPERATIONS.md` §3). Provider-side backups: not set up |
| No client-side storage of sensitive data | Met | No localStorage/sessionStorage use |

## V9 Communications

| Control | Status | Evidence / note |
|---|---|---|
| HSTS | Met | `Strict-Transport-Security: max-age=31536000; includeSubDomains` (tested) |
| TLS configuration and certificates | Host | Terminated by the hosting platform |

## V10 Malicious code and supply chain

| Control | Status | Evidence / note |
|---|---|---|
| Dependencies audited, with a failing gate | Met | `npm audit --omit=dev --audit-level=high` in CI; 0 production vulnerabilities |
| Pinned, reproducible installs | Met | Exact versions + lockfile + `npm ci` |
| No third-party scripts | Met | CSP allows none; no CDN assets |

## V11 Business logic

| Control | Status | Evidence / note |
|---|---|---|
| Limits that cannot be raced past | Met | Capital calls cannot exceed the uncalled commitment under a row lock; invitations are single-use via one atomic update; 40 simultaneous requests against a limit of 10 admit exactly 10. All mutation-checked |
| Actions are auditable | Met | `audit_log` for reviews, investors, ledger entries, invitations, exports |

## V12 Files and resources

| Control | Status | Evidence / note |
|---|---|---|
| File upload handling | N/A | No uploads yet. **Re-assess when the document vault is built** |

## V13 API and web service

| Control | Status | Evidence / note |
|---|---|---|
| Request validation on server actions and route handlers | Met | See V5 |
| HTTP methods restricted | Met | Route handlers are POST-only (structural test) |

## V14 Configuration

| Control | Status | Evidence / note |
|---|---|---|
| Content-Security-Policy | Met | Per-request nonce + `strict-dynamic`; `frame-ancestors 'none'`, `form-action 'self'`, `object-src 'none'`, no `unsafe-eval` / script `unsafe-inline`. Tests: injected inline script blocked, injected form cannot post off-site, framing denied, zero violations across main flows; 3 mutations caught. Reporting endpoint: not configured |
| `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` | Met | Tested |
| No default credentials; fails closed | Met | Production refuses to start without `DATABASE_URL` |
| Components up to date | Met | Next.js 15.5.27, React 19.3.0 (see `docs/OPERATIONS.md` §8 for why 14.x was abandoned) |
| Software version disclosure removed | Met | `X-Powered-By` removed (tested) |
| Accessibility (not an ASVS item, tracked here) | Met | axe-core, WCAG 2.2 A/AA, zero violations on every page and state. **Automated testing finds only part of WCAG issues; keyboard-only and screen-reader passes are still manual work** |

## What to do before real investor data

1. Add password reset and change (needs an email provider), and a breached-password check.
2. Write a threat model and have someone independent review this assessment and attempt to break the tenancy and authorization controls.
3. Add Postgres row-level security as a second layer, then repeat the tenancy tests as a non-superuser role.
4. Choose hosting and verify its TLS, encryption at rest and point-in-time recovery; set up log collection and alerting.
5. Add 2FA and per-session management.
6. Publish terms of service and a privacy policy, reviewed by counsel (`docs/LAUNCH_PLAN.md`).
