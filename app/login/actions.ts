'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  getAccessCode,
  isLoginConfigured,
  safeEqual,
} from '../../lib/auth';

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

  if (!isLoginConfigured()) {
    return { error: 'Portal login is not configured on this deployment.' };
  }
  if (role !== 'investor' && role !== 'admin') {
    return { error: 'Please choose a role.' };
  }
  const expected = getAccessCode(role);
  if (!expected || !safeEqual(code, expected)) {
    return { error: 'Incorrect access code.' };
  }

  cookies().set(SESSION_COOKIE, createSessionToken(role), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  redirect(next || (role === 'admin' ? '/admin' : '/investor'));
}

export async function logout(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
  redirect('/');
}
