'use server';

import { redirect } from 'next/navigation';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../../../lib/auth/password-policy';
import { getSessionUser, startSession } from '../../../lib/auth/session';
import { readText } from '../../../lib/form';
import { acceptInvitation } from '../../../lib/invitations';

export type AcceptState = { error: string };

const MESSAGES = {
  invalid: 'This invitation link is no longer valid. Ask your fund manager for a new one.',
  email_mismatch: 'You are signed in with a different email than the one this invitation was sent to. Sign out and try again.',
  account_exists: 'An account already exists for this email. Sign in to accept the invitation.',
  already_member: 'You already have access to this workspace.',
  investor_claimed: 'This invitation has already been used.',
  needs_account: 'Create a name and password to continue.',
} as const;

export async function acceptInvite(_prev: AcceptState, data: FormData): Promise<AcceptState> {
  const token = readText(data, 'token', 200);
  // Who is accepting comes from the session cookie, never from form fields.
  const sessionUser = await getSessionUser();

  let newAccount: { name: string; password: string } | undefined;
  if (!sessionUser) {
    const name = readText(data, 'name', 120);
    const password = typeof data.get('password') === 'string' ? (data.get('password') as string) : '';
    if (!name) return { error: 'Please enter your name.' };
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return { error: `Use a password of at most ${MAX_PASSWORD_LENGTH} characters.` };
    }
    newAccount = { name, password };
  }

  const result = await acceptInvitation({ token, sessionUser, newAccount });
  if (!result.ok) return { error: MESSAGES[result.error] };

  if (!sessionUser) await startSession(result.userId);
  redirect(`/w/${result.workspaceSlug}/investor`);
}
