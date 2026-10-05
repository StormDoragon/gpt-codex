import { afterEach, describe, expect, it } from 'vitest';
import { isUuid, isValidEmail, readText, safeNextPath } from './form';
import { signupCodeMatches, signupCodeRequired } from './signup-gate';

describe('safeNextPath', () => {
  it('keeps same-site relative paths', () => {
    expect(safeNextPath('/w/acme/admin')).toBe('/w/acme/admin');
    expect(safeNextPath('/login?next=%2Fx')).toBe('/login?next=%2Fx');
  });

  it('rejects anything that could leave the site', () => {
    for (const bad of ['//evil.example', 'https://evil.example', 'javascript:alert(1)', '/\\evil.example', '', null, undefined, 42]) {
      expect(safeNextPath(bad), String(bad)).toBe('');
    }
  });
});

describe('form helpers', () => {
  it('trims and caps text, and ignores non-text values', () => {
    const data = new FormData();
    data.set('a', '  hello  ');
    data.set('b', 'x'.repeat(50));
    data.set('c', new Blob(['file']), 'f.txt');
    expect(readText(data, 'a', 20)).toBe('hello');
    expect(readText(data, 'b', 10)).toHaveLength(10);
    expect(readText(data, 'c', 10)).toBe('');
    expect(readText(data, 'missing', 10)).toBe('');
  });

  it('validates emails and uuids', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail(`${'a'.repeat(250)}@b.co`)).toBe(false);
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid("1' OR '1'='1")).toBe(false);
  });
});

describe('signup beta gate', () => {
  const original = process.env.SIGNUP_INVITE_CODE;
  afterEach(() => {
    if (original === undefined) delete process.env.SIGNUP_INVITE_CODE;
    else process.env.SIGNUP_INVITE_CODE = original;
  });

  it('is open when no code is configured', () => {
    delete process.env.SIGNUP_INVITE_CODE;
    expect(signupCodeRequired()).toBe(false);
    expect(signupCodeMatches('')).toBe(true);
  });

  it('requires the exact code when configured', () => {
    process.env.SIGNUP_INVITE_CODE = 'beta-2026';
    expect(signupCodeRequired()).toBe(true);
    expect(signupCodeMatches('beta-2026')).toBe(true);
    expect(signupCodeMatches('beta-2027')).toBe(false);
    expect(signupCodeMatches('')).toBe(false);
  });
});
