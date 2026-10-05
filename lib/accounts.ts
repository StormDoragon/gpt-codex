import { and, eq, gt, like, lt, or } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './auth/password';
import { getDb, schema } from './db';
import { uniqueViolationConstraint } from './db/errors';
import { slugify } from './slug';
import { hashToken, newToken } from './tokens';

const { users, workspaces, memberships, sessions } = schema;

export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type SessionUser = { id: string; email: string; name: string };

export type SignupInput = { name: string; workspaceName: string; email: string; password: string };
export type SignupResult =
  | { ok: true; userId: string; workspaceSlug: string }
  | { ok: false; error: 'email_taken' | 'conflict' };

/** Creates a user, their workspace, and the owner membership in one transaction. */
export async function createAccountWithWorkspace(input: SignupInput): Promise<SignupResult> {
  const db = await getDb();
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  try {
    return await db.transaction(async (tx): Promise<SignupResult> => {
      const existing = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) return { ok: false, error: 'email_taken' };

      const [user] = await tx
        .insert(users)
        .values({ email, name: input.name, passwordHash })
        .returning({ id: users.id });

      const base = slugify(input.workspaceName);
      const taken = await tx
        .select({ slug: workspaces.slug })
        .from(workspaces)
        .where(or(eq(workspaces.slug, base), like(workspaces.slug, `${base}-%`)));
      const takenSlugs = new Set(taken.map((row) => row.slug));
      let slug = base;
      for (let suffix = 2; takenSlugs.has(slug); suffix += 1) slug = `${base}-${suffix}`;

      const [workspace] = await tx
        .insert(workspaces)
        .values({ slug, name: input.workspaceName })
        .returning({ id: workspaces.id });
      await tx.insert(memberships).values({ userId: user.id, workspaceId: workspace.id, role: 'owner' });

      return { ok: true, userId: user.id, workspaceSlug: slug };
    });
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    if (constraint?.includes('users_email')) return { ok: false, error: 'email_taken' };
    if (constraint) return { ok: false, error: 'conflict' };
    throw error;
  }
}

// Verified when the email is unknown so a missing account takes as long to
// reject as a wrong password, which keeps login timing from revealing accounts.
let dummyHash: Promise<string> | undefined;

/** Returns the user if the credentials are valid, otherwise null. */
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  if (!user) {
    dummyHash ??= hashPassword('timing-equalizer-not-a-real-password');
    await verifyPassword(password, await dummyHash);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { id: user.id, email: user.email, name: user.name };
}

/** Creates a session and returns the raw token. Only its hash is stored. */
export async function createSessionRow(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  // Housekeeping: drop this user's expired sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  return { token, expiresAt };
}

export async function findSessionUser(token: string): Promise<SessionUser | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
