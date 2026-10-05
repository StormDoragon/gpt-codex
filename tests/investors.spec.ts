import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import {
  PASSWORD,
  acceptAsNewAccount,
  addInvestor,
  apply,
  captureAction,
  formAlert,
  freshPage,
  onboardInvestor,
  recordEntry,
  replayAction,
  signUp,
  unique,
} from './helpers';

const status = async (page: Page, path: string) => (await page.goto(path))?.status();

test.describe('investor onboarding', () => {
  test('apply, approve, add, record, invite, accept: the investor sees their own figures', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    const owner = await signUp(page, 'Journey');
    const applicant = `Casey ${unique()}`;
    const { page: visitor } = await freshPage(browser, baseURL);
    await apply(visitor, owner.slug, applicant);

    await page.goto(`/w/${owner.slug}/admin`);
    await page.getByRole('button', { name: `Approve ${applicant}` }).click();
    await page.getByRole('button', { name: `Add ${applicant} as an investor` }).click();
    await expect(page).toHaveURL(/\/admin\/investors\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(applicant);

    await recordEntry(page, 'Commitment', '50,000');
    await page.getByRole('button', { name: 'Create invite link', exact: true }).click();
    const link = await page.getByLabel('Invitation link').inputValue();
    expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]{40,}$/);

    const investor = await acceptAsNewAccount(browser, baseURL, link, owner.slug);
    await expect(investor.getByTestId('commitment')).toHaveText('$50,000.00');
    await expect(investor.getByTestId('called')).toHaveText('$0.00');
    await expect(investor.getByTestId('uncalled')).toHaveText('$50,000.00');

    // The manager records more activity and the investor sees it.
    await recordEntry(page, 'Capital call', '12,500.50');
    await recordEntry(page, 'Distribution', '1,000');
    await investor.reload();
    await expect(investor.getByTestId('called')).toHaveText('$12,500.50');
    await expect(investor.getByTestId('uncalled')).toHaveText('$37,499.50');
    await expect(investor.getByTestId('distributed')).toHaveText('$1,000.00');
    await expect(investor.getByRole('row', { name: /Capital call/ })).toBeVisible();

    // The link works exactly once.
    const { page: replay } = await freshPage(browser, baseURL);
    await replay.goto(link);
    await expect(replay.getByRole('heading', { level: 1 })).toContainText('already been used');

    // The manager sees the investor as active, and every step in the audit trail.
    await page.goto(`/w/${owner.slug}/admin/investors`);
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await page.goto(`/w/${owner.slug}/admin`);
    const activity = page.locator('.activity-list');
    await expect(activity).toContainText('added an investor');
    await expect(activity).toContainText('recorded a commitment: $50,000.00');
    await expect(activity).toContainText('recorded a capital call: $12,500.50');
    await expect(activity).toContainText('accepted an invitation');
  });

  test('the ledger rejects bad amounts and over-calling', async ({ page }) => {
    const owner = await signUp(page, 'Rules');
    await addInvestor(page, owner.slug, 'Rules Investor');

    await page.fill('#ledger-amount', 'abc');
    await page.getByRole('button', { name: 'Record entry', exact: true }).click();
    await expect(formAlert(page)).toContainText('positive dollar amount');

    await recordEntry(page, 'Commitment', '1,000');
    await page.selectOption('#ledger-type', { label: 'Capital call' });
    await page.fill('#ledger-amount', '1,500');
    await page.getByRole('button', { name: 'Record entry', exact: true }).click();
    await expect(formAlert(page)).toContainText('cannot be larger than the investor’s uncalled commitment');

    await recordEntry(page, 'Capital call', '1,000'); // exactly the remainder is fine
    await expect(page.getByText('$1,000.00').first()).toBeVisible();
  });

  test('creating a new invite link replaces the old one', async ({ page, browser, baseURL }) => {
    const owner = await signUp(page, 'Reissue');
    await addInvestor(page, owner.slug, 'Reissue Investor');

    await page.getByRole('button', { name: 'Create invite link', exact: true }).click();
    const first = await page.getByLabel('Invitation link').inputValue();
    await page.getByRole('button', { name: 'Create a new invite link', exact: true }).click();
    await expect(page.getByLabel('Invitation link')).not.toHaveValue(first);
    const second = await page.getByLabel('Invitation link').inputValue();

    const { page: visitor } = await freshPage(browser, baseURL);
    await visitor.goto(first);
    await expect(visitor.getByRole('heading', { level: 1 })).toContainText('was replaced');
    await acceptAsNewAccount(browser, baseURL, second, owner.slug);
  });

  test('an existing account accepts by signing in as the invited email, and others are refused', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    const fundA = await signUp(page, 'Host');
    const { page: bPage } = await freshPage(browser, baseURL);
    const fundB = await signUp(bPage, 'Guest'); // already has an account (and a workspace)

    // Fund A adds Guest's email as an investor and invites them.
    await addInvestor(page, fundA.slug, 'Guest Person', fundB.email);
    await page.getByRole('button', { name: 'Create invite link', exact: true }).click();
    const link = await page.getByLabel('Invitation link').inputValue();

    // A different signed-in user (fund A's own manager) is told it is for someone else.
    await page.goto(link);
    await expect(page.getByRole('heading', { name: 'Signed in as someone else' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^accept invitation$/i })).toHaveCount(0);

    // A visitor with no session is sent to sign in, and comes back to accept.
    const { page: visitor } = await freshPage(browser, baseURL);
    await visitor.goto(link);
    await expect(visitor.getByRole('heading', { name: 'Sign in to accept' })).toBeVisible();
    await visitor.locator('main').getByRole('link', { name: 'Sign in' }).click();
    await visitor.fill('#login-email', fundB.email);
    await visitor.fill('#login-password', PASSWORD);
    await visitor.getByRole('button', { name: /^sign in$/i }).click();
    await expect(visitor).toHaveURL(/\/invite\//);
    await visitor.getByRole('button', { name: /^accept invitation$/i }).click();
    await expect(visitor).toHaveURL(new RegExp(`/w/${fundA.slug}/investor$`));

    // Guest now belongs to both workspaces, each with its own role.
    await visitor.goto('/workspaces');
    await expect(visitor.getByText(fundA.workspace)).toBeVisible();
    await expect(visitor.getByText(fundB.workspace)).toBeVisible();
  });
});

test.describe('direct action calls', () => {
  test('manager actions replayed by an investor or an anonymous client change nothing', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(150_000);
    const owner = await signUp(page, 'Replay');
    const investor = await onboardInvestor(page, browser, baseURL, owner.slug, 'Replay Investor', '10,000');
    const { context: anonymous } = await freshPage(browser, baseURL);
    const outsiders: Array<[string, BrowserContext]> = [
      ['investor', investor.page.context()],
      ['anonymous', anonymous],
    ];

    // 1. Recording a ledger entry. Capture the manager's real request, then replay it.
    await page.goto(`/w/${owner.slug}/admin/investors/${investor.investorId}`);
    const ledgerRequest = await captureAction(page, () => recordEntry(page, 'Distribution', '1,234'));
    const distributed = async () => {
      await investor.page.goto(`/w/${owner.slug}/investor`);
      return investor.page.getByTestId('distributed').textContent();
    };
    expect(await distributed()).toBe('$1,234.00');

    for (const [who, context] of outsiders) {
      await replayAction(context, ledgerRequest);
      expect(await distributed(), `ledger entry replayed by ${who}`).toBe('$1,234.00');
    }
    // Control: the same replay as the manager does apply, so the replay itself is well-formed.
    await replayAction(page.context(), ledgerRequest);
    expect(await distributed()).toBe('$2,468.00');

    // 2. Creating an invitation (which would also revoke the investor's existing link).
    const second = await addInvestor(page, owner.slug, 'Replay Two');
    const inviteRequest = await captureAction(page, () =>
      page.getByRole('button', { name: 'Create invite link', exact: true }).click(),
    );
    const link = await page.getByLabel('Invitation link').inputValue();
    expect(second.investorId).not.toBe(investor.investorId);

    const { page: visitor } = await freshPage(browser, baseURL);
    for (const [who, context] of outsiders) {
      await replayAction(context, inviteRequest);
      await visitor.goto(link);
      await expect(visitor.getByRole('heading', { level: 1 }), `invitation replayed by ${who}`).toContainText(
        "You're invited",
      );
    }
    // Control: replayed by the manager, it issues a new link and revokes the old one.
    await replayAction(page.context(), inviteRequest);
    await visitor.goto(link);
    await expect(visitor.getByRole('heading', { level: 1 })).toContainText('was replaced');
  });
});

test.describe('isolation with investors', () => {
  test('investors cannot see each other, other workspaces, or manager pages', async ({ page, browser, baseURL }) => {
    test.setTimeout(180_000);
    const { page: pageB } = await freshPage(browser, baseURL);
    const ownerA = await signUp(page, 'IsoA');
    const ownerB = await signUp(pageB, 'IsoB');

    const one = await onboardInvestor(page, browser, baseURL, ownerA.slug, 'Ines One', '100,000');
    const two = await onboardInvestor(page, browser, baseURL, ownerA.slug, 'Ivan Two', '250,000');
    const bee = await onboardInvestor(pageB, browser, baseURL, ownerB.slug, 'Bea Bee', '777,000');

    // Each investor sees their own commitment and nothing of anyone else's.
    await expect(one.page.getByTestId('commitment')).toHaveText('$100,000.00');
    await expect(two.page.getByTestId('commitment')).toHaveText('$250,000.00');
    await expect(bee.page.getByTestId('commitment')).toHaveText('$777,000.00');
    const forbidden: Array<[Page, string[]]> = [
      [one.page, ['Ivan Two', '250,000', 'Bea Bee', '777,000']],
      [two.page, ['Ines One', '100,000', 'Bea Bee', '777,000']],
      [bee.page, ['Ines One', 'Ivan Two', '100,000', '250,000']],
    ];
    for (const [investorPage, words] of forbidden) {
      for (const word of words) {
        await expect(investorPage.locator('body')).not.toContainText(word);
      }
    }

    // An investor cannot open manager pages, even in their own workspace.
    for (const path of [
      `/w/${ownerA.slug}/admin`,
      `/w/${ownerA.slug}/admin/investors`,
      `/w/${ownerA.slug}/admin/investors/${two.investorId}`,
    ]) {
      expect(await status(one.page, path), `investor opening ${path}`).toBe(404);
    }
    // ...nor any page of another workspace.
    for (const path of [`/w/${ownerB.slug}/investor`, `/w/${ownerB.slug}/admin`]) {
      expect(await status(one.page, path), `investor A opening ${path}`).toBe(404);
    }
    expect(await status(bee.page, `/w/${ownerA.slug}/investor`)).toBe(404);

    // Managers cannot open each other's workspaces or investors.
    expect(await status(page, `/w/${ownerB.slug}/admin/investors`)).toBe(404);
    expect(await status(page, `/w/${ownerA.slug}/admin/investors/${bee.investorId}`)).toBe(404);

    // Attack 1: manager A edits the investor id in the ledger form to B's investor.
    await page.goto(`/w/${ownerA.slug}/admin/investors/${one.investorId}`);
    await page.locator('form:has(#ledger-amount) input[name=investorId]').evaluate((el, id) => {
      (el as HTMLInputElement).value = id;
    }, bee.investorId);
    await page.fill('#ledger-amount', '1');
    await page.getByRole('button', { name: 'Record entry', exact: true }).click();
    await expect(formAlert(page)).toHaveText('That investor was not found.');

    // Attack 2: same, against the invite form of an investor who has not been invited yet.
    const pending = await addInvestor(page, ownerA.slug, 'Uninvited Person');
    expect(pending.investorId).not.toBe(bee.investorId);
    await page.locator('form:has(button:text-is("Create invite link")) input[name=investorId]').evaluate((el, id) => {
      (el as HTMLInputElement).value = id;
    }, bee.investorId);
    await page.getByRole('button', { name: 'Create invite link', exact: true }).click();
    // This panel's alert sits outside its <form>, so match it by text.
    await expect(page.getByText('That investor was not found.')).toBeVisible();

    // Attack 3: point the workspace field at B while holding A's session.
    await page.goto(`/w/${ownerA.slug}/admin/investors/${one.investorId}`);
    await page.locator('form:has(#ledger-amount) input[name=workspace]').evaluate((el, slug) => {
      (el as HTMLInputElement).value = slug;
    }, ownerB.slug);
    await page.locator('form:has(#ledger-amount) input[name=investorId]').evaluate((el, id) => {
      (el as HTMLInputElement).value = id;
    }, bee.investorId);
    await page.fill('#ledger-amount', '1');
    await page.getByRole('button', { name: 'Record entry', exact: true }).click();
    await expect(page.getByText(/couldn't find that page/i)).toBeVisible();

    // B's investor and B's audit trail were never touched by any of it.
    // (Navigate back explicitly: this page was last sent to a 404 above.)
    await bee.page.goto(`/w/${ownerB.slug}/investor`);
    await expect(bee.page.getByTestId('commitment')).toHaveText('$777,000.00');
    await expect(bee.page.getByTestId('called')).toHaveText('$0.00');
    await pageB.goto(`/w/${ownerB.slug}/admin`);
    const activityB = pageB.locator('.activity-list');
    await expect(activityB).not.toContainText(ownerA.name);
    await expect(activityB).not.toContainText('$1.00');
  });
});
