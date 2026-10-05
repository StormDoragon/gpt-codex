import { and, eq } from 'drizzle-orm';
import { getDb, schema } from './db';
import type { MemberRole } from './db/schema';

const { workspaces, memberships } = schema;

export type WorkspaceSummary = { id: string; slug: string; name: string };
export type MembershipSummary = { workspace: WorkspaceSummary; role: MemberRole };

export async function getWorkspaceBySlug(slug: string): Promise<WorkspaceSummary | null> {
  const db = await getDb();
  const [workspace] = await db
    .select({ id: workspaces.id, slug: workspaces.slug, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return workspace ?? null;
}

/** The user's membership in the workspace with this slug, or null if they have none. */
export async function getMembership(userId: string, slug: string): Promise<MembershipSummary | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: workspaces.id, slug: workspaces.slug, name: workspaces.name, role: memberships.role })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(and(eq(memberships.userId, userId), eq(workspaces.slug, slug)))
    .limit(1);
  if (!row) return null;
  return { workspace: { id: row.id, slug: row.slug, name: row.name }, role: row.role };
}

export async function listMemberships(userId: string): Promise<MembershipSummary[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: workspaces.id, slug: workspaces.slug, name: workspaces.name, role: memberships.role })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(eq(memberships.userId, userId))
    .orderBy(workspaces.name);
  return rows.map((row) => ({ workspace: { id: row.id, slug: row.slug, name: row.name }, role: row.role }));
}

/** Where a member lands inside a workspace: managers get the review queue, investors the dashboard. */
export function landingPath(slug: string, role: MemberRole): string {
  return role === 'investor' ? `/w/${slug}/investor` : `/w/${slug}/admin`;
}
