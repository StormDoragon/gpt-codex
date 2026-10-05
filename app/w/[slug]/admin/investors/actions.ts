'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getApplication } from '../../../../../lib/applications';
import { isUuid, isValidEmail, readText } from '../../../../../lib/form';
import { addLedgerEntry, createInvestor } from '../../../../../lib/investors';
import { createInvitation } from '../../../../../lib/invitations';
import { formatCents, parseMoneyToCents } from '../../../../../lib/money';
import { MANAGER_ROLES, requireMembership } from '../../../../../lib/tenancy';

// Every action authorizes first, with the workspace slug from the form checked
// against the signed-in user's membership. Page-level checks do not protect a
// server action, which can be invoked directly.

export type AddInvestorState = { error: string };

export async function addInvestor(_prev: AddInvestorState, data: FormData): Promise<AddInvestorState> {
  const slug = readText(data, 'workspace', 60);
  const { user, workspace } = await requireMembership(slug, MANAGER_ROLES, `/w/${slug}/admin/investors`);

  const name = readText(data, 'name', 120);
  const email = readText(data, 'email', 254);
  if (!name) return { error: 'Enter the investor’s name.' };
  if (!isValidEmail(email)) return { error: 'Enter a valid email address.' };

  const result = await createInvestor({ workspaceId: workspace.id, actorUserId: user.id, name, email });
  if (!result.ok) {
    return {
      error:
        result.error === 'email_taken'
          ? 'An investor with that email already exists in this workspace.'
          : 'Could not add the investor.',
    };
  }

  revalidatePath(`/w/${slug}/admin/investors`);
  redirect(`/w/${slug}/admin/investors/${result.investorId}`);
}

export async function addInvestorFromApplication(data: FormData): Promise<void> {
  const slug = readText(data, 'workspace', 60);
  const applicationId = readText(data, 'applicationId', 64);
  const { user, workspace } = await requireMembership(slug, MANAGER_ROLES, `/w/${slug}/admin`);
  const list = `/w/${slug}/admin/investors`;

  const application = isUuid(applicationId) ? await getApplication(workspace.id, applicationId) : null;
  if (!application) redirect(`${list}?notice=application_not_found`);
  if (application.investorId) redirect(`${list}/${application.investorId}`);

  const result = await createInvestor({
    workspaceId: workspace.id,
    actorUserId: user.id,
    name: application.name,
    email: application.email,
    applicationId: application.id,
  });
  if (!result.ok) redirect(`${list}?notice=${result.error}`);

  revalidatePath(`/w/${slug}/admin`);
  revalidatePath(list);
  redirect(`${list}/${result.investorId}`);
}

export type LedgerFormState = { ok: boolean; message: string };

const LEDGER_TYPES = ['commitment', 'capital_call', 'distribution'] as const;

const LEDGER_TYPE_LABELS = {
  commitment: 'commitment',
  capital_call: 'capital call',
  distribution: 'distribution',
} as const;

const LEDGER_ERRORS: Record<string, string> = {
  investor_not_found: 'That investor was not found.',
  invalid_amount: 'Enter a positive dollar amount, like 25,000 or 1,250.50.',
  invalid_date: 'Enter a valid date.',
  invalid_memo: 'The note is too long (500 characters at most).',
  exceeds_uncalled: 'A capital call cannot be larger than the investor’s uncalled commitment.',
};

export async function recordLedgerEntry(_prev: LedgerFormState, data: FormData): Promise<LedgerFormState> {
  const slug = readText(data, 'workspace', 60);
  const investorId = readText(data, 'investorId', 64);
  const { user, workspace } = await requireMembership(slug, MANAGER_ROLES, `/w/${slug}/admin/investors`);

  const type = LEDGER_TYPES.find((candidate) => candidate === readText(data, 'type', 20));
  if (!type || !isUuid(investorId)) return { ok: false, message: 'Choose what you are recording.' };

  const amountCents = parseMoneyToCents(readText(data, 'amount', 40));
  if (amountCents === null) return { ok: false, message: LEDGER_ERRORS.invalid_amount };

  const result = await addLedgerEntry({
    workspaceId: workspace.id,
    investorId,
    actorUserId: user.id,
    type,
    amountCents,
    effectiveDate: readText(data, 'date', 10),
    memo: readText(data, 'memo', 500),
  });
  if (!result.ok) return { ok: false, message: LEDGER_ERRORS[result.error] ?? 'Could not record the entry.' };

  revalidatePath(`/w/${slug}/admin/investors`);
  revalidatePath(`/w/${slug}/admin/investors/${investorId}`);
  return { ok: true, message: `Recorded ${LEDGER_TYPE_LABELS[type]}: ${formatCents(amountCents)}.` };
}

export type InviteState = { error: string; path: string; expiresAt: string };

export async function issueInvitation(_prev: InviteState, data: FormData): Promise<InviteState> {
  const slug = readText(data, 'workspace', 60);
  const investorId = readText(data, 'investorId', 64);
  const { user, workspace } = await requireMembership(slug, MANAGER_ROLES, `/w/${slug}/admin/investors`);

  if (!isUuid(investorId)) return { error: 'That investor was not found.', path: '', expiresAt: '' };
  const result = await createInvitation({ workspaceId: workspace.id, investorId, actorUserId: user.id });
  if (!result.ok) {
    return {
      error:
        result.error === 'already_active'
          ? 'This investor already has access.'
          : 'That investor was not found.',
      path: '',
      expiresAt: '',
    };
  }

  revalidatePath(`/w/${slug}/admin/investors`);
  revalidatePath(`/w/${slug}/admin/investors/${investorId}`);
  // The raw token leaves the server exactly once, in this response.
  return { error: '', path: `/invite/${result.token}`, expiresAt: result.expiresAt.toISOString() };
}
