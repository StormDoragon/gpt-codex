# Operations guide

How to run, back up, monitor and recover the product. Written 2026-10-05. Where something
has not been set up or verified yet, this document says so rather than implying it works.

## 1. Configuration

All configuration is environment variables. See `.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | **Production** | Postgres connection string. Production refuses to start without it. |
| `SIGNUP_INVITE_CODE` | No | If set, creating a workspace requires this code (closed beta). Set it to a random string to close signups quickly. |
| `TRUSTED_PROXY_HOPS` | No (default `1`) | How many proxies in front of the app you trust. The client address is read from `X-Forwarded-For` counting this many entries from the right. Set it correctly for your host; a wrong value either lets clients choose their own rate-limit identity (too high) or puts everyone in one bucket (too low). |
| `PGLITE_DIR` | No | Embedded dev database location (default `.data/pglite`, or `memory://`). |
| `ALLOW_EMBEDDED_DB` | No | `1` lets a production build use the embedded database. For local end-to-end runs only. |

## 2. Deploying

1. Provision Postgres (any provider; the driver is pooler-safe).
2. Set `DATABASE_URL` (and `SIGNUP_INVITE_CODE`, `TRUSTED_PROXY_HOPS`) on the host.
3. Run `npm run db:migrate` against that database **before** the new build takes traffic. Migrations are plain SQL in `drizzle/`.
4. `npm run build && npm run start`, or deploy to a Next.js host.

CI (`.github/workflows/ci.yml`) runs, against a Postgres 16 service: a production-dependency audit, lint, typecheck, migrations, unit tests on both database drivers, the build, and the end-to-end suite.

## 3. Backups and the restore drill

**A backup you have never restored is a hope, not a backup.**

- **Primary protection:** use your Postgres provider's point-in-time recovery and keep its retention window as long as your obligations require. *Not yet configured: there is no hosted database.* Verify the provider's retention and restore procedure when one is chosen; this repository cannot test it.
- **Logical backup you control:** `npm run db:drill` (see `scripts/backup-restore-drill.sh`) dumps a database, restores the dump into a brand-new scratch database, and proves the copy is identical: every table's row count and a content checksum, plus constraint and index counts. It only ever reads the source, drops its scratch database afterwards, and exits non-zero on any difference.

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname npm run db:drill
# needs pg_dump, pg_restore and psql (version >= the server's) and a role that may CREATE DATABASE;
# set DRILL_ADMIN_URL if that role differs from DATABASE_URL's.
```

**Drill performed 2026-10-05** against a local PostgreSQL 16.13 database populated by the
test suites:

```
constraints (public) | 29
drizzle.__drizzle_migrations | rows=3 | md5=5ff85f3a…
indexes (public) | 26
public.applications | rows=7 | …        public.investors | rows=20 | …
public.audit_log | rows=66 | …           public.invitations | rows=18 | …
public.ledger_entries | rows=10 | …      public.memberships | rows=20 | …
public.rate_limits | rows=8 | …          public.sessions | rows=0 | …
public.users | rows=26 | …              public.workspaces | rows=11 | …
PASS: the restored database is identical to the source.
```

The drill was also shown to be able to fail: altering a single workspace name in the restored
copy (same row count, different content) made it report a checksum mismatch and exit 1, and no
scratch database was left behind.

**What the drill does not prove:** it exercises a logical dump and restore on one server, not
your provider's point-in-time recovery, not restore *time* at production data volume, and not
cross-version restores. Run it before relying on a backup, after schema changes, and on a
schedule (quarterly at minimum). Record the recovery point and recovery time you actually
measure once there is a real deployment; today they are unknown.

## 4. Logs and security events

Security-relevant events are written as one JSON line each to stdout, where hosting platforms
collect logs (`lib/log.ts`):

| Event | When |
|---|---|
| `login.failed` / `login.blocked` | A failed sign-in / a sign-in refused by a rate limit |
| `signup.blocked`, `intake.blocked`, `invite.blocked` | A rate limit refused the request |
| `workspace.exported`, `account.exported` | A data export was downloaded |
| `workspace.deleted`, `account.deleted` | A workspace or account was deleted |

Fields: `time`, `event`, `ip`, and a short non-reversible `account` handle (the first 12 hex
characters of a SHA-256 of the email) or workspace slug. **Never** logged: passwords, session
or invitation tokens, full email addresses. Client IP addresses are personal data under some
laws; set a retention period on your log store accordingly.

Not set up: log retention policy, alerting on these events, or a log drain. Alert on a spike of
`login.blocked` and on any `workspace.deleted` outside business hours once logs are collected.
Application errors go to the platform log with a stack trace; visitors only ever see an opaque
reference (`digest`) that matches the log entry. There is no error-monitoring service yet.

## 5. Rate limits

Counters live in Postgres (`rate_limits`), so limits hold across serverless instances.

| Limit | Allowed | Window |
|---|---|---|
| Failed sign-ins per (account, address) | 8 | 15 min |
| Failed sign-ins per account (all addresses) | 40 | 1 hour |
| Failed sign-ins per address (all accounts) | 30 | 15 min |
| Signups per address | 5 | 1 hour |
| Intake form submissions per address / per workspace | 10 / 100 | 1 hour |
| Invitation acceptances per address | 20 | 1 hour |

Tuned for a closed beta; revisit with real traffic (`lib/limits.ts`). The per-account cap means
a determined attacker can lock an account for up to an hour after 40 wrong guesses from many
addresses. That is a deliberate trade against unlimited guessing.

**Unblock a person** (for example a locked-out account), by SQL:

```sql
DELETE FROM rate_limits WHERE key LIKE 'login-fail-%';            -- everyone
-- or one account: the key suffix is the SHA-256 hex of the lowercased email
```

## 6. Incident basics

| Situation | Action |
|---|---|
| Suspected stolen sessions | `DELETE FROM sessions;` signs everyone out immediately. Sessions are server-side, so this works at once. |
| Spam or abuse signups | Set `SIGNUP_INVITE_CODE` to a random value and redeploy; signups need the code from then on. |
| An account is compromised | Delete its sessions (`DELETE FROM sessions WHERE user_id = …`). There is **no password reset yet** (see §8), so resetting a password currently needs a manual update of `users.password_hash`. |
| Suspected data breach | Preserve logs and a database snapshot first. Do not delete anything. Involve counsel: notification duties depend on jurisdiction and on who the data controller is (the fund manager, for investor data). |
| Need to take the site down | Deploy with a maintenance page, or pause the project on the host. |

## 7. Data requests

- **Export:** a workspace owner downloads a JSON export from *Settings*; any person downloads their own from *Account*. Neither ever contains password hashes, session data, or invitation tokens.
- **Deletion:** an owner can delete a whole workspace; anyone can delete their own account. Deleting an account removes the login and sessions but **not** the records a fund manager keeps about an investor: those are the manager's records, and the manager is responsible for them. There is **no per-investor erasure tool for managers yet**; today a manager can only delete the whole workspace. Build that before onboarding a manager who may receive erasure requests.

## 8. Dependencies

- `npm audit --omit=dev --audit-level=high` is a CI gate. As of 2026-10-05 production dependencies have **0** known vulnerabilities.
- Next.js was upgraded from 14.2.35 to 15.5.27 because **every 14.x release is affected by published advisories and no 14.x fix exists** (the first patched line is 15.5.24+). PostCSS is overridden to 8.5.29 (`package.json` `overrides`) because Next pins an older, vulnerable copy.
- **Accepted, dev-only:** `npm audit` still lists 9 findings in development tooling that never ships: esbuild's dev-server issue (via `drizzle-kit`) and glob/brace-expansion denial-of-service (via the linter). They concern tools run on this repository's own files.
- `next lint` is deprecated in Next 15 and removed in Next 16; move ESLint to its own CLI before the next major upgrade.

## 9. Known gaps (nothing below is set up)

- No hosted deployment, so no verified provider-side backups, uptime checks, or alerting.
- No error-monitoring service (Sentry or similar).
- **No password reset or change flow** (needs an email provider).
- No two-factor authentication; no view of, or "sign out everywhere" for, a user's own sessions.
- No Postgres row-level security as a second layer behind the application's tenant filters.
- No per-investor erasure tool for managers.
- No performance budget or load test.
