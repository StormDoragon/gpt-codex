import { describe, expect, it } from 'vitest';
import { clientIpFrom } from './client-ip';

describe('clientIpFrom', () => {
  it('uses the only address when there is one proxy header entry', () => {
    expect(clientIpFrom('203.0.113.9', null)).toBe('203.0.113.9');
    expect(clientIpFrom('2001:db8::1', null)).toBe('2001:db8::1');
  });

  it('ignores client-supplied prefixes: with one trusted proxy it takes the LAST entry', () => {
    // The client sent "1.1.1.1" to pose as someone else; the trusted proxy appended the real address.
    expect(clientIpFrom('1.1.1.1, 198.51.100.7', null)).toBe('198.51.100.7');
    expect(clientIpFrom('9.9.9.9, 8.8.8.8, 198.51.100.7', null)).toBe('198.51.100.7');
  });

  it('counts back by the configured number of trusted hops', () => {
    const chain = 'client-forged, 192.0.2.10, 198.51.100.7';
    expect(clientIpFrom(chain, null, 1)).toBe('198.51.100.7');
    expect(clientIpFrom(chain, null, 2)).toBe('192.0.2.10');
    // More hops than entries: fall back to the first rather than failing.
    expect(clientIpFrom('192.0.2.10, 198.51.100.7', null, 5)).toBe('192.0.2.10');
  });

  it('treats an invalid hop count as one', () => {
    for (const hops of [0, -3, Number.NaN, 1.5]) {
      expect(clientIpFrom('1.1.1.1, 198.51.100.7', null, hops), String(hops)).toBe('198.51.100.7');
    }
  });

  it('refuses values that are not addresses, so they cannot pollute keys or logs', () => {
    for (const bad of ["1.2.3.4'; DROP TABLE x;--", '<script>', 'a'.repeat(100), 'not an ip']) {
      expect(clientIpFrom(bad, null), bad).toBe('unknown');
    }
    expect(clientIpFrom(null, '<script>')).toBe('unknown');
  });

  it('falls back to x-real-ip, then to "direct" for local development', () => {
    expect(clientIpFrom(null, '203.0.113.5')).toBe('203.0.113.5');
    expect(clientIpFrom('', ' 203.0.113.5 ')).toBe('203.0.113.5');
    expect(clientIpFrom(null, null)).toBe('direct');
    expect(clientIpFrom('  ,  ', null)).toBe('direct');
  });
});
