/**
 * One JSON line per security-relevant event, on stdout, where hosting
 * platforms collect logs. Never pass passwords, tokens or full emails: use
 * `short()` to log an identifier you can correlate but not read.
 */
export function logSecurity(event: string, fields: Record<string, unknown> = {}): void {
  console.warn(JSON.stringify({ level: 'security', time: new Date().toISOString(), event, ...fields }));
}

/** A short, non-reversible handle for correlating events about the same subject. */
export function short(hash: string): string {
  return hash.slice(0, 12);
}
