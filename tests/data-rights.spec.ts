import { readFile } from 'fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { PASSWORD, addInvestor, freshPage, onboardInvestor, signUp } from './helpers';

async function downloadJson(page: Page, buttonName: string) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: buttonName }).click(),
  ]);
  const text = await readFile(await download.path(), 'utf8');
  return { filename: download.suggestedFilename(), text, json: JSON.parse(text) };
}

test.describe('exporting data', () => {
  test('the owner downloads a complete, secret-free workspace export, and it is audited', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    const owner = await signUp(page, 'Export');
    const investor = await onboardInvestor(page, browser, baseURL, owner.slug, 'Exported Investor', '75,000');

    await page.goto(`/w/${owner.slug}/admin/settings`);
    const { filename, text, json } = await downloadJson(page, 'Download workspace export (JSON)');

    expect(filename).toMatch(new RegExp(`^${owner.slug}-export-\\d{4}-\\d{2}-\\d{2}\\.json$`));
    expect(json.format).toBe('lp-portal-export/v1');
    expect(json.workspace.slug).toBe(owner.slug);
    expect(json.investors.map((i: { name: string }) => i.name)).toEqual(['Exported Investor']);
    expect(json.ledger).toEqual([expect.objectContaining({ amountCents: 7_500_000, type: 'commitment' })]);
    expect(json.members.map((m: { role: string }) => m.role).sort()).toEqual(['investor', 'owner']);
    // Nothing secret, and no usable invitation link, ever.
    expect(text).not.toMatch(/passwordHash|tokenHash|scrypt\$/);
    expect(text).not.toContain(investor.link.split('/invite/')[1]);

    await page.goto(`/w/${owner.slug}/admin`);
    await expect(page.locator('.activity-list')).toContainText('downloaded a workspace export');
  });

  test('nobody but the owner can export a workspace', async ({ page, browser, baseURL }) => {
    test.setTimeout(120_000);
    const owner = await signUp(page, 'Guarded');
    const investor = await onboardInvestor(page, browser, baseURL, owner.slug, 'Guarded Investor', '10,000');
    const { page: otherOwnerPage } = await freshPage(browser, baseURL);
    await signUp(otherOwnerPage, 'Rival');
    const { context: anonymous } = await freshPage(browser, baseURL);

    const url = `/w/${owner.slug}/admin/export`;
    const callers = [
      ['the workspace’s own investor', investor.page.context()],
      ['another workspace’s owner', otherOwnerPage.context()],
      ['an anonymous visitor', anonymous],
    ] as const;
    for (const [who, context] of callers) {
      const response = await context.request.post(`${baseURL}${url}`, { maxRedirects: 0 });
      expect([307, 308, 404], `${who} must be refused (got ${response.status()})`).toContain(response.status());
      expect(response.headers()['content-disposition'], `${who} must not get a file`).toBeUndefined();
      expect(await response.text()).not.toContain('lp-portal-export');
    }

    // The link form is POST-only: a plain GET (what a cross-site link would send) is refused.
    const get = await page.context().request.get(`${baseURL}${url}`);
    expect(get.status()).toBe(405);

    // Control: the owner can.
    const owned = await page.context().request.post(`${baseURL}${url}`);
    expect(owned.status()).toBe(200);
    expect(owned.headers()['content-disposition']).toContain('attachment');
  });

  test('an investor’s own data export holds their records and nothing about other investors', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const owner = await signUp(page, 'Personal');
    const one = await onboardInvestor(page, browser, baseURL, owner.slug, 'Personal One', '111,000');
    const two = await onboardInvestor(page, browser, baseURL, owner.slug, 'Personal Two', '222,000');
    expect(two.email).not.toBe(one.email);

    await one.page.goto('/account');
    const { filename, text, json } = await downloadJson(one.page, 'Download my data (JSON)');
    expect(filename).toMatch(/^my-data-\d{4}-\d{2}-\d{2}\.json$/);
    expect(json.kind).toBe('account');
    expect(json.account.email).toBe(one.email);
    expect(json.workspaces[0].investorRecord.commitmentCents).toBe(11_100_000);
    for (const other of ['Personal Two', two.email, '22200000', owner.email]) {
      expect(text, `must not contain ${other}`).not.toContain(other);
    }
    expect(text).not.toMatch(/passwordHash|tokenHash|scrypt\$/);
  });
});

test.describe('deleting data', () => {
  test('an investor deletes their account; the manager keeps the records they entered', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const owner = await signUp(page, 'Leaver');
    const investor = await onboardInvestor(page, browser, baseURL, owner.slug, 'Leaving Investor', '33,000');

    await investor.page.goto('/account');
    // A wrong confirmation deletes nothing.
    await investor.page.fill('#delete-account-confirm', 'someone-else@example.com');
    await investor.page.getByRole('button', { name: /delete my account permanently/i }).click();
    await expect(investor.page.locator('form [role=alert]')).toContainText('Nothing was deleted');

    await investor.page.fill('#delete-account-confirm', investor.email);
    await investor.page.getByRole('button', { name: /delete my account permanently/i }).click();
    await expect(investor.page).toHaveURL(/\/$/);

    // Their login is gone...
    const { page: retry } = await freshPage(browser, baseURL);
    await retry.goto('/login');
    await retry.fill('#login-email', investor.email);
    await retry.fill('#login-password', PASSWORD);
    await retry.getByRole('button', { name: /^sign in$/i }).click();
    await expect(retry.locator('form [role=alert]')).toHaveText('Incorrect email or password.');

    // ...but the manager's record of them, and its ledger, remain.
    await page.goto(`/w/${owner.slug}/admin/investors`);
    await expect(page.getByRole('cell', { name: /^Leaving Investor/ })).toBeVisible();
    await expect(page.getByText('$33,000.00').first()).toBeVisible();
  });

  test('an owner must delete their workspace before their account, and both then work', async ({
    page,
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const owner = await signUp(page, 'Closer');
    const bystander = await onboardInvestor(page, browser, baseURL, owner.slug, 'Closed Investor', '9,000');

    // While they own a workspace, account deletion is not offered.
    await page.goto('/account');
    await expect(page.getByText(`You own ${owner.workspace}`)).toBeVisible();
    await expect(page.locator('#delete-account-confirm')).toHaveCount(0);

    // Deleting the workspace needs its exact name.
    await page.goto(`/w/${owner.slug}/admin/settings`);
    await page.fill('#delete-workspace-confirm', 'wrong name');
    await page.getByRole('button', { name: /delete this workspace permanently/i }).click();
    await expect(page.locator('form [role=alert]')).toContainText('Nothing was deleted');
    expect((await page.goto(`/w/${owner.slug}/admin`))?.status()).toBe(200);

    await page.goto(`/w/${owner.slug}/admin/settings`);
    await page.fill('#delete-workspace-confirm', owner.workspace);
    await page.getByRole('button', { name: /delete this workspace permanently/i }).click();
    await expect(page).toHaveURL(/\/workspaces$/);

    // Everything in it is gone: the public form, the manager pages and the investor's access.
    expect((await page.goto(`/w/${owner.slug}/apply`))?.status()).toBe(404);
    expect((await page.goto(`/w/${owner.slug}/admin`))?.status()).toBe(404);
    expect((await bystander.page.goto(`/w/${owner.slug}/investor`))?.status()).toBe(404);

    // The investor's own login survives (it is theirs), and the owner can now delete their account.
    await bystander.page.goto('/workspaces');
    await expect(bystander.page).toHaveURL(/\/workspaces$/);
    await page.goto('/account');
    await page.fill('#delete-account-confirm', owner.email);
    await page.getByRole('button', { name: /delete my account permanently/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('tampering with the delete form cannot delete someone else’s workspace', async ({ page, browser, baseURL }) => {
    test.setTimeout(120_000);
    const attacker = await signUp(page, 'Vandal');
    const { page: victimPage } = await freshPage(browser, baseURL);
    const victim = await signUp(victimPage, 'Victim');
    await addInvestor(victimPage, victim.slug, 'Victim Investor');

    // The attacker points the form at the victim's workspace and types its (public) name.
    await page.goto(`/w/${attacker.slug}/admin/settings`);
    await page.locator('input[name=workspace]').evaluate((el, slug) => {
      (el as HTMLInputElement).value = slug;
    }, victim.slug);
    await page.fill('#delete-workspace-confirm', victim.workspace);
    await page.getByRole('button', { name: /delete this workspace permanently/i }).click();
    await expect(page.getByText(/couldn't find that page/i)).toBeVisible();

    // Both workspaces are intact.
    expect((await victimPage.goto(`/w/${victim.slug}/admin/investors`))?.status()).toBe(200);
    await expect(victimPage.getByRole('cell', { name: /^Victim Investor/ })).toBeVisible();
    expect((await page.goto(`/w/${attacker.slug}/admin`))?.status()).toBe(200);
  });
});
