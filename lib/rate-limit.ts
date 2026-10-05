import { and, eq, lt, sql } from 'drizzle-orm';
import { getDb, schema } from './db';

const { rateLimits } = schema;

export type Limit = { name: string; max: number; windowSeconds: number };
export type Decision = { allowed: boolean; count: number; retryAfterSeconds: number };

// Fixed windows: simple and cheap, at the cost of allowing up to 2x the limit
// across a window boundary. Counters are rows in Postgres so the limit holds
// across serverless instances, and the increment is one atomic upsert so
// concurrent requests cannot slip past it.

const EXPIRY_GRACE_MS = 60 * 60 * 1000;

const windowMs = (limit: Limit) => limit.windowSeconds * 1000;
const bucketOf = (limit: Limit, now: number) => Math.floor(now / windowMs(limit));
const keyOf = (limit: Limit, subject: string) => `${limit.name}:${subject}`;
const retryAfter = (limit: Limit, now: number) =>
  Math.max(1, Math.ceil(((bucketOf(limit, now) + 1) * windowMs(limit) - now) / 1000));

/** Counts one event and reports whether it is within the limit (the first `max` are allowed). */
export async function hit(limit: Limit, subject: string, now = Date.now()): Promise<Decision> {
  const db = await getDb();
  const bucket = bucketOf(limit, now);
  const [row] = await db
    .insert(rateLimits)
    .values({
      key: keyOf(limit, subject),
      bucket,
      count: 1,
      expiresAt: new Date((bucket + 1) * windowMs(limit) + EXPIRY_GRACE_MS),
    })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.bucket],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  // Housekeeping: now and then, sweep counters whose windows are long over.
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(lt(rateLimits.expiresAt, new Date(now)));
  }

  return { allowed: row.count <= limit.max, count: row.count, retryAfterSeconds: retryAfter(limit, now) };
}

/** Whether `max` events have already been counted in the current window. Does not count. */
export async function isBlocked(
  limit: Limit,
  subject: string,
  now = Date.now(),
): Promise<{ blocked: boolean; retryAfterSeconds: number }> {
  const db = await getDb();
  const [row] = await db
    .select({ count: rateLimits.count })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, keyOf(limit, subject)), eq(rateLimits.bucket, bucketOf(limit, now))));
  return { blocked: (row?.count ?? 0) >= limit.max, retryAfterSeconds: retryAfter(limit, now) };
}

/** Clears a counter, e.g. after a successful sign-in. */
export async function reset(limit: Limit, subject: string): Promise<void> {
  const db = await getDb();
  await db.delete(rateLimits).where(eq(rateLimits.key, keyOf(limit, subject)));
}
