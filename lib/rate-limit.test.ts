import { randomUUID } from 'crypto';
import { describe, expect, it } from 'vitest';
import { LIMITS, describeWait } from './limits';
import { hit, isBlocked, reset, type Limit } from './rate-limit';

// A unique limit name per test keeps counters independent on a persistent database.
const limit = (max: number, windowSeconds = 60): Limit => ({ name: `test-${randomUUID()}`, max, windowSeconds });

// One second into a window, so nothing here depends on where "now" falls.
const windowStart = (windowSeconds: number) => Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000;

describe('hit', () => {
  it('allows exactly `max` events, then refuses', async () => {
    const l = limit(3);
    const now = windowStart(60) + 1000;
    const decisions = [];
    for (let i = 0; i < 5; i += 1) decisions.push(await hit(l, 'subject', now));
    expect(decisions.map((d) => d.allowed)).toEqual([true, true, true, false, false]);
    expect(decisions.map((d) => d.count)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps subjects independent', async () => {
    const l = limit(1);
    const now = windowStart(60) + 1000;
    expect((await hit(l, 'a', now)).allowed).toBe(true);
    expect((await hit(l, 'a', now)).allowed).toBe(false);
    expect((await hit(l, 'b', now)).allowed).toBe(true);
  });

  it('reports how long until the window resets', async () => {
    const l = limit(1, 600);
    const now = windowStart(600) + 100_000; // 100s into a 600s window
    const decision = await hit(l, 'x', now);
    expect(decision.retryAfterSeconds).toBe(500);
  });

  it('starts fresh in the next window', async () => {
    const l = limit(2, 60);
    const now = windowStart(60) + 1000;
    await hit(l, 'x', now);
    await hit(l, 'x', now);
    expect((await hit(l, 'x', now)).allowed).toBe(false);
    expect((await hit(l, 'x', now + 60_000)).allowed).toBe(true);
  });

  it('cannot be raced past the limit by simultaneous requests', async () => {
    const l = limit(10);
    const now = windowStart(60) + 1000;
    const decisions = await Promise.all(Array.from({ length: 40 }, () => hit(l, 'burst', now)));
    expect(decisions.filter((d) => d.allowed)).toHaveLength(10);
    expect(Math.max(...decisions.map((d) => d.count))).toBe(40);
  });
});

describe('isBlocked and reset', () => {
  it('blocks once `max` events are counted, without counting itself', async () => {
    const l = limit(3);
    const now = windowStart(60) + 1000;
    expect((await isBlocked(l, 'u', now)).blocked).toBe(false);
    await hit(l, 'u', now);
    await hit(l, 'u', now);
    expect((await isBlocked(l, 'u', now)).blocked).toBe(false);
    await hit(l, 'u', now);
    expect((await isBlocked(l, 'u', now)).blocked).toBe(true);

    // Checking repeatedly never changes the count.
    for (let i = 0; i < 5; i += 1) await isBlocked(l, 'u', now);
    expect((await hit(l, 'u', now)).count).toBe(4);
  });

  it('is released by reset', async () => {
    const l = limit(1);
    const now = windowStart(60) + 1000;
    await hit(l, 'u', now);
    expect((await isBlocked(l, 'u', now)).blocked).toBe(true);
    await reset(l, 'u');
    expect((await isBlocked(l, 'u', now)).blocked).toBe(false);
  });
});

describe('configured limits', () => {
  it('are sane: positive, and the narrower login limits are tighter than the broader ones', () => {
    for (const l of Object.values(LIMITS)) {
      expect(l.max).toBeGreaterThan(0);
      expect(l.windowSeconds).toBeGreaterThan(0);
    }
    // Per-(account, address) must trip before the per-address and per-account caps.
    expect(LIMITS.loginFailuresByAccountAndIp.max).toBeLessThan(LIMITS.loginFailuresByIp.max);
    expect(LIMITS.loginFailuresByAccountAndIp.max).toBeLessThan(LIMITS.loginFailuresByAccount.max);
    const names = Object.values(LIMITS).map((l) => l.name);
    expect(new Set(names).size).toBe(names.length); // names namespace the counters, so they must be unique
  });

  it('describes waits without false precision', () => {
    expect(describeWait(1)).toBe('about a minute');
    expect(describeWait(60)).toBe('about a minute');
    expect(describeWait(61)).toBe('about 2 minutes');
    expect(describeWait(15 * 60)).toBe('about 15 minutes');
  });
});
