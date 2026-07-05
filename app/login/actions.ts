'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, getDemoAccessCode } from '../../lib/auth';

export type LoginState = {
  error: string;
};

function safeNext(value: FormDataEntryValue | null): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '';
}

export async function login(_prev: LoginState, data: FormData): Promise<LoginState> {
  const role = data.get('role');
  const code = typeof data.get('code') === 'string' ? (data.get('code') as string).trim() : '';
  const next = safeNext(data.get('next'));

  if (role !== 'investor' && role !== 'admin') {
    return { error: 'Please choose a role.' };
  }
  if (code !== getDemoAccessCode()) {
    return { error: 'Incorrect access code.' };
  }

  cookies().set(SESSION_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect(next || (role === 'admin' ? '/admin' : '/investor'));
}

export async function logout(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
  redirect('/');
}
