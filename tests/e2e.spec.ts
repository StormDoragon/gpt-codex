import { test, expect } from './fixtures';
import { PASSWORD, apply, formAlert, freshPage, signUp } from './helpers';

test.describe('public site', () => {
  test('homepage presents the product honestly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LP Portal/);
    await expect(page.getByRole('heading', { name: /without the spreadsheet/i })).toBeVisible();
    await expect(page.locator('#how')).toBeVisible();
    await expect(page.locator('#security')).toBeVisible();
    await expect(page.getByText('Available now').first()).toBeVisible();
    await expect(page.getByText('Coming soon').first()).toBeVisible();
    await expect(page.getByText(/Lorem ipsum/)).toHaveCount(0);
  });

  test('public pages resolve and unknown routes get the custom 404', async ({ page }) => {
    for (const path of ['/', '/legal', '/login', '/signup']) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should not error`).toBeLessThan(400);
    }
    const missing = await page.goto('/does-not-exist');
    expect(missing?.status()).toBe(404);
    await expect(page.getByText(/couldn't find that page/i)).toBeVisible();
  });

  test('responses carry the security headers', async ({ request }) => {
    const headers = (await request.get('/')).headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['strict-transport-security']).toMatch(/max-age=\d{7,}/);
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('an unknown workspace intake link is a 404', async ({ page }) => {
    const response = await page.goto('/w/no-such-workspace-xyz/apply');
    expect(response?.status()).toBe(404);
  });
});

test.describe('accounts and sessions', () => {
  test('workspace pages require sign-in', async ({ page }) => {
    await page.goto('/w/anything/admin');
    await expect(page).toHaveURL(/\/login\?next=%2Fw%2Fanything%2Fadmin/);
    await page.goto('/workspaces');
    await expect(page).toHaveURL(/\/login/);
  });

  test('signup creates a workspace and a hardened session cookie', async ({ page, context }) => {
    const account = await signUp(page, 'Cookie');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(account.workspace);

    const session = (await context.cookies()).find((cookie) => cookie.name === 'session');
    expect(session, 'session cookie is set').toBeTruthy();
    expect(session!.httpOnly).toBe(true);
    expect(session!.sameSite).toBe('Lax');
    expect(session!.value.length).toBeGreaterThanOrEqual(40);
    expect(session!.value).not.toMatch(/owner|admin|investor/i);
  });

  test('signed-in pages are never cached by browsers or shared proxies', async ({ page, context }) => {
    const owner = await signUp(page, 'NoCache');
    for (const path of [
      `/w/${owner.slug}/admin`,
      `/w/${owner.slug}/admin/investors`,
      `/w/${owner.slug}/admin/settings`,
      `/w/${owner.slug}/investor`,
      '/account',
      '/workspaces',
    ]) {
      const response = await context.request.get(path);
      expect(response.status(), path).toBe(200);
      const cacheControl = response.headers()['cache-control'] ?? '';
      expect(cacheControl, `${path} cache-control`).toContain('no-store');
      expect(cacheControl, `${path} cache-control`).toContain('private');
    }
  });

  test('the server enforces the password policy even when the browser check is bypassed', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('#signup-name', 'Weak Password');
    await page.fill('#signup-workspace', 'Weak Fund');
    await page.fill('#signup-email', `weak-${Date.now()}@example.com`);
    await page.fill('#signup-password', 'only11chars'); // 11 characters
    // Remove the HTML minlength attribute, as a script or a hand-built request would.
    await page.locator('#signup-password').evaluate((el) => el.removeAttribute('minlength'));
    await page.getByRole('button', { name: /create workspace/i }).click();
    await expect(formAlert(page)).toContainText('at least 12 characters');
    await expect(page).toHaveURL(/\/signup/);
  });

  test('a duplicate email cannot sign up again', async ({ page, browser, baseURL }) => {
    const first = await signUp(page, 'Dupe');
    const { page: other } = await freshPage(browser, baseURL);
    await other.goto('/signup');
    await other.fill('#signup-name', 'Someone Else');
    await other.fill('#signup-workspace', 'Other Fund');
    await other.fill('#signup-email', first.email.toUpperCase());
    await other.fill('#signup-password', PASSWORD);
    await other.getByRole('button', { name: /create workspace/i }).click();
    await expect(formAlert(other)).toContainText(/already exists/i);
    await expect(other).toHaveURL(/\/signup/);
  });

  test('sign out ends the session; sign in works; bad credentials are rejected alike', async ({
    page,
    browser,
    baseURL,
  }) => {
    const account = await signUp(page, 'Login');
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto(`/w/${account.slug}/admin`);
    await expect(page).toHaveURL(/\/login/);

    const { page: visitor } = await freshPage(browser, baseURL);
    for (const [email, password] of [
      [account.email, 'the wrong password!'],
      ['nobody-here@example.com', PASSWORD],
    ]) {
      await visitor.goto('/login');
      await visitor.fill('#login-email', email);
      await visitor.fill('#login-password', password);
      await visitor.getByRole('button', { name: /^sign in$/i }).click();
      await expect(formAlert(visitor)).toHaveText('Incorrect email or password.');
    }

    await visitor.fill('#login-email', account.email);
    await visitor.fill('#login-password', PASSWORD);
    await visitor.getByRole('button', { name: /^sign in$/i }).click();
    await expect(visitor).toHaveURL(new RegExp(`/w/${account.slug}/admin$`));
  });

  test('forged or guessed session cookies grant nothing', async ({ page, browser, baseURL }) => {
    const account = await signUp(page, 'Forge');
    for (const forged of ['admin', 'owner', 'investor', 'x'.repeat(43), 'admin.9999999999.deadbeef']) {
      const { context, page: attacker } = await freshPage(browser, baseURL);
      await context.addCookies([{ name: 'session', value: forged, url: baseURL! }]);
      await attacker.goto(`/w/${account.slug}/admin`);
      await expect(attacker, `forged "${forged}" must not open the admin console`).toHaveURL(/\/login/);
      await context.close();
    }
  });
});

test.describe('review workflow', () => {
  test('a manager receives, approves and audits an application', async ({ page, browser, baseURL }) => {
    const owner = await signUp(page, 'Review');
    const { page: visitor } = await freshPage(browser, baseURL);
    await apply(visitor, owner.slug, 'Pat Applicant');

    await page.goto(`/w/${owner.slug}/admin`);
    await expect(page.getByTestId('pending-count')).toHaveText('1');
    await page.getByRole('button', { name: 'Approve Pat Applicant' }).click();
    await expect(page.getByTestId('pending-count')).toHaveText('0');
    await expect(page.locator('.activity-list')).toContainText(`${owner.name} approved an application from Pat Applicant`);
  });

  test('the honeypot field silently drops bot submissions', async ({ page, browser, baseURL }) => {
    const owner = await signUp(page, 'Honey');
    const { page: bot } = await freshPage(browser, baseURL);
    await bot.goto(`/w/${owner.slug}/apply`);
    await bot.fill('#apply-name', 'Spam Bot');
    await bot.fill('#apply-email', 'spam@example.com');
    await bot.check('#apply-risk');
    await bot.locator('#apply-website').evaluate((el) => {
      (el as HTMLInputElement).value = 'http://spam.example';
    });
    await bot.getByRole('button', { name: /submit application/i }).click();
    await expect(bot.getByRole('status')).toContainText(/will review your application/i);

    await page.goto(`/w/${owner.slug}/admin`);
    await expect(page.getByText('Spam Bot')).toHaveCount(0);
    await expect(page.getByTestId('pending-count')).toHaveText('0');
  });

  test('the investor view is a clearly labelled sample', async ({ page }) => {
    const owner = await signUp(page, 'Sample');
    await page.goto(`/w/${owner.slug}/investor`);
    await expect(page.getByText(/sample data/i).first()).toBeVisible();
    // The allocation chart actually draws its four slices (it can fail silently across React upgrades).
    await expect(page.locator('.recharts-pie-sector')).toHaveCount(4);
  });
});

test.describe('tenant isolation', () => {
  test('one workspace cannot see, open, or change another', async ({ browser, baseURL }) => {
    const { page: alphaPage } = await freshPage(browser, baseURL);
    const { page: bravoPage } = await freshPage(browser, baseURL);
    const { page: visitor } = await freshPage(browser, baseURL);

    const alpha = await signUp(alphaPage, 'Alpha');
    const bravo = await signUp(bravoPage, 'Bravo');
    await apply(visitor, alpha.slug, 'Alice Applicant');
    await apply(visitor, bravo.slug, 'Bruno Applicant');

    // Each queue shows only its own applicants.
    await alphaPage.goto(`/w/${alpha.slug}/admin`);
    await expect(alphaPage.getByText('Alice Applicant')).toBeVisible();
    await expect(alphaPage.getByText('Bruno Applicant')).toHaveCount(0);
    await bravoPage.goto(`/w/${bravo.slug}/admin`);
    await expect(bravoPage.getByText('Bruno Applicant')).toBeVisible();
    await expect(bravoPage.getByText('Alice Applicant')).toHaveCount(0);

    // Alpha cannot open Bravo's workspace pages.
    for (const area of ['admin', 'investor']) {
      const response = await alphaPage.goto(`/w/${bravo.slug}/${area}`);
      expect(response?.status(), `alpha opening bravo's ${area}`).toBe(404);
    }

    // Attack 1: Alpha edits the application id in its own form to Bravo's.
    const bravoApplicationId = await bravoPage.locator('form input[name=id]').first().inputValue();
    await alphaPage.goto(`/w/${alpha.slug}/admin`);
    await alphaPage.locator('form input[name=id]').first().evaluate((el, id) => {
      (el as HTMLInputElement).value = id;
    }, bravoApplicationId);
    await alphaPage.getByRole('button', { name: 'Approve Alice Applicant' }).click();

    // Attack 2: Alpha points the form's workspace field at Bravo.
    await alphaPage.goto(`/w/${alpha.slug}/admin`);
    await alphaPage.locator('form input[name=id]').first().evaluate(
      (el, { id, slug }) => {
        const form = (el as HTMLInputElement).form!;
        (el as HTMLInputElement).value = id;
        (form.elements.namedItem('workspace') as HTMLInputElement).value = slug;
      },
      { id: bravoApplicationId, slug: bravo.slug },
    );
    await alphaPage.getByRole('button', { name: 'Approve Alice Applicant' }).click();

    // Bravo's application was never touched, and nothing was audited for it.
    await bravoPage.goto(`/w/${bravo.slug}/admin`);
    await expect(bravoPage.getByTestId('pending-count')).toHaveText('1');
    await expect(bravoPage.getByText('Reviewed')).toHaveCount(0);
    await expect(bravoPage.locator('.activity-list')).toHaveCount(0);

    // And Alpha's own application was not silently changed either.
    await alphaPage.goto(`/w/${alpha.slug}/admin`);
    await expect(alphaPage.getByTestId('pending-count')).toHaveText('1');
  });
});
