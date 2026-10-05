import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { acceptAsNewAccount, addInvestor, apply, freshPage, recordEntry, signUp } from './helpers';

// WCAG 2.0, 2.1 and 2.2, levels A and AA.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

type Finding = { page: string; rule: string; impact: string | null | undefined; help: string; where: string[] };

async function audit(page: Page, name: string): Promise<Finding[]> {
  // Let fonts, hydration and the chart settle so we audit what users actually see.
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return violations.map((violation) => ({
    page: name,
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    where: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
  }));
}

const describeFindings = (findings: Finding[]) =>
  findings.map((f) => `[${f.impact}] ${f.page}: ${f.rule} (${f.help}) at ${f.where.join(' | ')}`);

test.describe('accessibility (WCAG 2.2 A/AA, axe-core)', () => {
  test('public pages have no violations', async ({ page, browser, baseURL }) => {
    test.setTimeout(120_000);
    const findings: Finding[] = [];

    for (const [name, path] of [
      ['home', '/'],
      ['legal', '/legal'],
      ['login', '/login'],
      ['signup', '/signup'],
      ['not found', '/does-not-exist'],
    ] as const) {
      await page.goto(path);
      findings.push(...(await audit(page, name)));
    }

    // States that only exist after interaction: validation errors.
    await page.goto('/login');
    await page.fill('#login-email', 'nobody@example.com');
    await page.fill('#login-password', 'not the password');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.locator('form [role=alert]')).toBeVisible();
    findings.push(...(await audit(page, 'login with error')));

    // The public intake form, empty and after a successful submission.
    const { page: owner } = await freshPage(browser, baseURL);
    const account = await signUp(owner, 'A11yPublic');
    const { page: visitor } = await freshPage(browser, baseURL);
    await visitor.goto(`/w/${account.slug}/apply`);
    findings.push(...(await audit(visitor, 'intake form')));
    await apply(visitor, account.slug, 'Accessible Applicant');
    findings.push(...(await audit(visitor, 'intake form submitted')));

    expect(describeFindings(findings)).toEqual([]);
  });

  test('signed-in pages have no violations', async ({ page, browser, baseURL }) => {
    test.setTimeout(180_000);
    const findings: Finding[] = [];
    const owner = await signUp(page, 'A11yApp');

    // Give the admin pages real content to audit.
    const { page: visitor } = await freshPage(browser, baseURL);
    await apply(visitor, owner.slug, 'Review Me');
    await page.goto(`/w/${owner.slug}/admin`);
    findings.push(...(await audit(page, 'admin: pending application')));
    await page.getByRole('button', { name: 'Approve Review Me' }).click();
    await expect(page.getByTestId('pending-count')).toHaveText('0');
    findings.push(...(await audit(page, 'admin: approved + activity')));

    await page.goto(`/w/${owner.slug}/admin/investors`);
    findings.push(...(await audit(page, 'investors: empty')));
    const investor = await addInvestor(page, owner.slug, 'Audit Investor');
    findings.push(...(await audit(page, 'investor detail: empty ledger')));
    await recordEntry(page, 'Commitment', '25,000');
    await recordEntry(page, 'Capital call', '5,000');
    await page.getByRole('button', { name: 'Create invite link', exact: true }).click();
    const link = await page.getByLabel('Invitation link').inputValue();
    findings.push(...(await audit(page, 'investor detail: ledger + invite link')));

    await page.goto(`/w/${owner.slug}/admin/investors`);
    findings.push(...(await audit(page, 'investors: register')));
    await page.goto(`/w/${owner.slug}/investor`);
    findings.push(...(await audit(page, 'manager preview (chart)')));

    // The invitation page as the invitee sees it, then their real dashboard.
    const { page: guest } = await freshPage(browser, baseURL);
    await guest.goto(link);
    findings.push(...(await audit(guest, 'invite page')));
    const investorPage = await acceptAsNewAccount(browser, baseURL, link, owner.slug);
    findings.push(...(await audit(investorPage, 'investor dashboard')));

    // Settings and account pages, including the destructive-action forms.
    await page.goto(`/w/${owner.slug}/admin/settings`);
    findings.push(...(await audit(page, 'workspace settings')));
    await page.goto('/account');
    findings.push(...(await audit(page, 'account (owner: deletion blocked)')));
    await investorPage.goto('/account');
    findings.push(...(await audit(investorPage, 'account (investor: delete form)')));

    expect(investor.investorId).toBeTruthy();
    expect(describeFindings(findings)).toEqual([]);
  });
});
