/** Reads a form field as a trimmed string capped at `max` characters ('' if absent or not text). */
export function readText(data: FormData, key: string, max: number): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Only same-site relative paths are allowed as post-login redirect targets. */
export function safeNextPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '';
}
