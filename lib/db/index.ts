import { mkdirSync } from 'fs';
import path from 'path';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Db = PgDatabase<any, typeof schema>;

const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

/**
 * Lazily creates the process-wide database handle.
 *
 * - `DATABASE_URL` set: real Postgres through postgres-js (production, CI).
 * - otherwise: embedded PGlite (WASM Postgres) so `npm run dev` and the test
 *   suite need no setup. `PGLITE_DIR` picks the data directory, or
 *   `memory://` for a throwaway in-memory database.
 *
 * Production fails closed: without `DATABASE_URL` it refuses to start rather
 * than silently using an embedded database that serverless hosts would lose.
 * `ALLOW_EMBEDDED_DB=1` is the explicit opt-in used by the local e2e run.
 */
export function getDb(): Promise<Db> {
  globalForDb.__db ??= createDb();
  return globalForDb.__db;
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const [{ default: postgres }, { drizzle }] = await Promise.all([
      import('postgres'),
      import('drizzle-orm/postgres-js'),
    ]);
    // prepare:false keeps this compatible with transaction-mode poolers
    // (PgBouncer, Neon's pooled endpoint).
    const client = postgres(url, { max: 5, prepare: false });
    return drizzle(client, { schema });
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_EMBEDDED_DB !== '1') {
    throw new Error(
      'DATABASE_URL is not set. Production needs a real Postgres database (set ALLOW_EMBEDDED_DB=1 only for local runs).',
    );
  }

  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ]);
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite');
  // PGlite creates its directory non-recursively, so make the parents first.
  // Prefixed locations such as memory:// are not filesystem paths.
  if (!dataDir.includes('://')) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  // The embedded database migrates itself. Real Postgres is migrated
  // explicitly with `npm run db:migrate` as part of a deploy.
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return db;
}

export { schema };
