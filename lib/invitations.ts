import { and, eq, gt, isNull } from 'drizzle-orm';
import { normalizeEmail, type SessionUser } from './accounts';
import { hashPassword } from './auth/password';
import { recordAudit } from './audit';
import { getDb, schema } from './db';
import { uniqueViolationConstraint } from './db/errors';
import type { MemberRole } from './db/schema';
import { hashToken, newToken } from './tokens';

const { invitations, investors, memberships, users, workspaces } = schema;

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateInvitationResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; error: 'investor_not_found' | 'already_active' };

/**
 * Issues an invitation for an investor in this workspace. Any earlier unused
 * invitation for the same investor is revoked, so re-issuing a link kills the
 * old one. The raw token is returned once and never stored.
 */
export async function createInvitation(params: {
  workspaceId: string;
  investorId: string;
  actorUserId: string;
}): Promise<CreateInvitationResult> {
  const { workspaceId, investorId, actorUserId } = params;
  const db = await getDb();

  return db.transaction(async (tx): Promise<CreateInvitationResult> => {
    const [investor] = await tx
      .select({ email: investors.email, userId: investors.userId })
      .from(investors)
      .where(and(eq(investors.id, investorId), eq(investors.workspaceId, workspaceId)))
      .for('update');
    if (!investor) return { ok: false, error: 'investor_not_found' };
    if (investor.userId) return { ok: false, error: 'already_active' };

    const now = new Date();
    await tx
      .update(invitations)
      .set({ revokedAt: now })
      .where(
        and(
          eq(invitations.workspaceId, workspaceId),
          eq(invitations.investorId, investorId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      );

    const token = newToken();
    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
    const [created] = await tx
      .insert(invitations)
      .values({
        workspaceId,
        investorId,
        email: investor.email,
        role: 'investor',
        tokenHash: hashToken(token),
        invitedBy: actorUserId,
        expiresAt,
      })
      .returning({ id: invitations.id });

    await recordAudit(tx, {
      workspaceId,
      actorUserId,
      action: 'invitation.created',
      targetType: 'investor',
      targetId: investorId,
      metadata: { invitationId: created.id },
    });
    return { ok: true, token, expiresAt };
  });
}

export type InvitationPreview =
  | {
      status: 'valid';
      workspaceName: string;
      workspaceSlug: string;
      investorName: string;
      email: string;
      accountExists: boolean;
    }
  | { status: 'unknown' | 'used' | 'revoked' | 'expired' };

/** What an invitation link shows before it is accepted. Reveals nothing without the token. */
export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const db = await getDb();
  const [row] = await db
    .select({
      email: invitations.email,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      revokedAt: invitations.revokedAt,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      investorName: investors.name,
    })
    .from(invitations)
    .innerJoin(workspaces, eq(invitations.workspaceId, workspaces.id))
    .innerJoin(
      investors,
      and(eq(invitations.investorId, investors.id), eq(invitations.workspaceId, investors.workspaceId)),
    )
    .where(eq(invitations.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) return { status: 'unknown' };
  if (row.acceptedAt) return { status: 'used' };
  if (row.revokedAt) return { status: 'revoked' };
  if (row.expiresAt.getTime() <= Date.now()) return { status: 'expired' };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, row.email)).limit(1);
  return {
    status: 'valid',
    workspaceName: row.workspaceName,
    workspaceSlug: row.workspaceSlug,
    investorName: row.investorName,
    email: row.email,
    accountExists: Boolean(existing),
  };
}

export type AcceptInvitationResult =
  | { ok: true; userId: string; workspaceSlug: string; role: MemberRole }
  | {
      ok: false;
      error: 'invalid' | 'email_mismatch' | 'account_exists' | 'already_member' | 'investor_claimed' | 'needs_account';
    };

type AcceptError = Extract<AcceptInvitationResult, { ok: false }>['error'];

// Thrown inside the transaction to roll everything back, including the
// claim on the invitation, so a failed attempt leaves the link usable.
class Rejection extends Error {
  constructor(readonly code: AcceptError) {
    super(code);
  }
}

/**
 * Accepts an invitation. The invited email is fixed by the invitation: either
 * the caller is already signed in as that email, or they create a new account
 * for it. The claim, account creation, membership, and investor link happen in
 * one transaction, and the claim is a single atomic UPDATE, so a token can be
 * used exactly once even under concurrent requests.
 */
export async function acceptInvitation(params: {
  token: string;
  /** The verified signed-in user from the session cookie, never from form input. */
  sessionUser?: SessionUser | null;
  newAccount?: { name: string; password: string };
}): Promise<AcceptInvitationResult> {
  const db = await getDb();
  // Hash before opening the transaction so the slow hash holds no locks.
  const passwordHash = params.newAccount ? await hashPassword(params.newAccount.password) : null;

  try {
    return await db.transaction(async (tx): Promise<AcceptInvitationResult> => {
      const [claimed] = await tx
        .update(invitations)
        .set({ acceptedAt: new Date() })
        .where(
          and(
            eq(invitations.tokenHash, hashToken(params.token)),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
            gt(invitations.expiresAt, new Date()),
          ),
        )
        .returning({
          workspaceId: invitations.workspaceId,
          investorId: invitations.investorId,
          email: invitations.email,
          role: invitations.role,
        });
      if (!claimed) throw new Rejection('invalid');

      let userId: string;
      if (params.sessionUser) {
        if (normalizeEmail(params.sessionUser.email) !== claimed.email) throw new Rejection('email_mismatch');
        userId = params.sessionUser.id;
      } else if (params.newAccount && passwordHash) {
        const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, claimed.email));
        if (existing) throw new Rejection('account_exists');
        const [created] = await tx
          .insert(users)
          .values({ email: claimed.email, name: params.newAccount.name, passwordHash })
          .returning({ id: users.id });
        userId = created.id;
      } else {
        throw new Rejection('needs_account');
      }

      const [alreadyMember] = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.userId, userId), eq(memberships.workspaceId, claimed.workspaceId)));
      if (alreadyMember) throw new Rejection('already_member');
      await tx.insert(memberships).values({ userId, workspaceId: claimed.workspaceId, role: claimed.role });

      const linked = await tx
        .update(investors)
        .set({ userId })
        .where(
          and(
            eq(investors.id, claimed.investorId),
            eq(investors.workspaceId, claimed.workspaceId),
            isNull(investors.userId),
          ),
        )
        .returning({ id: investors.id });
      if (linked.length === 0) throw new Rejection('investor_claimed');

      await recordAudit(tx, {
        workspaceId: claimed.workspaceId,
        actorUserId: userId,
        action: 'invitation.accepted',
        targetType: 'investor',
        targetId: claimed.investorId,
      });

      const [workspace] = await tx
        .select({ slug: workspaces.slug })
        .from(workspaces)
        .where(eq(workspaces.id, claimed.workspaceId));
      return { ok: true, userId, workspaceSlug: workspace.slug, role: claimed.role };
    });
  } catch (error) {
    if (error instanceof Rejection) return { ok: false, error: error.code };
    // A concurrent request can still trip a unique index after the checks above.
    const constraint = uniqueViolationConstraint(error);
    if (constraint?.includes('memberships')) return { ok: false, error: 'already_member' };
    if (constraint?.includes('users_email')) return { ok: false, error: 'account_exists' };
    if (constraint?.includes('investors_workspace_user')) return { ok: false, error: 'investor_claimed' };
    throw error;
  }
}
