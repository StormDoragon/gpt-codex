import { timingSafeEqual } from 'crypto';

/**
 * Closed-beta gate. When SIGNUP_INVITE_CODE is set, creating a workspace
 * requires that code; when it is unset, signup is open.
 */
export function signupCodeRequired(): boolean {
  return Boolean(process.env.SIGNUP_INVITE_CODE);
}

export function signupCodeMatches(provided: string): boolean {
  const expected = process.env.SIGNUP_INVITE_CODE;
  if (!expected) return true;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
