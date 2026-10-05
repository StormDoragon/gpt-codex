import { createHash, randomBytes } from 'crypto';

/** A fresh 256-bit URL-safe random token. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored only as this hash, so a database leak does not expose usable tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
