import { and, asc, desc, eq, gt, isNull, sql, type SQL } from 'drizzle-orm';
import { normalizeEmail } from './accounts';
import { recordAudit } from './audit';
import { getDb, schema } from './db';
import { uniqueViolationConstraint } from './db/errors';
import type { LedgerEntryType } from './db/schema';
import { MAX_AMOUNT_CENTS } from './money';

const { investors, invitations, ledgerEntries, applications } = schema;

// Tenant isolation rule (same as lib/applications.ts): every statement here is
// filtered by workspace_id, and callers take that id from a verified
// membership, never from request input alone.

export type InvestorStatus = 'not_invited' | 'invited' | 'active';

export type InvestorTotals = {
  commitmentCents: number;
  calledCents: number;
  distributedCents: number;
};

export type InvestorSummary = InvestorTotals & {
  id: string;
  name: string;
  email: string;
  applicationId: string | null;
  status: InvestorStatus;
  createdAt: Date;
};

export type LedgerRow = {
  id: string;
  type: LedgerEntryType;
  amountCents: number;
  effectiveDate: string;
  memo: string;
  createdAt: Date;
};

const totalOf = (type: LedgerEntryType) =>
  sql<number>`coalesce(sum(${ledgerEntries.amountCents}) filter (where ${ledgerEntries.type} = ${type}), 0)`.mapWith(Number);

async function summaries(workspaceId: string, extra?: SQL): Promise<InvestorSummary[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: investors.id,
      name: investors.name,
      email: investors.email,
      applicationId: investors.applicationId,
      userId: investors.userId,
      createdAt: investors.createdAt,
      commitmentCents: totalOf('commitment'),
      calledCents: totalOf('capital_call'),
      distributedCents: totalOf('distribution'),
    })
    .from(investors)
    .leftJoin(
      ledgerEntries,
      and(eq(ledgerEntries.investorId, investors.id), eq(ledgerEntries.workspaceId, investors.workspaceId)),
    )
    .where(extra ? and(eq(investors.workspaceId, workspaceId), extra) : eq(investors.workspaceId, workspaceId))
    .groupBy(investors.id)
    .orderBy(asc(investors.name));

  const pending = await db
    .select({ investorId: invitations.investorId })
    .from(invitations)
    .where(
      and(
        eq(invitations.workspaceId, workspaceId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, new Date()),
      ),
    )
    .groupBy(invitations.investorId);
  const invited = new Set(pending.map((row) => row.investorId));

  return rows.map(({ userId, ...row }) => ({
    ...row,
    status: userId ? 'active' : invited.has(row.id) ? 'invited' : 'not_invited',
  }));
}

export function listInvestors(workspaceId: string): Promise<InvestorSummary[]> {
  return summaries(workspaceId);
}

export async function getInvestor(workspaceId: string, investorId: string): Promise<InvestorSummary | null> {
  return (await summaries(workspaceId, eq(investors.id, investorId)))[0] ?? null;
}

export type CreateInvestorResult =
  | { ok: true; investorId: string }
  | { ok: false; error: 'email_taken' | 'application_not_found' | 'application_not_approved' | 'application_already_linked' };

/** Adds an investor record, optionally from an approved application in the same workspace. */
export async function createInvestor(params: {
  workspaceId: string;
  actorUserId: string;
  name: string;
  email: string;
  applicationId?: string;
}): Promise<CreateInvestorResult> {
  const { workspaceId, actorUserId, applicationId } = params;
  const db = await getDb();

  try {
    return await db.transaction(async (tx): Promise<CreateInvestorResult> => {
      if (applicationId) {
        const [application] = await tx
          .select({ status: applications.status })
          .from(applications)
          .where(and(eq(applications.id, applicationId), eq(applications.workspaceId, workspaceId)));
        if (!application) return { ok: false, error: 'application_not_found' };
        if (application.status !== 'approved') return { ok: false, error: 'application_not_approved' };
      }

      const [created] = await tx
        .insert(investors)
        .values({
          workspaceId,
          name: params.name,
          email: normalizeEmail(params.email),
          applicationId: applicationId ?? null,
        })
        .returning({ id: investors.id });

      await recordAudit(tx, {
        workspaceId,
        actorUserId,
        action: 'investor.created',
        targetType: 'investor',
        targetId: created.id,
        metadata: { name: params.name, fromApplication: Boolean(applicationId) },
      });
      return { ok: true, investorId: created.id };
    });
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    if (constraint?.includes('investors_workspace_email')) return { ok: false, error: 'email_taken' };
    if (constraint?.includes('investors_workspace_application')) return { ok: false, error: 'application_already_linked' };
    throw error;
  }
}

export async function listLedger(workspaceId: string, investorId: string): Promise<LedgerRow[]> {
  const db = await getDb();
  return db
    .select({
      id: ledgerEntries.id,
      type: ledgerEntries.type,
      amountCents: ledgerEntries.amountCents,
      effectiveDate: ledgerEntries.effectiveDate,
      memo: ledgerEntries.memo,
      createdAt: ledgerEntries.createdAt,
    })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.workspaceId, workspaceId), eq(ledgerEntries.investorId, investorId)))
    .orderBy(desc(ledgerEntries.effectiveDate), desc(ledgerEntries.createdAt));
}

/**
 * An investor's own view: their investor record and ledger in this workspace,
 * found through their login. There is deliberately no way to pass another
 * investor's id here, so one investor can never read another's figures.
 */
export async function getOwnPortfolio(
  workspaceId: string,
  userId: string,
): Promise<{ investor: InvestorSummary; ledger: LedgerRow[] } | null> {
  const investor = (await summaries(workspaceId, eq(investors.userId, userId)))[0];
  if (!investor) return null;
  return { investor, ledger: await listLedger(workspaceId, investor.id) };
}

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  const year = parsed.getUTCFullYear();
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && year >= 2000 && year <= 2100;
}

export type AddLedgerResult =
  | { ok: true; entryId: string }
  | { ok: false; error: 'investor_not_found' | 'invalid_amount' | 'invalid_date' | 'invalid_memo' | 'exceeds_uncalled' };

/**
 * Appends a commitment, capital call or distribution. Entries are never edited.
 * A capital call may not exceed the investor's uncalled commitment; the check
 * and the insert run under a row lock on the investor, so two simultaneous
 * calls cannot both pass.
 */
export async function addLedgerEntry(params: {
  workspaceId: string;
  investorId: string;
  actorUserId: string;
  type: LedgerEntryType;
  amountCents: number;
  effectiveDate: string;
  memo: string;
}): Promise<AddLedgerResult> {
  const { workspaceId, investorId, actorUserId, type, amountCents, effectiveDate } = params;
  const memo = params.memo.trim();

  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > MAX_AMOUNT_CENTS) {
    return { ok: false, error: 'invalid_amount' };
  }
  if (!isRealDate(effectiveDate)) return { ok: false, error: 'invalid_date' };
  if (memo.length > 500) return { ok: false, error: 'invalid_memo' };

  const db = await getDb();
  return db.transaction(async (tx): Promise<AddLedgerResult> => {
    const [investor] = await tx
      .select({ id: investors.id })
      .from(investors)
      .where(and(eq(investors.id, investorId), eq(investors.workspaceId, workspaceId)))
      .for('update');
    if (!investor) return { ok: false, error: 'investor_not_found' };

    if (type === 'capital_call') {
      const [totals] = await tx
        .select({ committed: totalOf('commitment'), called: totalOf('capital_call') })
        .from(ledgerEntries)
        .where(and(eq(ledgerEntries.workspaceId, workspaceId), eq(ledgerEntries.investorId, investorId)));
      if (totals.called + amountCents > totals.committed) return { ok: false, error: 'exceeds_uncalled' };
    }

    const [entry] = await tx
      .insert(ledgerEntries)
      .values({ workspaceId, investorId, type, amountCents, effectiveDate, memo, createdBy: actorUserId })
      .returning({ id: ledgerEntries.id });

    await recordAudit(tx, {
      workspaceId,
      actorUserId,
      action: `ledger.${type}`,
      targetType: 'investor',
      targetId: investorId,
      metadata: { amountCents, effectiveDate },
    });
    return { ok: true, entryId: entry.id };
  });
}
