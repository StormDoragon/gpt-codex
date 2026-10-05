import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

// The production server fails closed without credentials, so the e2e run
// supplies its own. The web server and the test workers both inherit these.
process.env.DEMO_INVESTOR_CODE ??= 'e2e-investor-code';
process.env.DEMO_ADMIN_CODE ??= 'e2e-admin-code';
process.env.SESSION_SECRET ??= 'e2e-session-secret-not-for-production';

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
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
