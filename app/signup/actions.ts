'use server';

import { redirect } from 'next/navigation';
import { createAccountWithWorkspace } from '../../lib/accounts';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../../lib/auth/password-policy';
import { startSession } from '../../lib/auth/session';
import { isValidEmail, readText } from '../../lib/form';
import { signupCodeMatches } from '../../lib/signup-gate';

export type SignupState = { error: string };

export async function signup(_prev: SignupState, data: FormData): Promise<SignupState> {
  const name = readText(data, 'name', 120);
  const workspaceName = readText(data, 'workspaceName', 120);
  const email = readText(data, 'email', 254);
  const password = typeof data.get('password') === 'string' ? (data.get('password') as string) : '';

  if (!signupCodeMatches(readText(data, 'inviteCode', 200))) {
    return { error: 'That beta access code is not valid.' };
  }
  if (!name || !workspaceName) {
    return { error: 'Please enter your name and a name for your workspace.' };
  }
  if (!isValidEmail(email)) {
    return { error: 'Please enter a valid email address.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: `Use a password of at most ${MAX_PASSWORD_LENGTH} characters.` };
  }

  const result = await createAccountWithWorkspace({ name, workspaceName, email, password });
  if (!result.ok) {
    return {
      error:
        result.error === 'email_taken'
          ? 'An account with that email already exists. Try signing in instead.'
          : 'Something went wrong creating your workspace. Please try again.',
    };
  }

  await startSession(result.userId);
  redirect(`/w/${result.workspaceSlug}/admin`);
}
