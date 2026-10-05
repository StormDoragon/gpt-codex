import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import {
  authenticate,
  createAccountWithWorkspace,
  createSessionRow,
  deleteSession,
  findSessionUser,
} from './accounts';
import { getDb, schema } from './db';
import { slugify } from './slug';
import { makeTenant } from './test-helpers';
import { hashPassword, verifyPassword } from './auth/password';

describe('slugify', () => {
  it('produces url-safe slugs', () => {
    expect(slugify('Acme Capital Partners, LP')).toBe('acme-capital-partners-lp');
    expect(slugify('  Ünïcode  &  Spaces!! ')).toBe('unicode-spaces');
    expect(slugify('***')).toBe('workspace');
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(40);
  });
});

describe('passwords', () => {
  it('hashes with a salt and verifies', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(await verifyPassword('wrong password here', hash)).toBe(false);
    expect(await hashPassword('correct horse battery staple')).not.toBe(hash);
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', 'scrypt$1$2')).toBe(false);
  });
});

describe('accounts', () => {
  it('creates the user, workspace and owner membership', async () => {
    const tenant = await makeTenant('acme');
    const db = await getDb();
    const rows = await db
      .select({ role: schema.memberships.role, slug: schema.workspaces.slug })
      .from(schema.memberships)
      .innerJoin(schema.workspaces, eq(schema.memberships.workspaceId, schema.workspaces.id))
      .where(eq(schema.memberships.userId, tenant.userId));
    expect(rows).toEqual([{ role: 'owner', slug: tenant.slug }]);
  });

  it('suffixes the slug when a workspace name is taken', async () => {
    const name = `Same Name ${randomUUID().slice(0, 8)}`;
    const make = (email: string) =>
      createAccountWithWorkspace({ name: 'x', workspaceName: name, email, password: 'correct horse battery staple' });
    const first = await make(`one-${randomUUID()}@example.com`);
    const second = await make(`two-${randomUUID()}@example.com`);
    if (!first.ok || !second.ok) throw new Error('signup failed');
    expect(second.workspaceSlug).toBe(`${first.workspaceSlug}-2`);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const tenant = await makeTenant('dupe');
    const again = await createAccountWithWorkspace({
      name: 'x',
      workspaceName: 'Another',
      email: tenant.email.toUpperCase(),
      password: 'correct horse battery staple',
    });
    expect(again).toEqual({ ok: false, error: 'email_taken' });
  });

  it('never stores the plaintext password', async () => {
    const tenant = await makeTenant('hashcheck');
    const db = await getDb();
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, tenant.userId));
    expect(user.passwordHash).not.toContain('correct horse battery staple');
  });

  it('authenticates only with the right credentials', async () => {
    const tenant = await makeTenant('login');
    expect((await authenticate(tenant.email, 'correct horse battery staple'))?.id).toBe(tenant.userId);
    expect((await authenticate(tenant.email.toUpperCase(), 'correct horse battery staple'))?.id).toBe(tenant.userId);
    expect(await authenticate(tenant.email, 'wrong password here')).toBeNull();
    expect(await authenticate('nobody@example.com', 'correct horse battery staple')).toBeNull();
  });
});

describe('sessions', () => {
  it('creates, finds and deletes sessions, storing only a hash', async () => {
    const tenant = await makeTenant('session');
    const { token } = await createSessionRow(tenant.userId);

    const db = await getDb();
    const stored = await db.select().from(schema.sessions).where(eq(schema.sessions.userId, tenant.userId));
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).not.toBe(token);

    expect((await findSessionUser(token))?.id).toBe(tenant.userId);
    await deleteSession(token);
    expect(await findSessionUser(token)).toBeNull();
  });

  it('does not accept expired or unknown tokens', async () => {
    const tenant = await makeTenant('expired');
    const { token } = await createSessionRow(tenant.userId);
    const db = await getDb();
    await db
      .update(schema.sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.sessions.userId, tenant.userId));
    expect(await findSessionUser(token)).toBeNull();
    expect(await findSessionUser('definitely-not-a-real-token')).toBeNull();
  });
});
