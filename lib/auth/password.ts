import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

// OWASP-recommended scrypt cost (N=2^15, r=8, p=3). The parameters are stored
// in each hash so the cost can be raised later without invalidating old hashes.
const N = 2 ** 15;
const R = 8;
const P = 3;
const KEY_LENGTH = 64;
const MAX_MEMORY = 128 * 1024 * 1024;

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, { N: n, r, p, maxmem: MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Returns `scrypt$N$r$p$salt$hash` (salt and hash hex-encoded). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, N, R, P, KEY_LENGTH);
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await derive(password, Buffer.from(saltHex, 'hex'), Number(n), Number(r), Number(p), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
