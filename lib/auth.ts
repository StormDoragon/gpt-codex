import { cookies } from 'next/headers';

export type Role = 'investor' | 'admin';

export const SESSION_COOKIE = 'demo-session';

const DEFAULT_ACCESS_CODE = 'gsc-demo';

export function getSessionRole(): Role | null {
  const value = cookies().get(SESSION_COOKIE)?.value;
  return value === 'admin' || value === 'investor' ? value : null;
}

export function getDemoAccessCode(): string {
  return process.env.DEMO_ACCESS_CODE ?? DEFAULT_ACCESS_CODE;
}

export function isDefaultAccessCode(): boolean {
  return !process.env.DEMO_ACCESS_CODE;
}
