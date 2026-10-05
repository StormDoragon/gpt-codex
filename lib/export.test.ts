import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { addLedgerEntry } from './investors';
import { createInvitation } from './invitations';
import { exportAccount, exportWorkspace, EXPORT_FORMAT } from './export';
import { getDb, schema } from './db';
import { hashToken } from './tokens';
import { makeActiveInvestor, makeApprovedApplication, makeInvestor, makeTenant, type Tenant } from './test-helpers';

const commit = (tenant: Tenant, investorId: string, amountCents: number, memo: string) =>
  addLedgerEntry({
    workspaceId: tenant.workspaceId,
    investorId,
    actorUserId: tenant.userId,
    type: 'commitment',
    amountCents,
    effectiveDate: '2026-03-01',
    memo,
  });

/** A workspace with an owner, an active investor with a ledger, a pending invitee, and an approved application. */
async function populated(label: string) {
  const tenant = await makeTenant(label);
  const active = await makeActiveInvestor(tenant, `${label} Active`);
  await commit(tenant, active.investorId, 1_500_000, `${label}-secret-memo`);
  const invitee = await makeInvestor(tenant, `${label} Invitee`);
  const invite = await createInvitation({
    workspaceId: tenant.workspaceId,
    investorId: invitee.investorId,
    actorUserId: tenant.userId,
  });
  if (!invite.ok) throw new Error('setup failed');
  await makeApprovedApplication(tenant, `${label} Applicant`);
  return { tenant, active, invitee, token: invite.token };
}

describe('workspace export', () => {
  it('contains the workspace’s own data, in a documented format', async () => {
    const { tenant, active } = await populated('exp-own');
    const data = await exportWorkspace(tenant.workspaceId);
    expect(data).not.toBeNull();
    expect(data!.format).toBe(EXPORT_FORMAT);
    expect(data!.kind).toBe('workspace');
    expect(data!.workspace.slug).toBe(tenant.slug);
    expect(data!.members.map((m) => m.role).sort()).toEqual(['investor', 'owner']);
    expect(data!.investors.map((i) => i.name).sort()).toEqual(['exp-own Active', 'exp-own Invitee']);
    expect(data!.ledger).toHaveLength(1);
    expect(data!.ledger[0]).toMatchObject({ investorId: active.investorId, amountCents: 1_500_000, memo: 'exp-own-secret-memo' });
    expect(data!.applications.map((a) => a.name)).toEqual(['exp-own Applicant']);
    expect(data!.invitations).toHaveLength(2); // the accepted one and the pending one
    expect(data!.auditLog.length).toBeGreaterThan(0);
  });

  it('never includes another workspace’s data', async () => {
    const a = await populated('exp-iso-a');
    const b = await populated('exp-iso-b');
    const text = JSON.stringify(await exportWorkspace(a.tenant.workspaceId));

    for (const foreign of [
      b.tenant.slug,
      b.tenant.email,
      b.tenant.workspaceId,
      b.active.email,
      b.active.investorId,
      'exp-iso-b-secret-memo',
      'exp-iso-b Applicant',
      'exp-iso-b Invitee',
    ]) {
      expect(text, `export of A must not contain ${foreign}`).not.toContain(foreign);
    }
    expect(text).toContain('exp-iso-a-secret-memo');
  });

  it('never contains a secret: password hashes, session or invitation tokens', async () => {
    const { tenant, token } = await populated('exp-secrets');
    const db = await getDb();
    const users = await db.select().from(schema.users);
    const sessions = await db.select().from(schema.sessions);
    const text = JSON.stringify(await exportWorkspace(tenant.workspaceId));

    expect(text).not.toMatch(/passwordHash|password_hash|tokenHash|token_hash/);
    expect(text).not.toContain('scrypt$');
    expect(text).not.toContain(token);
    expect(text).not.toContain(hashToken(token));
    for (const user of users) expect(text).not.toContain(user.passwordHash);
    for (const session of sessions) expect(text).not.toContain(session.tokenHash);
  });

  it('returns null for a workspace that does not exist', async () => {
    expect(await exportWorkspace('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});

describe('account export', () => {
  it('gives an investor exactly their own records and nothing about other investors', async () => {
    const tenant = await makeTenant('acct');
    const one = await makeActiveInvestor(tenant, 'Account One');
    const two = await makeActiveInvestor(tenant, 'Account Two');
    await commit(tenant, one.investorId, 1_000_000, 'one-private-note');
    await commit(tenant, two.investorId, 9_000_000, 'two-private-note');

    const data = await exportAccount(one.userId);
    const text = JSON.stringify(data);
    expect(data!.kind).toBe('account');
    expect(data!.account.email).toBe(one.email);
    expect(data!.workspaces).toHaveLength(1);
    expect(data!.workspaces[0].investorRecord?.commitmentCents).toBe(1_000_000);
    expect(text).toContain('one-private-note');
    for (const other of ['two-private-note', two.email, 'Account Two', '9000000']) {
      expect(text, `must not contain ${other}`).not.toContain(other);
    }
    expect(text).not.toMatch(/passwordHash|tokenHash|scrypt\$/);
  });

  it('points an owner to the workspace export instead of embedding everyone’s data', async () => {
    const { tenant } = await populated('acct-owner');
    const data = await exportAccount(tenant.userId);
    expect(data!.workspaces[0].role).toBe('owner');
    expect(data!.workspaces[0].investorRecord).toBeNull();
    expect(data!.workspaces[0].note).toContain('workspace settings');
    expect(JSON.stringify(data)).not.toContain('acct-owner Active');
  });

  it('returns null for an unknown account', async () => {
    expect(await exportAccount('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
