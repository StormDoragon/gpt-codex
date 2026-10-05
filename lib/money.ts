/** Largest single amount accepted: $10,000,000,000.00. */
export const MAX_AMOUNT_CENTS = 1_000_000_000_000;

// Digits with optional thousands separators and up to two decimals.
const AMOUNT_PATTERN = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/;

/**
 * Parses a user-entered dollar amount ("25,000", "$1,234.50") into integer
 * cents, or null if it is not a valid positive amount. Money is never held in
 * floating point.
 */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, '');
  if (!AMOUNT_PATTERN.test(cleaned)) return null;

  const [dollars, fraction = ''] = cleaned.replace(/,/g, '').split('.');
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : null;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}
