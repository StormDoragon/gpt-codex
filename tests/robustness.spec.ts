import { test, expect } from './fixtures';

// What visitors see when input is hostile or something genuinely breaks. Neither
// may expose internals (SQL, stack traces, connection strings, file paths).

const LEAK_MARKERS = [
  'Failed query',
  'drizzle',
  'select "',
  'ECONNREFUSED',
  'secret-password',
  '127.0.0.1:9',
  'postgres://',
  'node_modules',
  'at Object.',
  'at async',
  '.next/server',
];

const hostile = [
  ['NUL byte in a workspace slug', '/w/%00/apply'],
  ['NUL byte in a manager page slug', '/w/%00/admin'],
  ['a 5,000 character slug', `/w/${'a'.repeat(5000)}/apply`],
  ['an RTL-override unicode slug', '/w/%E2%80%AEevil/apply'],
  ['an SQL-looking slug', "/w/x'%20OR%20'1'='1/apply"],
  ['path traversal in a slug', '/w/..%2f..%2fetc%2fpasswd/apply'],
  ['NUL byte in an invitation token', '/invite/%00'],
  ['a 5,000 character invitation token', `/invite/${'t'.repeat(5000)}`],
  ['a non-uuid investor id', '/w/some-slug/admin/investors/not-a-uuid'],
  ['a NUL byte as an investor id', '/w/some-slug/admin/investors/%00'],
  ['NUL byte in the login redirect target', '/login?next=%00'],
  ['a 5,000 character login redirect target', `/login?next=/${'n'.repeat(5000)}`],
  ['an unknown nested route', '/w/some-slug/does/not/exist'],
] as const;

test.describe('hostile input', () => {
  for (const [label, path] of hostile) {
    test(`${label} never causes a server error or leaks internals`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), `${path.slice(0, 60)} returned ${response.status()}`).toBeLessThan(500);
      const body = await response.text();
      for (const marker of LEAK_MARKERS) expect(body, `leaked "${marker}"`).not.toContain(marker);
    });
  }
});

test.describe('when the database is unreachable', () => {
  // The second web server in playwright.config.ts points at a closed port.
  const broken = `http://localhost:${Number(process.env.PORT ?? 3000) + 1}`;

  test('visitors get a friendly page with a reference, and nothing internal', async ({ page }) => {
    const response = await page.goto(`${broken}/w/anything/apply`);
    expect(response?.status()).toBe(500);

    await expect(page.getByRole('heading', { name: /couldn't load this page/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText(/Reference:/)).toBeVisible();

    const html = await page.content();
    for (const marker of LEAK_MARKERS) expect(html, `leaked "${marker}"`).not.toContain(marker);
  });

  test('pages that need no database keep working', async ({ request }) => {
    for (const path of ['/', '/legal', '/login', '/signup']) {
      expect((await request.get(`${broken}${path}`)).status(), path).toBe(200);
    }
  });

  test('the error page is also free of CSP violations', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text())) violations.push(message.text());
    });
    await page.goto(`${broken}/w/anything/apply`);
    await expect(page.getByRole('heading', { name: /couldn't load this page/i })).toBeVisible();
    expect(violations).toEqual([]);
  });
});
