// Applies the SQL migrations in ./drizzle to the Postgres database at
// DATABASE_URL. Run it as part of every deploy: `npm run db:migrate`.
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });
try {
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  console.log('Migrations applied.');
} finally {
  await client.end();
}
