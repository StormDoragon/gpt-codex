import { describe, expect, it } from 'vitest';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password-policy';

// Pinned to OWASP ASVS 4.0.3 so a casual edit cannot silently weaken the policy.
describe('password policy', () => {
  it('requires at least 12 characters (ASVS 2.1.1)', () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(12);
  });

  it('permits at least 64 characters, so passphrases and password managers work (ASVS 2.1.2)', () => {
    expect(MAX_PASSWORD_LENGTH).toBeGreaterThanOrEqual(64);
  });

  it('keeps an upper bound, so hashing cannot be used for denial of service', () => {
    expect(MAX_PASSWORD_LENGTH).toBeLessThanOrEqual(1000);
    expect(MAX_PASSWORD_LENGTH).toBeGreaterThan(MIN_PASSWORD_LENGTH);
  });
});
