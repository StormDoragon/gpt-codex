import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;
// A second copy of the app pointed at a database that cannot be reached, used
// to check what visitors see when something genuinely fails.
const brokenPort = port + 1;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `npm run start -- -p ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        // Use the Postgres in DATABASE_URL when given (CI does). Otherwise fall
        // back to a throwaway in-memory embedded database so a local run needs
        // no setup. Production still refuses to start without DATABASE_URL.
        ALLOW_EMBEDDED_DB: '1',
        PGLITE_DIR: 'memory://',
        ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
      },
    },
    {
      command: `npm run start -- -p ${brokenPort}`,
      url: `http://localhost:${brokenPort}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        // Nothing listens on port 9, so every database call fails.
        DATABASE_URL: 'postgres://nobody:secret-password@127.0.0.1:9/nodb',
      },
    },
  ],
});
