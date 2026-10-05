import { notFound, redirect } from 'next/navigation';
import type { SessionUser } from './accounts';
import { getSessionUser } from './auth/session';
import type { MemberRole } from './db/schema';
import { getMembership, type WorkspaceSummary } from './workspaces';

export const OWNER_ROLES: MemberRole[] = ['owner'];
export const MANAGER_ROLES: MemberRole[] = ['owner', 'admin'];
export const ALL_ROLES: MemberRole[] = ['owner', 'admin', 'investor'];

export type AuthorizedMember = { user: SessionUser; workspace: WorkspaceSummary; role: MemberRole };

/**
 * The single authorization gate for workspace pages and actions.
 *
 * - Not signed in: redirect to login, returning to `nextPath` afterwards.
 * - Signed in but not a member with an allowed role: 404, which does not
 *   reveal whether the workspace exists.
 *
 * The returned workspace id is the only thing data access may be scoped by.
 */
export async function requireMembership(
  slug: string,
  allowedRoles: MemberRole[],
  nextPath: string,
): Promise<AuthorizedMember> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const membership = await getMembership(user.id, slug);
  if (!membership || !allowedRoles.includes(membership.role)) notFound();

  return { user, workspace: membership.workspace, role: membership.role };
}
