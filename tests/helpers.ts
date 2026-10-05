import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export const PASSWORD = 'correct horse battery staple';

/** A random private-range address: the server reads it from X-Forwarded-For, so tests can be distinct "clients". */
export function randomIp(): string {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `10.${octet()}.${octet()}.${octet()}`;
}

let sequence = 0;
export const unique = () =>
  `${Date.now().toString(36)}${(sequence++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export type Account = { name: string; workspace: string; email: string; slug: string };

/** Creates an account + workspace through the real signup form. */
export async function signUp(page: Page, label: string, email?: string): Promise<Account> {
  const id = unique();
  const account = {
    name: `${label} Owner`,
    workspace: `${label} Capital ${id}`,
    email: email ?? `${label.toLowerCase()}-${id}@example.com`,
  };
  await page.goto('/signup');
  await page.fill('#signup-name', account.name);
  await page.fill('#signup-workspace', account.workspace);
  await page.fill('#signup-email', account.email);
  await page.fill('#signup-password', PASSWORD);
  await page.getByRole('button', { name: /create workspace/i }).click();
  await expect(page).toHaveURL(/\/w\/[^/]+\/admin$/);
  return { ...account, slug: new URL(page.url()).pathname.split('/')[2] };
}

/** Submits the public intake form for a workspace, as an anonymous visitor. */
export async function apply(page: Page, slug: string, name: string) {
  await page.goto(`/w/${slug}/apply`);
  await page.fill('#apply-name', name);
  await page.fill('#apply-email', `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`);
  await page.check('#apply-risk');
  await page.getByRole('button', { name: /submit application/i }).click();
  await expect(page.getByRole('status')).toContainText(/received your application/i);
}

/** A new browser context with its own cookies and (by default) its own client address. */
export async function freshPage(browser: Browser, baseURL: string | undefined, ip: string = randomIp()) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ip } });
  return { context, page: await context.newPage() };
}

export const formAlert = (page: Page) => page.locator('form [role=alert]');

/** Records a ledger entry from an investor's detail page and waits for confirmation. */
export async function recordEntry(page: Page, type: 'Commitment' | 'Capital call' | 'Distribution', amount: string) {
  await page.selectOption('#ledger-type', { label: type });
  await page.fill('#ledger-amount', amount);
  await page.getByRole('button', { name: 'Record entry', exact: true }).click();
  // The form clears itself only after a successful save, so an empty amount
  // means this entry finished (not a stale message from the previous one) and
  // the reset has already happened, so the next call cannot race with it.
  await expect(page.locator('#ledger-amount')).toHaveValue('');
  await expect(page.locator('form:has(#ledger-amount) [role=status]')).toContainText(`Recorded ${type.toLowerCase()}`);
}

/** Opens an invitation link in a fresh browser and accepts it as a new account. */
export async function acceptAsNewAccount(browser: Browser, baseURL: string | undefined, link: string, slug: string) {
  const { page } = await freshPage(browser, baseURL);
  await page.goto(link);
  await page.fill('#accept-password', PASSWORD);
  await page.getByRole('button', { name: /create account and accept/i }).click();
  await expect(page).toHaveURL(new RegExp(`/w/${slug}/investor$`));
  return page;
}

export type CapturedAction = { url: string; headers: Record<string, string>; body: Buffer | null };

/** Runs `trigger` (which submits a form) and captures the server-action request it sends. */
export async function captureAction(page: Page, trigger: () => Promise<void>): Promise<CapturedAction> {
  const pending = page.waitForRequest((request) => request.method() === 'POST' && 'next-action' in request.headers());
  await trigger();
  const request = await pending;
  return { url: request.url(), headers: await request.allHeaders(), body: request.postDataBuffer() };
}

/**
 * Re-sends a captured server-action request using another browser context's
 * cookies. This is what a malicious client could do without ever seeing the UI.
 */
export async function replayAction(context: BrowserContext, captured: CapturedAction) {
  const headers = { ...captured.headers };
  for (const name of ['cookie', 'host', 'content-length', 'connection']) delete headers[name];
  return context.request.fetch(captured.url, {
    method: 'POST',
    headers,
    data: captured.body ?? undefined,
    maxRedirects: 0,
  });
}

/** Adds an investor through the manager's form and lands on their detail page. */
export async function addInvestor(ownerPage: Page, slug: string, name: string, email?: string) {
  const address = email ?? `${name.toLowerCase().replace(/\s+/g, '.')}-${unique()}@example.com`;
  await ownerPage.goto(`/w/${slug}/admin/investors`);
  await ownerPage.fill('#investor-name', name);
  await ownerPage.fill('#investor-email', address);
  await ownerPage.getByRole('button', { name: 'Add investor', exact: true }).click();
  await expect(ownerPage).toHaveURL(/\/admin\/investors\/[0-9a-f-]{36}$/);
  return { email: address, investorId: new URL(ownerPage.url()).pathname.split('/').pop()! };
}

/**
 * Full manager-side onboarding through the UI: add an investor, record their
 * commitment, create an invite link, and have them accept in their own browser.
 */
export async function onboardInvestor(
  ownerPage: Page,
  browser: Browser,
  baseURL: string | undefined,
  slug: string,
  name: string,
  commitment: string,
) {
  const { email, investorId } = await addInvestor(ownerPage, slug, name);

  await recordEntry(ownerPage, 'Commitment', commitment);
  await ownerPage.getByRole('button', { name: 'Create invite link', exact: true }).click();
  const link = await ownerPage.getByLabel('Invitation link').inputValue();

  const page = await acceptAsNewAccount(browser, baseURL, link, slug);
  return { page, email, link, investorId };
}
