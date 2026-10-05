import { describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { getDb, schema } from './db';
import { addLedgerEntry, createInvestor, getInvestor, isRealDate, listInvestors, listLedger } from './investors';
import { makeApprovedApplication, makeInvestor, makeTenant, sqlState } from './test-helpers';
import { addApplication } from './applications';

const add = (
  tenant: { workspaceId: string; userId: string },
  investorId: string,
  type: 'commitment' | 'capital_call' | 'distribution',
  amountCents: number,
  extra: { effectiveDate?: string; memo?: string } = {},
) =>
  addLedgerEntry({
    workspaceId: tenant.workspaceId,
    investorId,
    actorUserId: tenant.userId,
    type,
    amountCents,
    effectiveDate: extra.effectiveDate ?? '2026-03-01',
    memo: extra.memo ?? '',
  });

describe('creating investors', () => {
  it('normalizes the email and rejects a duplicate in the same workspace', async () => {
    const tenant = await makeTenant('inv');
    const email = `Person-${randomUUID().slice(0, 8)}@Example.COM`;
    const first = await createInvestor({ workspaceId: tenant.workspaceId, actorUserId: tenant.userId, name: 'P', email });
    expect(first.ok).toBe(true);

    const again = await createInvestor({
      workspaceId: tenant.workspaceId,
      actorUserId: tenant.userId,
      name: 'P again',
      email: email.toLowerCase(),
    });
    expect(again).toEqual({ ok: false, error: 'email_taken' });
    expect((await listInvestors(tenant.workspaceId))[0].email).toBe(email.toLowerCase());
  });

  it('lets two different workspaces each have an investor with the same email', async () => {
    const a = await makeTenant('same-a');
    const b = await makeTenant('same-b');
    const email = `shared-${randomUUID().slice(0, 8)}@example.com`;
    for (const tenant of [a, b]) {
      const result = await createInvestor({ workspaceId: tenant.workspaceId, actorUserId: tenant.userId, name: 'S', email });
      expect(result.ok).toBe(true);
    }
  });

  it('only turns approved applications of the same workspace into investors', async () => {
    const a = await makeTenant('app-a');
    const b = await makeTenant('app-b');
    const approved = await makeApprovedApplication(a, 'Approved Person');
    const pending = await addApplication(a.workspaceId, {
      name: 'Pending Person', email: 'pending@example.com', phone: '', country: '', amount: '', accredited: 'Not sure', notes: '',
    });
    const make = (workspace: typeof a, applicationId: string, email: string) =>
      createInvestor({ workspaceId: workspace.workspaceId, actorUserId: workspace.userId, name: 'X', email, applicationId });

    expect(await make(a, pending, 'p@example.com')).toEqual({ ok: false, error: 'application_not_approved' });
    // Workspace B tries to claim workspace A's approved application.
    expect(await make(b, approved, 'b@example.com')).toEqual({ ok: false, error: 'application_not_found' });
    expect((await make(a, approved, 'ok@example.com')).ok).toBe(true);
    // The same application cannot produce a second investor.
    expect(await make(a, approved, 'second@example.com')).toEqual({ ok: false, error: 'application_already_linked' });
  });
});

describe('ledger', () => {
  it('totals commitments, calls and distributions per investor', async () => {
    const tenant = await makeTenant('ledger');
    const { investorId } = await makeInvestor(tenant, 'Ledger Person');
    expect((await add(tenant, investorId, 'commitment', 10_000_000)).ok).toBe(true);
    expect((await add(tenant, investorId, 'commitment', 2_500_000)).ok).toBe(true);
    expect((await add(tenant, investorId, 'capital_call', 3_000_000)).ok).toBe(true);
    expect((await add(tenant, investorId, 'distribution', 150_000)).ok).toBe(true);

    const summary = await getInvestor(tenant.workspaceId, investorId);
    expect(summary).toMatchObject({ commitmentCents: 12_500_000, calledCents: 3_000_000, distributedCents: 150_000 });
    expect(await listLedger(tenant.workspaceId, investorId)).toHaveLength(4);
  });

  it('orders entries newest first and keeps memos', async () => {
    const tenant = await makeTenant('order');
    const { investorId } = await makeInvestor(tenant);
    await add(tenant, investorId, 'commitment', 100, { effectiveDate: '2026-01-10', memo: 'first' });
    await add(tenant, investorId, 'commitment', 100, { effectiveDate: '2026-02-10', memo: 'second' });
    expect((await listLedger(tenant.workspaceId, investorId)).map((row) => row.memo)).toEqual(['second', 'first']);
  });

  it('never lets a capital call exceed the uncalled commitment', async () => {
    const tenant = await makeTenant('overcall');
    const { investorId } = await makeInvestor(tenant);
    expect(await add(tenant, investorId, 'capital_call', 100)).toEqual({ ok: false, error: 'exceeds_uncalled' });

    await add(tenant, investorId, 'commitment', 10_000);
    expect(await add(tenant, investorId, 'capital_call', 10_001)).toEqual({ ok: false, error: 'exceeds_uncalled' });
    expect((await add(tenant, investorId, 'capital_call', 6_000)).ok).toBe(true);
    expect(await add(tenant, investorId, 'capital_call', 4_001)).toEqual({ ok: false, error: 'exceeds_uncalled' });
    expect((await add(tenant, investorId, 'capital_call', 4_000)).ok).toBe(true); // exactly the remainder
    expect(await add(tenant, investorId, 'capital_call', 1)).toEqual({ ok: false, error: 'exceeds_uncalled' });
  });

  it('serializes simultaneous capital calls so they cannot both succeed', async () => {
    const tenant = await makeTenant('race');
    const { investorId } = await makeInvestor(tenant);
    await add(tenant, investorId, 'commitment', 100_000);

    // Two $600 calls against a $1,000 commitment: only one may land.
    const results = await Promise.all(Array.from({ length: 6 }, () => add(tenant, investorId, 'capital_call', 60_000)));
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect((await getInvestor(tenant.workspaceId, investorId))?.calledCents).toBe(60_000);
  });

  it('rejects invalid amounts, dates and memos', async () => {
    const tenant = await makeTenant('invalid');
    const { investorId } = await makeInvestor(tenant);
    for (const amount of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1_000_000_000_001]) {
      expect(await add(tenant, investorId, 'commitment', amount), String(amount)).toEqual({ ok: false, error: 'invalid_amount' });
    }
    for (const date of ['2026-02-30', '26-1-1', '2026/01/01', '', '1999-12-31', '2101-01-01', "2026-01-01'; DROP TABLE x;--"]) {
      expect(await add(tenant, investorId, 'commitment', 100, { effectiveDate: date }), date).toEqual({ ok: false, error: 'invalid_date' });
    }
    expect(await add(tenant, investorId, 'commitment', 100, { memo: 'x'.repeat(501) })).toEqual({ ok: false, error: 'invalid_memo' });
    expect(await listLedger(tenant.workspaceId, investorId)).toHaveLength(0);
  });

  it('records an audit entry for each ledger change', async () => {
    const tenant = await makeTenant('audit');
    const { investorId } = await makeInvestor(tenant);
    await add(tenant, investorId, 'commitment', 5_000);
    const db = await getDb();
    const rows = await db.select().from(schema.auditLog);
    const mine = rows.filter((row) => row.workspaceId === tenant.workspaceId).map((row) => row.action).sort();
    expect(mine).toEqual(['investor.created', 'ledger.commitment']);
  });

  it('recognises real calendar dates only', () => {
    expect(isRealDate('2026-02-28')).toBe(true);
    expect(isRealDate('2028-02-29')).toBe(true);
    expect(isRealDate('2026-02-29')).toBe(false);
    expect(isRealDate('2026-13-01')).toBe(false);
  });
});

describe('investor data isolation between workspaces', () => {
  it('hides one workspace’s investors and ledger from another', async () => {
    const a = await makeTenant('iso-a');
    const b = await makeTenant('iso-b');
    const inv = await makeInvestor(a, 'Alpha Investor');
    await add(a, inv.investorId, 'commitment', 7_700_000);

    expect(await getInvestor(b.workspaceId, inv.investorId)).toBeNull();
    expect(await listInvestors(b.workspaceId)).toHaveLength(0);
    expect(await listLedger(b.workspaceId, inv.investorId)).toHaveLength(0);
    expect(await add(b, inv.investorId, 'commitment', 100)).toEqual({ ok: false, error: 'investor_not_found' });
    // And the failed attempt wrote nothing into A's ledger.
    expect(await listLedger(a.workspaceId, inv.investorId)).toHaveLength(1);
  });
});

describe('database-level tenant guarantees (bypassing application code)', () => {
  it('rejects a ledger row whose workspace differs from its investor’s', async () => {
    const a = await makeTenant('fk-a');
    const b = await makeTenant('fk-b');
    const inv = await makeInvestor(a);
    const db = await getDb();

    const attempt = db.insert(schema.ledgerEntries).values({
      workspaceId: b.workspaceId, // wrong tenant
      investorId: inv.investorId,
      type: 'commitment',
      amountCents: 100,
      effectiveDate: '2026-01-01',
    });
    await expect(attempt).rejects.toSatisfy((error) => sqlState(error) === '23503'); // foreign_key_violation
  });

  it('rejects an invitation whose workspace differs from its investor’s', async () => {
    const a = await makeTenant('fk-inv-a');
    const b = await makeTenant('fk-inv-b');
    const inv = await makeInvestor(a);
    const db = await getDb();

    const attempt = db.insert(schema.invitations).values({
      workspaceId: b.workspaceId,
      investorId: inv.investorId,
      email: inv.email,
      tokenHash: `hash-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(attempt).rejects.toSatisfy((error) => sqlState(error) === '23503');
  });

  it('rejects an investor linked to another workspace’s application', async () => {
    const a = await makeTenant('fk-app-a');
    const b = await makeTenant('fk-app-b');
    const applicationId = await makeApprovedApplication(a, 'Owned By A');
    const db = await getDb();

    const attempt = db.insert(schema.investors).values({
      workspaceId: b.workspaceId,
      name: 'Cross',
      email: `cross-${randomUUID()}@example.com`,
      applicationId,
    });
    await expect(attempt).rejects.toSatisfy((error) => sqlState(error) === '23503');
  });

  it('rejects non-positive ledger amounts even when inserted directly', async () => {
    const tenant = await makeTenant('check');
    const inv = await makeInvestor(tenant);
    const db = await getDb();
    for (const amountCents of [0, -50]) {
      const attempt = db.insert(schema.ledgerEntries).values({
        workspaceId: tenant.workspaceId,
        investorId: inv.investorId,
        type: 'distribution',
        amountCents,
        effectiveDate: '2026-01-01',
      });
      await expect(attempt).rejects.toSatisfy((error) => sqlState(error) === '23514'); // check_violation
    }
  });
});
