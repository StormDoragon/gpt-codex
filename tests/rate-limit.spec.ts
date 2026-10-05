import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { PASSWORD, apply, formAlert, freshPage, randomIp, signUp } from './helpers';

async function tryLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
}

const WRONG = 'Incorrect email or password.';
const BLOCKED = /Too many failed sign-in attempts\. Try again in about \d+ minutes?\./;

test.describe('login rate limiting', () => {
  test('one address guessing a password is blocked, without locking out the real owner', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const owner = await signUp(page, 'Throttle');
    const { page: other } = await freshPage(browser, baseURL);
    const second = await signUp(other, 'Bystander');

    const attackerIp = randomIp();
    const { page: attacker } = await freshPage(browser, baseURL, attackerIp);
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await tryLogin(attacker, owner.email, `wrong password ${attempt}`);
      await expect(formAlert(attacker), `attempt ${attempt}`).toHaveText(WRONG);
    }

    // The ninth try is refused even with the CORRECT password: guessing is capped.
    await tryLogin(attacker, owner.email, PASSWORD);
    await expect(formAlert(attacker)).toHaveText(BLOCKED);

    // The same address can still sign in to a different account (it is not blanket-banned)...
    await tryLogin(attacker, second.email, PASSWORD);
    await expect(attacker).toHaveURL(new RegExp(`/w/${second.slug}/admin$`));

    // ...and the real owner, from their own address, is not locked out by the attacker.
    const { page: realOwner } = await freshPage(browser, baseURL);
    await tryLogin(realOwner, owner.email, PASSWORD);
    await expect(realOwner).toHaveURL(new RegExp(`/w/${owner.slug}/admin$`));
  });

  test('unknown accounts are limited identically, so the limit reveals nothing', async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const { page } = await freshPage(browser, baseURL);
    const ghost = `nobody-${Date.now()}@example.com`;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await tryLogin(page, ghost, `wrong password ${attempt}`);
      await expect(formAlert(page)).toHaveText(WRONG);
    }
    await tryLogin(page, ghost, 'one more guess');
    await expect(formAlert(page)).toHaveText(BLOCKED);
  });

  test('credential stuffing from one address is capped across many accounts', async ({ page, browser, baseURL }) => {
    test.setTimeout(240_000);
    const victim = await signUp(page, 'Stuffed');
    const ip = randomIp();
    const { page: stuffer } = await freshPage(browser, baseURL, ip);

    // 30 failures against 30 different accounts: each is under the per-account limit.
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      await tryLogin(stuffer, `stuff-${attempt}-${Date.now()}@example.com`, 'password guess');
      await expect(formAlert(stuffer), `attempt ${attempt}`).toHaveText(WRONG);
    }
    // Now the address itself is capped, even for a valid account with the right password.
    await tryLogin(stuffer, victim.email, PASSWORD);
    await expect(formAlert(stuffer)).toHaveText(BLOCKED);
  });

  test('rotating addresses does not beat the per-account cap', async ({ page, browser, baseURL }) => {
    test.setTimeout(300_000);
    const owner = await signUp(page, 'Rotated');
    const { context, page: attacker } = await freshPage(browser, baseURL);

    // 40 wrong guesses, each from a different address: no single address trips a limit.
    for (let attempt = 1; attempt <= 40; attempt += 1) {
      await context.setExtraHTTPHeaders({ 'x-forwarded-for': randomIp() });
      await tryLogin(attacker, owner.email, `wrong password ${attempt}`);
      await expect(formAlert(attacker), `attempt ${attempt}`).toHaveText(WRONG);
    }

    // The account-wide cap has now tripped, so a brand-new address is refused too.
    await context.setExtraHTTPHeaders({ 'x-forwarded-for': randomIp() });
    await tryLogin(attacker, owner.email, PASSWORD);
    await expect(formAlert(attacker)).toHaveText(BLOCKED);
  });
});

test.describe('signup and intake rate limiting', () => {
  test('signups from one address are capped, other addresses are unaffected', async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const ip = randomIp();
    for (let n = 1; n <= 5; n += 1) {
      const { page } = await freshPage(browser, baseURL, ip);
      await signUp(page, `Burst${n}`);
    }

    const { page: sixth } = await freshPage(browser, baseURL, ip);
    await sixth.goto('/signup');
    await sixth.fill('#signup-name', 'Sixth Person');
    await sixth.fill('#signup-workspace', 'Sixth Fund');
    await sixth.fill('#signup-email', `sixth-${Date.now()}@example.com`);
    await sixth.fill('#signup-password', PASSWORD);
    await sixth.getByRole('button', { name: /create workspace/i }).click();
    await expect(formAlert(sixth)).toContainText('Too many sign-up attempts from your network');
    await expect(sixth).toHaveURL(/\/signup/);

    const { page: elsewhere } = await freshPage(browser, baseURL);
    await signUp(elsewhere, 'Elsewhere');
  });

  test('the public intake form is capped per address and nothing extra is stored', async ({ page, browser, baseURL }) => {
    test.setTimeout(150_000);
    const owner = await signUp(page, 'Flooded');
    const spamIp = randomIp();
    const { page: spammer } = await freshPage(browser, baseURL, spamIp);

    for (let n = 1; n <= 10; n += 1) await apply(spammer, owner.slug, `Spam Person ${n}`);

    await spammer.goto(`/w/${owner.slug}/apply`);
    await spammer.fill('#apply-name', 'Spam Person 11');
    await spammer.fill('#apply-email', 'spam11@example.com');
    await spammer.check('#apply-risk');
    await spammer.getByRole('button', { name: /submit application/i }).click();
    await expect(formAlert(spammer)).toContainText('Too many submissions');

    // A genuine applicant from another address still gets through.
    const { page: genuine } = await freshPage(browser, baseURL);
    await apply(genuine, owner.slug, 'Genuine Applicant');

    // The blocked 11th submission was never stored: 10 spam + 1 genuine.
    await page.goto(`/w/${owner.slug}/admin`);
    await expect(page.getByTestId('pending-count')).toHaveText('11');
    await expect(page.getByText('Spam Person 11')).toHaveCount(0);
  });
});
