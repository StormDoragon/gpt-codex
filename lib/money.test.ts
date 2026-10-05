import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT_CENTS, formatCents, parseMoneyToCents } from './money';

describe('parseMoneyToCents', () => {
  it('parses common dollar formats into integer cents', () => {
    expect(parseMoneyToCents('25000')).toBe(2_500_000);
    expect(parseMoneyToCents('25,000')).toBe(2_500_000);
    expect(parseMoneyToCents('$25,000')).toBe(2_500_000);
    expect(parseMoneyToCents('  $1,234.50 ')).toBe(123_450);
    expect(parseMoneyToCents('1234.5')).toBe(123_450);
    expect(parseMoneyToCents('0.01')).toBe(1);
    expect(parseMoneyToCents('1,000,000')).toBe(100_000_000);
  });

  it('has no floating point drift', () => {
    // 0.1 + 0.2 style traps: these must be exact.
    expect(parseMoneyToCents('0.29')).toBe(29);
    expect(parseMoneyToCents('1.15')).toBe(115);
    expect(parseMoneyToCents('4.35')).toBe(435);
  });

  it('rejects anything that is not a positive amount', () => {
    for (const bad of ['', ' ', '0', '0.00', '-5', '+5', '1e5', '12.345', '1,23', '1,2345', '1,,000', '$$5', '5$', 'abc', '1.', '.5', 'NaN', 'Infinity']) {
      expect(parseMoneyToCents(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('enforces the maximum', () => {
    expect(parseMoneyToCents('10,000,000,000.00')).toBe(MAX_AMOUNT_CENTS);
    expect(parseMoneyToCents('10,000,000,000.01')).toBeNull();
    expect(parseMoneyToCents('99999999999999999999')).toBeNull();
  });
});

describe('formatCents', () => {
  it('formats as US dollars', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(123_450)).toBe('$1,234.50');
    expect(formatCents(2_500_000)).toBe('$25,000.00');
  });
});
