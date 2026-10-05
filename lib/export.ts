import { asc, eq, sql } from 'drizzle-orm';
import { getDb, schema } from './db';
import { getOwnPortfolio } from './investors';

const { applications, auditLog, investors, invitations, ledgerEntries, memberships, users, workspaces } = schema;

// What an export may contain, and what it never contains:
//   - never: password hashes, session or invitation token hashes, rate-limit
//     counters. Only data a person or a manager entered, plus timestamps.
//   - scoped: a workspace export covers exactly one workspace; an account
//     export covers one person's own data. Every query below is filtered by
//     workspace id or user id.

export const EXPORT_FORMAT = 'lp-portal-export/v1';

export async function exportWorkspace(workspaceId: string) {
  const db = await getDb();
  const [workspace] = await db
    .select({ slug: workspaces.slug, name: workspaces.name, createdAt: workspaces.createdAt })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  if (!workspace) return null;

  const [members, applicationRows, investorRows, ledgerRows, invitationRows, auditRows] = await Promise.all([
    db
      .select({ name: users.name, email: users.email, role: memberships.role, joinedAt: memberships.createdAt })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.workspaceId, workspaceId))
      .orderBy(asc(memberships.createdAt)),
    db
      .select({
        id: applications.id,
        name: applications.name,
        email: applications.email,
        phone: applications.phone,
        country: applications.country,
        amount: applications.amount,
        accredited: applications.accredited,
        notes: applications.notes,
        status: applications.status,
        submittedAt: applications.submittedAt,
        reviewedAt: applications.reviewedAt,
      })
      .from(applications)
      .where(eq(applications.workspaceId, workspaceId))
      .orderBy(asc(applications.submittedAt)),
    db
      .select({
        id: investors.id,
        name: investors.name,
        email: investors.email,
        applicationId: investors.applicationId,
        hasLogin: sql<boolean>`${investors.userId} is not null`,
        createdAt: investors.createdAt,
      })
      .from(investors)
      .where(eq(investors.workspaceId, workspaceId))
      .orderBy(asc(investors.name)),
    db
      .select({
        id: ledgerEntries.id,
        investorId: ledgerEntries.investorId,
        type: ledgerEntries.type,
        amountCents: ledgerEntries.amountCents,
        effectiveDate: ledgerEntries.effectiveDate,
        memo: ledgerEntries.memo,
        createdAt: ledgerEntries.createdAt,
      })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.workspaceId, workspaceId))
      .orderBy(asc(ledgerEntries.effectiveDate), asc(ledgerEntries.createdAt)),
    db
      // No token or token hash: an export must never contain a usable link.
      .select({
        investorId: invitations.investorId,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        acceptedAt: invitations.acceptedAt,
        revokedAt: invitations.revokedAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .where(eq(invitations.workspaceId, workspaceId))
      .orderBy(asc(invitations.createdAt)),
    db
      .select({
        action: auditLog.action,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
        metadata: auditLog.metadata,
        actorEmail: users.email,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorUserId, users.id))
      .where(eq(auditLog.workspaceId, workspaceId))
      .orderBy(asc(auditLog.createdAt)),
  ]);

  return {
    format: EXPORT_FORMAT,
    kind: 'workspace',
    exportedAt: new Date().toISOString(),
    currency: 'USD',
    workspace,
    members,
    applications: applicationRows,
    investors: investorRows,
    ledger: ledgerRows,
    invitations: invitationRows,
    auditLog: auditRows,
  };
}

/** One person's own data across every workspace they belong to. Contains nothing about anyone else. */
export async function exportAccount(userId: string) {
  const db = await getDb();
  const [account] = await db
    .select({ name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!account) return null;

  const memberRows = await db
    .select({
      workspaceId: workspaces.id,
      slug: workspaces.slug,
      name: workspaces.name,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(eq(memberships.userId, userId))
    .orderBy(asc(workspaces.name));

  const membershipsOut = [];
  for (const { workspaceId, ...workspace } of memberRows) {
    // Found through the person's own login, so it can only ever be their own record.
    const portfolio = workspace.role === 'investor' ? await getOwnPortfolio(workspaceId, userId) : null;
    membershipsOut.push({
      ...workspace,
      investorRecord: portfolio
        ? {
            name: portfolio.investor.name,
            email: portfolio.investor.email,
            commitmentCents: portfolio.investor.commitmentCents,
            calledCents: portfolio.investor.calledCents,
            distributedCents: portfolio.investor.distributedCents,
            ledger: portfolio.ledger.map(({ type, amountCents, effectiveDate, memo }) => ({
              type,
              amountCents,
              effectiveDate,
              memo,
            })),
          }
        : null,
      note:
        workspace.role === 'owner'
          ? 'You own this workspace. Download its full export from the workspace settings page.'
          : undefined,
    });
  }

  return {
    format: EXPORT_FORMAT,
    kind: 'account',
    exportedAt: new Date().toISOString(),
    currency: 'USD',
    account,
    workspaces: membershipsOut,
  };
}
