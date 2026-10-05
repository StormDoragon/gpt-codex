const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * Picks the client address out of proxy headers.
 *
 * `X-Forwarded-For` is a list the client can prefill; each proxy then appends
 * the address it saw. Only the entries added by proxies we trust are reliable,
 * so we read from the RIGHT: with `trustedHops` = 1 (one trusted proxy, such as
 * the hosting platform's edge) that is the last entry. Taking the first entry
 * would let anyone choose their own rate-limit identity by sending the header.
 *
 * Returns 'direct' when there is no proxy header (local development), and
 * 'unknown' when the header is present but is not an address.
 */
export function clientIpFrom(forwardedFor: string | null, realIp: string | null, trustedHops = 1): string {
  const hops = Number.isInteger(trustedHops) && trustedHops >= 1 ? trustedHops : 1;

  const chain = (forwardedFor ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (chain.length > 0) {
    const candidate = chain[Math.max(0, chain.length - hops)];
    return IP_PATTERN.test(candidate) ? candidate : 'unknown';
  }

  const single = realIp?.trim();
  if (single) return IP_PATTERN.test(single) ? single : 'unknown';
  return 'direct';
}
