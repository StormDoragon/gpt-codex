'use server';

import { redirect } from 'next/navigation';
import { endSession, getSessionUser } from '../../lib/auth/session';
import { deleteAccount } from '../../lib/deletion';
import { readText } from '../../lib/form';
import { logSecurity, short } from '../../lib/log';
import { getClientIp } from '../../lib/request';
import { hashToken } from '../../lib/tokens';

export type DeleteAccountState = { error: string };

export async function deleteAccountAction(_prev: DeleteAccountState, data: FormData): Promise<DeleteAccountState> {
  // Whose account is deleted comes from the session cookie, never from the form.
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/account');

  if (readText(data, 'confirm', 254).toLowerCase() !== user.email) {
    return { error: 'The email you typed does not match your account. Nothing was deleted.' };
  }

  const result = await deleteAccount(user.id);
  if (!result.ok) {
    const names = result.workspaces.map((workspace) => workspace.name).join(', ');
    return { error: `You still own ${names}. Delete ${result.workspaces.length === 1 ? 'it' : 'them'} first.` };
  }

  logSecurity('account.deleted', { ip: getClientIp(), actor: short(hashToken(user.email)) });
  await endSession();
  redirect('/');
}
