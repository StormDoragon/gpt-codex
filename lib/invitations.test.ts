import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { authenticate } from './accounts';
import { createAccountWithWorkspace } from './accounts';
import { getDb, schema } from './db';
import { addLedgerEntry, createInvestor, getOwnPortfolio, listInvestors } from './investors';
import { INVITE_TTL_MS, acceptInvitation, createInvitation, previewInvitation } from './invitations';
import { listMemberships } from './workspaces';
import {
  TEST_PASSWORD,
  makeActiveInvestor,
  makeInvestor,
  makeTenant,
  type Tenant,
} from './test-helpers';
import { hashToken } from './tokens';
import { randomUUID } from 'crypto';

const invite = async (tenant: Tenant, investorId: string) => {
  const result = await createInvitation({ workspaceId: tenant.workspaceId, investorId, actorUserId: tenant.userId });
  if (!result.ok) throw new Error(`invite failed: ${result.error}`);
  return result;
};

const newAccount = (name = 'New Investor') => ({ name, password: TEST_PASSWORD });

describe('invitation lifecycle', () => {
  it('invites, previews, and accepts with a new account', async () => {
    const tenant = await makeTenant('life');
    const investor = await makeInvestor(tenant, 'Lifecycle Person');
    const { token } = await invite(tenant, investor.investorId);

    expect(await previewInvitation(token)).toMatchObject({
      status: 'valid',
      email: investor.email,
      investorName: 'Lifecycle Person',
      accountExists: false,
    });

    const accepted = await acceptInvitation({ token, newAccount: newAccount('Lifecycle Person') });
    expect(accepted).toMatchObject({ ok: true, workspaceSlug: tenant.slug, role: 'investor' });
    if (!accepted.ok) return;

    expect((await listMemberships(accepted.userId)).map((m) => m.role)).toEqual(['investor']);
    expect((await listInvestors(tenant.workspaceId))[0].status).toBe('active');
    // The new account can log in with the password they chose.
    expect((await authenticate(investor.email, TEST_PASSWORD))?.id).toBe(accepted.userId);
  });

  it('stores only a hash of the token', async () => {
    const tenant = await makeTenant('hash');
    const investor = await makeInvestor(tenant);
    const { token } = await invite(tenant, investor.investorId);
    const db = await getDb();
    const [row] = await db.select().from(schema.invitations).where(eq(schema.invitations.workspaceId, tenant.workspaceId));
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toBe(hashToken(token));
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('shows invited status until accepted', async () => {
    const tenant = await makeTenant('status');
    const investor = await makeInvestor(tenant);
    expect((await listInvestors(tenant.workspaceId))[0].status).toBe('not_invited');
    await invite(tenant, investor.investorId);
    expect((await listInvestors(tenant.workspaceId))[0].status).toBe('invited');
  });

  it('can only be used once', async () => {
    const tenant = await makeTenant('once');
    const investor = await makeInvestor(tenant);
    const { token } = await invite(tenant, investor.investorId);

    expect((await acceptInvitation({ token, newAccount: newAccount() })).ok).toBe(true);
    expect(await acceptInvitation({ token, newAccount: newAccount('Replay') })).toEqual({ ok: false, error: 'invalid' });
    expect(await previewInvitation(token)).toEqual({ status: 'used' });
  });

  it('lets only one of several simultaneous accepts win', async () => {
    const tenant = await makeTenant('simul');
    const investor = await makeInvestor(tenant);
    const { token } = await invite(tenant, investor.investorId);

    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => acceptInvitation({ token, newAccount: newAccount(`Racer ${i}`) })),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const db = await getDb();
    const members = await db.select().from(schema.memberships).where(eq(schema.memberships.workspaceId, tenant.workspaceId));
    expect(members.filter((m) => m.role === 'investor')).toHaveLength(1);
  });

  it('rejects expired tokens', async () => {
    const tenant = await makeTenant('expiry');
    const investor = await makeInvestor(tenant);
    const { token, expiresAt } = await invite(tenant, investor.investorId);
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(INVITE_TTL_MS - 60_000);

    const db = await getDb();
    await db
      .update(schema.invitations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.invitations.workspaceId, tenant.workspaceId));

    expect(await previewInvitation(token)).toEqual({ status: 'expired' });
    expect(await acceptInvitation({ token, newAccount: newAccount() })).toEqual({ ok: false, error: 'invalid' });
  });

  it('revokes the old link when a new one is issued', async () => {
    const tenant = await makeTenant('reissue');
    const investor = await makeInvestor(tenant);
    const first = await invite(tenant, investor.investorId);
    const second = await invite(tenant, investor.investorId);

    expect(await previewInvitation(first.token)).toEqual({ status: 'revoked' });
    expect(await acceptInvitation({ token: first.token, newAccount: newAccount() })).toEqual({ ok: false, error: 'invalid' });
    expect((await acceptInvitation({ token: second.token, newAccount: newAccount() })).ok).toBe(true);
  });

  it('does not invite an investor who already has access', async () => {
    const tenant = await makeTenant('active');
    const investor = await makeActiveInvestor(tenant);
    expect(
      await createInvitation({ workspaceId: tenant.workspaceId, investorId: investor.investorId, actorUserId: tenant.userId }),
    ).toEqual({ ok: false, error: 'already_active' });
  });

  it('reports unknown tokens without leaking anything', async () => {
    expect(await previewInvitation('not-a-real-token')).toEqual({ status: 'unknown' });
    expect(await acceptInvitation({ token: 'not-a-real-token', newAccount: newAccount() })).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('who may accept', () => {
  it('requires an account or a sign-in, and a failed attempt leaves the link usable', async () => {
    const tenant = await makeTenant('who');
    const investor = await makeInvestor(tenant);
    const { token } = await invite(tenant, investor.investorId);

    expect(await acceptInvitation({ token })).toEqual({ ok: false, error: 'needs_account' });
    expect((await previewInvitation(token)).status).toBe('valid'); // rolled back
    expect((await acceptInvitation({ token, newAccount: newAccount() })).ok).toBe(true);
  });

  it('refuses a signed-in user whose email is not the invited one', async () => {
    const tenant = await makeTenant('mismatch');
    const stranger = await makeTenant('stranger');
    const investor = await makeInvestor(tenant);
    const { token } = await invite(tenant, investor.investorId);

    const result = await acceptInvitation({ token, sessionUser: { id: stranger.userId, email: stranger.email, name: 's' } });
    expect(result).toEqual({ ok: false, error: 'email_mismatch' });
    expect((await listMemberships(stranger.userId)).map((m) => m.workspace.slug)).toEqual([stranger.slug]);
    expect((await previewInvitation(token)).status).toBe('valid');
  });

  it('makes an existing account sign in instead of creating a duplicate', async () => {
    const tenant = await makeTenant('exists');
    const email = `already-${randomUUID().slice(0, 8)}@example.com`;
    const signup = await createAccountWithWorkspace({ name: 'Has Account', workspaceName: `Their Fund ${email}`, email, password: TEST_PASSWORD });
    if (!signup.ok) throw new Error('setup failed');

    const created = await createInvestor({ workspaceId: tenant.workspaceId, actorUserId: tenant.userId, name: 'Has Account', email });
    if (!created.ok) throw new Error('setup failed');
    const { token } = await invite(tenant, created.investorId);

    expect(await previewInvitation(token)).toMatchObject({ status: 'valid', accountExists: true });
    expect(await acceptInvitation({ token, newAccount: newAccount() })).toEqual({ ok: false, error: 'account_exists' });

    const accepted = await acceptInvitation({ token, sessionUser: { id: signup.userId, email, name: 'Has Account' } });
    expect(accepted).toMatchObject({ ok: true, userId: signup.userId });
    expect((await listMemberships(signup.userId)).map((m) => m.role).sort()).toEqual(['investor', 'owner']);
  });

  it('matches the invited email regardless of case', async () => {
    const tenant = await makeTenant('case');
    const email = `Mixed-${randomUUID().slice(0, 8)}@Example.com`;
    const signup = await createAccountWithWorkspace({ name: 'Case', workspaceName: `Case Fund ${email}`, email, password: TEST_PASSWORD });
    if (!signup.ok) throw new Error('setup failed');
    const created = await createInvestor({ workspaceId: tenant.workspaceId, actorUserId: tenant.userId, name: 'Case', email });
    if (!created.ok) throw new Error('setup failed');
    const { token } = await invite(tenant, created.investorId);
    const result = await acceptInvitation({ token, sessionUser: { id: signup.userId, email: email.toUpperCase(), name: 'Case' } });
    expect(result.ok).toBe(true);
  });

  it('will not make an existing member of the workspace an investor too', async () => {
    const tenant = await makeTenant('member');
    const created = await createInvestor({ workspaceId: tenant.workspaceId, actorUserId: tenant.userId, name: 'The Owner', email: tenant.email });
    if (!created.ok) throw new Error('setup failed');
    const { token } = await invite(tenant, created.investorId);
    const result = await acceptInvitation({ token, sessionUser: { id: tenant.userId, email: tenant.email, name: 'o' } });
    expect(result).toEqual({ ok: false, error: 'already_member' });
    expect((await listMemberships(tenant.userId)).map((m) => m.role)).toEqual(['owner']);
  });
});

describe('invitation isolation between workspaces', () => {
  it('cannot invite another workspace’s investor', async () => {
    const a = await makeTenant('inv-iso-a');
    const b = await makeTenant('inv-iso-b');
    const investor = await makeInvestor(a);
    expect(
      await createInvitation({ workspaceId: b.workspaceId, investorId: investor.investorId, actorUserId: b.userId }),
    ).toEqual({ ok: false, error: 'investor_not_found' });
  });

  it('gives an accepted investor access to their own workspace only', async () => {
    const a = await makeTenant('scope-a');
    const b = await makeTenant('scope-b');
    const investor = await makeActiveInvestor(a);
    expect((await listMemberships(investor.userId)).map((m) => m.workspace.slug)).toEqual([a.slug]);
    expect(await getOwnPortfolio(b.workspaceId, investor.userId)).toBeNull();
  });
});

describe('investors cannot see each other inside one workspace', () => {
  it('each investor only ever receives their own figures', async () => {
    const tenant = await makeTenant('privacy');
    const one = await makeActiveInvestor(tenant, 'Investor One');
    const two = await makeActiveInvestor(tenant, 'Investor Two');
    const put = (investorId: string, amountCents: number, memo: string) =>
      addLedgerEntry({
        workspaceId: tenant.workspaceId,
        investorId,
        actorUserId: tenant.userId,
        type: 'commitment',
        amountCents,
        effectiveDate: '2026-03-01',
        memo,
      });
    await put(one.investorId, 1_111_100, 'one-secret');
    await put(two.investorId, 9_999_900, 'two-secret');

    const seenByOne = await getOwnPortfolio(tenant.workspaceId, one.userId);
    const seenByTwo = await getOwnPortfolio(tenant.workspaceId, two.userId);
    expect(seenByOne?.investor.commitmentCents).toBe(1_111_100);
    expect(seenByOne?.ledger.map((row) => row.memo)).toEqual(['one-secret']);
    expect(seenByTwo?.investor.commitmentCents).toBe(9_999_900);
    expect(seenByTwo?.ledger.map((row) => row.memo)).toEqual(['two-secret']);
    expect(JSON.stringify(seenByOne)).not.toContain('two-secret');
    expect(JSON.stringify(seenByTwo)).not.toContain('one-secret');
  });

  it('gives a user with no investor record nothing', async () => {
    const tenant = await makeTenant('nobody');
    expect(await getOwnPortfolio(tenant.workspaceId, tenant.userId)).toBeNull();
  });
});
