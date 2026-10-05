'use server';

import { redirect } from 'next/navigation';
import { authenticate, normalizeEmail } from '../../lib/accounts';
import { MAX_PASSWORD_LENGTH } from '../../lib/auth/password-policy';
import { endSession, startSession } from '../../lib/auth/session';
import { readText, safeNextPath } from '../../lib/form';
import { LIMITS, describeWait } from '../../lib/limits';
import { logSecurity, short } from '../../lib/log';
import { hit, isBlocked, reset } from '../../lib/rate-limit';
import { getClientIp } from '../../lib/request';
import { hashToken } from '../../lib/tokens';

export type LoginState = { error: string };

export async function login(_prev: LoginState, data: FormData): Promise<LoginState> {
  const email = readText(data, 'email', 254);
  const password = typeof data.get('password') === 'string' ? (data.get('password') as string) : '';
  const next = safeNextPath(data.get('next'));

  if (!email || !password) {
    return { error: 'Enter your email and password.' };
  }

  // Failed attempts are counted per (account, address), per account, and per
  // address. The message is identical for unknown and known accounts, so the
  // limits reveal nothing about which emails are registered.
  const ip = getClientIp();
  const accountHash = hashToken(normalizeEmail(email));
  const pair = `${accountHash}:${ip}`;

  const checks = await Promise.all([
    isBlocked(LIMITS.loginFailuresByAccountAndIp, pair),
    isBlocked(LIMITS.loginFailuresByAccount, accountHash),
    isBlocked(LIMITS.loginFailuresByIp, ip),
  ]);
  const blocked = checks.filter((check) => check.blocked);
  if (blocked.length > 0) {
    logSecurity('login.blocked', { ip, account: short(accountHash) });
    const wait = Math.max(...blocked.map((check) => check.retryAfterSeconds));
    return { error: `Too many failed sign-in attempts. Try again in ${describeWait(wait)}.` };
  }

  // Over-long inputs can't be a real password; reject before spending a hash.
  const user = password.length > MAX_PASSWORD_LENGTH ? null : await authenticate(email, password);
  if (!user) {
    await Promise.all([
      hit(LIMITS.loginFailuresByAccountAndIp, pair),
      hit(LIMITS.loginFailuresByAccount, accountHash),
      hit(LIMITS.loginFailuresByIp, ip),
    ]);
    logSecurity('login.failed', { ip, account: short(accountHash) });
    return { error: 'Incorrect email or password.' };
  }

  await reset(LIMITS.loginFailuresByAccountAndIp, pair);
  await startSession(user.id);
  redirect(next || '/workspaces');
}

export async function logout(): Promise<void> {
  await endSession();
  redirect('/');
}
