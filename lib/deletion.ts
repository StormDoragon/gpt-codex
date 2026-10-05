import { and, eq } from 'drizzle-orm';
import { getDb, schema } from './db';

const { memberships, users, workspaces } = schema;

/**
 * Deletes a workspace and everything in it. Every table that holds a
 * workspace's data references it with ON DELETE CASCADE, so one statement
 * removes memberships, applications, investors, invitations, ledger entries
 * and the audit log together. People's logins are NOT deleted: an investor's
 * account belongs to them, and they may belong to other workspaces.
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  const db = await getDb();
  const removed = await db.delete(workspaces).where(eq(workspaces.id, workspaceId)).returning({ id: workspaces.id });
  return removed.length > 0;
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: 'owns_workspaces'; workspaces: { slug: string; name: string }[] };

/**
 * Deletes a person's login: their sessions and memberships go with it, and
 * records that merely point at them (who approved something, who an investor
 * record was linked to) are unlinked rather than deleted. Records a fund
 * manager keeps about them stay with the manager, who is responsible for them.
 *
 * Someone who owns a workspace must delete it first, so a workspace is never
 * left with no owner.
 */
export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  const db = await getDb();
  const owned = await db
    .select({ slug: workspaces.slug, name: workspaces.name })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.role, 'owner')));
  if (owned.length > 0) return { ok: false, error: 'owns_workspaces', workspaces: owned };

  await db.delete(users).where(eq(users.id, userId));
  return { ok: true };
}
