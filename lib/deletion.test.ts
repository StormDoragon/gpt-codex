import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { authenticate, createSessionRow, findSessionUser } from './accounts';
import { deleteAccount, deleteWorkspace } from './deletion';
import { getDb, schema } from './db';
import { createInvestor, listInvestors, listLedger, addLedgerEntry } from './investors';
import { createInvitation } from './invitations';
import { listMemberships } from './workspaces';
import {
  TEST_PASSWORD,
  makeActiveInvestor,
  makeApprovedApplication,
  makeInvestor,
  makeTenant,
  type Tenant,
} from './test-helpers';

const { applications, auditLog, investors, invitations, ledgerEntries, memberships } = schema;

async function counts(workspaceId: string) {
  const db = await getDb();
  const count = async (table: typeof applications | typeof auditLog | typeof investors | typeof invitations | typeof ledgerEntries | typeof memberships) =>
    (await db.select().from(table).where(eq(table.workspaceId, workspaceId))).length;
  return {
    memberships: await count(memberships),
    applications: await count(applications),
    investors: await count(investors),
    invitations: await count(invitations),
    ledgerEntries: await count(ledgerEntries),
    auditLog: await count(auditLog),
  };
}

async function populated(label: string) {
  const tenant = await makeTenant(label);
  const active = await makeActiveInvestor(tenant, `${label} Active`);
  await addLedgerEntry({
    workspaceId: tenant.workspaceId,
    investorId: active.investorId,
    actorUserId: tenant.userId,
    type: 'commitment',
    amountCents: 500_000,
    effectiveDate: '2026-03-01',
    memo: '',
  });
  // An investor created FROM an application exercises the composite application foreign key too.
  const applicationId = await makeApprovedApplication(tenant, `${label} Applicant`);
  const fromApplication = await createInvestor({
    workspaceId: tenant.workspaceId,
    actorUserId: tenant.userId,
    name: `${label} From App`,
    email: `from-app-${label}@example.com`,
    applicationId,
  });
  if (!fromApplication.ok) throw new Error('setup failed');
  const invitee = await makeInvestor(tenant, `${label} Invitee`);
  await createInvitation({ workspaceId: tenant.workspaceId, investorId: invitee.investorId, actorUserId: tenant.userId });
  return { tenant, active };
}

describe('deleting a workspace', () => {
  it('removes everything in it and nothing in any other workspace', async () => {
    const doomed = await populated('del-a');
    const survivor = await populated('del-b');
    const survivorBefore = await counts(survivor.tenant.workspaceId);
    const doomedBefore = await counts(doomed.tenant.workspaceId);
    expect(Object.values(doomedBefore).every((n) => n > 0), JSON.stringify(doomedBefore)).toBe(true);

    expect(await deleteWorkspace(doomed.tenant.workspaceId)).toBe(true);

    expect(await counts(doomed.tenant.workspaceId)).toEqual({
      memberships: 0, applications: 0, investors: 0, invitations: 0, ledgerEntries: 0, auditLog: 0,
    });
    expect(await counts(survivor.tenant.workspaceId)).toEqual(survivorBefore);
    expect((await listInvestors(survivor.tenant.workspaceId)).length).toBe(3);
  });

  it('keeps people’s logins (an investor’s account is theirs, and may belong to other workspaces)', async () => {
    const { tenant, active } = await populated('del-logins');
    const elsewhere = await makeTenant('del-elsewhere');
    await deleteWorkspace(tenant.workspaceId);

    expect((await authenticate(active.email, TEST_PASSWORD))?.id).toBe(active.userId);
    expect((await authenticate(tenant.email, TEST_PASSWORD))?.id).toBe(tenant.userId);
    expect(await listMemberships(active.userId)).toEqual([]); // no longer a member of anything
    expect((await listMemberships(elsewhere.userId)).length).toBe(1);
  });

  it('reports false for a workspace that does not exist', async () => {
    expect(await deleteWorkspace('00000000-0000-0000-0000-000000000000')).toBe(false);
  });
});

describe('deleting an account', () => {
  it('removes the login and sessions but leaves the manager’s records about that person', async () => {
    const tenant: Tenant = await makeTenant('acc-del');
    const investor = await makeActiveInvestor(tenant, 'Leaving Investor');
    await addLedgerEntry({
      workspaceId: tenant.workspaceId,
      investorId: investor.investorId,
      actorUserId: tenant.userId,
      type: 'commitment',
      amountCents: 700_000,
      effectiveDate: '2026-03-01',
      memo: 'kept by the manager',
    });
    const { token } = await createSessionRow(investor.userId);

    expect(await deleteAccount(investor.userId)).toEqual({ ok: true });

    expect(await authenticate(investor.email, TEST_PASSWORD)).toBeNull();
    expect(await findSessionUser(token)).toBeNull();
    expect(await listMemberships(investor.userId)).toEqual([]);
    // The manager's investor record and ledger are untouched, just no longer linked to a login.
    const record = (await listInvestors(tenant.workspaceId)).find((i) => i.id === investor.investorId);
    expect(record).toMatchObject({ commitmentCents: 700_000, status: 'not_invited' });
    expect(await listLedger(tenant.workspaceId, investor.investorId)).toHaveLength(1);
  });

  it('keeps audit entries but unlinks them from the deleted person', async () => {
    const tenant = await makeTenant('acc-audit');
    const investor = await makeActiveInvestor(tenant, 'Audited Investor');
    const db = await getDb();
    const before = await db.select().from(auditLog).where(eq(auditLog.workspaceId, tenant.workspaceId));
    const byInvestor = before.filter((row) => row.actorUserId === investor.userId);
    expect(byInvestor.length).toBeGreaterThan(0); // they accepted an invitation

    await deleteAccount(investor.userId);
    const after = await db.select().from(auditLog).where(eq(auditLog.workspaceId, tenant.workspaceId));
    expect(after).toHaveLength(before.length);
    expect(after.filter((row) => row.actorUserId === investor.userId)).toHaveLength(0);
  });

  it('refuses while the person still owns a workspace, naming it', async () => {
    const { tenant } = await populated('acc-owner');
    const result = await deleteAccount(tenant.userId);
    expect(result).toMatchObject({ ok: false, error: 'owns_workspaces' });
    if (result.ok) return;
    expect(result.workspaces.map((w) => w.slug)).toEqual([tenant.slug]);
    expect((await authenticate(tenant.email, TEST_PASSWORD))?.id).toBe(tenant.userId); // still there

    await deleteWorkspace(tenant.workspaceId);
    expect(await deleteAccount(tenant.userId)).toEqual({ ok: true });
  });

  it('does not touch anyone else’s account or workspace', async () => {
    const a = await populated('acc-iso-a');
    const b = await populated('acc-iso-b');
    const bBefore = await counts(b.tenant.workspaceId);
    await deleteWorkspace(a.tenant.workspaceId);
    await deleteAccount(a.tenant.userId);
    expect(await counts(b.tenant.workspaceId)).toEqual(bBefore);
    expect((await authenticate(b.tenant.email, TEST_PASSWORD))?.id).toBe(b.tenant.userId);
  });
});
