import { test as base, expect } from '@playwright/test';
import { randomIp } from './helpers';

// Every test gets its own client address, so per-address rate limits can never
// couple unrelated tests that all really come from localhost.
export const test = base.extend({
  extraHTTPHeaders: async ({}, use) => {
    await use({ 'x-forwarded-for': randomIp() });
  },
});

export { expect };
