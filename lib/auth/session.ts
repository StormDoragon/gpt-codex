import { cache } from 'react';
import { cookies } from 'next/headers';
import { createSessionRow, deleteSession, findSessionUser, type SessionUser } from '../accounts';

export const SESSION_COOKIE = 'session';

/** Creates a server-side session and sets its cookie. Server actions and route handlers only. */
export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSessionRow(userId);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

/** The signed-in user for this request, or null. Memoized per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? findSessionUser(token) : null;
});

export async function endSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  cookies().delete(SESSION_COOKIE);
}
