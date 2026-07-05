import { test, expect, type Page } from '@playwright/test';

const ACCESS_CODE = 'gsc-demo';

async function login(page: Page, role: 'investor' | 'admin') {
  await page.goto('/login');
  await page.selectOption('#login-role', role);
  await page.fill('#login-code', ACCESS_CODE);
  await page.getByRole('button', { name: /enter demo portal/i }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}$`));
}

test.describe('public site', () => {
  test('homepage renders the brand, model, and security sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Global Standard Capital/);
    await expect(page.getByRole('heading', { name: /Private Capital/ })).toBeVisible();
    await expect(page.locator('#model')).toBeVisible();
    await expect(page.locator('#security')).toBeVisible();
    await expect(page.getByText(/Lorem ipsum/)).toHaveCount(0);
  });

  test('primary navigation links resolve', async ({ page }) => {
    await page.goto('/');
    for (const path of ['/investor', '/admin', '/disclosures', '/apply']) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should not 404`).toBeLessThan(400);
    }
  });

  test('unknown routes return the custom 404', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/isn't part of the prototype/i)).toBeVisible();
  });
});

test.describe('access control', () => {
  test('investor portal requires login', async ({ page }) => {
    await page.goto('/investor');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin console requires login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('an incorrect access code is rejected', async ({ page }) => {
    await page.goto('/login');
    await page.selectOption('#login-role', 'admin');
    await page.fill('#login-code', 'wrong-code');
    await page.getByRole('button', { name: /enter demo portal/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('investor can sign in and out', async ({ page }) => {
    await login(page, 'investor');
    await expect(page.getByRole('heading', { name: /capital tracking dashboard/i })).toBeVisible();
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/investor');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('apply flow', () => {
  test('submitting an application confirms and validates', async ({ page }) => {
    await page.goto('/apply');
    // Empty submit is blocked by required fields (no success status appears).
    await page.getByRole('button', { name: /submit application preview/i }).click();
    await expect(page.getByRole('status')).toHaveCount(0);

    await page.fill('#apply-name', 'Smoke Test Applicant');
    await page.fill('#apply-email', 'smoke@example.com');
    await page.check('#apply-risk');
    await page.getByRole('button', { name: /submit application preview/i }).click();
    await expect(page.getByRole('status')).toContainText(/review queue/i);
  });

  test('an admin can approve a pending application', async ({ page }) => {
    await login(page, 'admin');
    const pendingStat = page.locator('.stat-grid article').first().locator('strong');
    const before = Number(await pendingStat.textContent());
    expect(before).toBeGreaterThan(0);

    await page.getByRole('button', { name: /^Approve$/ }).first().click();
    await expect(pendingStat).toHaveText(String(before - 1));
  });
});
