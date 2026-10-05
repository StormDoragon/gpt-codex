import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export type Role = 'investor' | 'admin';

export const SESSION_COOKIE = 'demo-session';
export const SESSION_MAX_AGE = 60 * 60 * 8;

const isProduction = process.env.NODE_ENV === 'production';

// Development-only fallbacks so `npm run dev` works with zero setup. In
// production none of these exist: the login fails closed until the real
// values are configured through environment variables.
const DEV_CODES: Record<Role, string> = { investor: 'gsc-demo', admin: 'gsc-admin' };
const DEV_SECRET = 'dev-only-session-secret';

const CODE_ENV: Record<Role, string> = {
  investor: 'DEMO_INVESTOR_CODE',
  admin: 'DEMO_ADMIN_CODE',
};

export function getAccessCode(role: Role): string | null {
  return process.env[CODE_ENV[role]] || (isProduction ? null : DEV_CODES[role]);
}

function getSecret(): string | null {
  return process.env.SESSION_SECRET || (isProduction ? null : DEV_SECRET);
}

export function isLoginConfigured(): boolean {
  return Boolean(getSecret() && getAccessCode('investor') && getAccessCode('admin'));
}

/** True only when the dev fallback codes are in effect (never in production). */
export function usesDevCodes(): boolean {
  return !isProduction && !process.env.DEMO_INVESTOR_CODE && !process.env.DEMO_ADMIN_CODE;
}

export function devCodeHint(): Record<Role, string> {
  return DEV_CODES;
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Creates a signed, expiring session token: `role.expiresAt.signature`. */
export function createSessionToken(role: Role): string {
  const secret = getSecret();
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const payload = `${role}.${Math.floor(Date.now() / 1000) + SESSION_MAX_AGE}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function getSessionRole(): Role | null {
  const secret = getSecret();
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!secret || !token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [role, expires, signature] = parts;

  if (role !== 'admin' && role !== 'investor') return null;
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;
  if (!safeEqual(signature, sign(`${role}.${expires}`, secret))) return null;

  return role;
}
