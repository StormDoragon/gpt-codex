'use server';

import { redirect } from 'next/navigation';
import { authenticate } from '../../lib/accounts';
import { MAX_PASSWORD_LENGTH } from '../../lib/auth/password-policy';
import { endSession, startSession } from '../../lib/auth/session';
import { readText, safeNextPath } from '../../lib/form';

export type LoginState = { error: string };

export async function login(_prev: LoginState, data: FormData): Promise<LoginState> {
  const email = readText(data, 'email', 254);
  const password = typeof data.get('password') === 'string' ? (data.get('password') as string) : '';
  const next = safeNextPath(data.get('next'));

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  // Over-long inputs can't be a real password; reject before spending a hash.
  const user = password.length > MAX_PASSWORD_LENGTH ? null : await authenticate(email, password);
  if (!user) {
    return { error: 'Incorrect email or password.' };
  }

  await startSession(user.id);
  redirect(next || '/workspaces');
}

export async function logout(): Promise<void> {
  await endSession();
  redirect('/');
}
