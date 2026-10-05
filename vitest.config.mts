import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
    // Throwaway in-memory Postgres unless DATABASE_URL points at a real server.
    env: { PGLITE_DIR: 'memory://' },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
