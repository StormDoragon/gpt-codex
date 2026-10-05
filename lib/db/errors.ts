/** Extracts the Postgres unique-violation constraint name from a driver error, if it is one. */
export function uniqueViolationConstraint(error: unknown): string | null {
  // Drizzle wraps driver errors; postgres-js and PGlite expose the SQLSTATE as
  // `code` and the constraint under different property names.
  for (let current: unknown = error, depth = 0; current && depth < 4; depth += 1) {
    const candidate = current as { code?: string; constraint_name?: string; constraint?: string; cause?: unknown };
    if (candidate.code === '23505') {
      return candidate.constraint_name ?? candidate.constraint ?? 'unknown';
    }
    current = candidate.cause;
  }
  return null;
}
