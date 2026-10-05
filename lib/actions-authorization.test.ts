import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Server actions and route handlers can be invoked directly, bypassing every
// page-level check, so each one must authorize for itself. These are cheap
// structural guards against adding one and forgetting the check; behaviour is
// covered by the replay and isolation tests in tests/*.spec.ts.

const appDir = path.join(process.cwd(), 'app');

function filesNamed(dir: string, name: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return filesNamed(full, name);
    return entry === name ? [full] : [];
  });
}

const rel = (file: string) => path.relative(process.cwd(), file);
const count = (source: string, pattern: RegExp) => (source.match(pattern) ?? []).length;

// Intentionally public: the investor intake form anyone can submit, resolved to
// a workspace by its public slug. Everything else under /w must require a member.
const PUBLIC_ACTIONS = new Set([path.join('app', 'w', '[slug]', 'apply', 'actions.ts')]);

describe('workspace server actions authorize with requireMembership', () => {
  const files = filesNamed(path.join(appDir, 'w'), 'actions.ts');

  it('finds the workspace action files', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    if (PUBLIC_ACTIONS.has(rel(file))) continue;

    it(`${rel(file)}: every action authorizes with requireMembership`, () => {
      const source = readFileSync(file, 'utf8');
      const actions = count(source, /^export async function /gm);
      const checks = count(source, /await requireMembership\(/g);
      expect(actions).toBeGreaterThan(0);
      expect(checks, `${actions} exported actions but ${checks} requireMembership calls`).toBe(actions);
    });

    it(`${rel(file)}: investors are never allowed`, () => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/requireMembership\([^)]*ALL_ROLES/);
      expect(source).not.toMatch(/requireMembership\([^)]*\['investor'/);
    });
  }
});

describe('workspace route handlers', () => {
  const files = filesNamed(path.join(appDir, 'w'), 'route.ts');

  it('finds the export route', () => {
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  for (const file of files) {
    const source = readFileSync(file, 'utf8');

    it(`${rel(file)}: authorizes with requireMembership and is owner-only`, () => {
      expect(source).toMatch(/await requireMembership\(/);
      expect(source).toMatch(/requireMembership\([^)]*OWNER_ROLES/);
      expect(source).not.toMatch(/requireMembership\([^)]*ALL_ROLES|requireMembership\([^)]*MANAGER_ROLES/);
    });

    it(`${rel(file)}: only POST, so another site cannot trigger it`, () => {
      expect(source).toMatch(/export async function POST/);
      expect(source).not.toMatch(/export async function (GET|PUT|PATCH|DELETE)/);
    });
  }
});

describe('account actions and routes identify the user from the session only', () => {
  const actions = path.join(appDir, 'account', 'actions.ts');
  const routes = filesNamed(path.join(appDir, 'account'), 'route.ts');

  it('every account action reads the session user', () => {
    const source = readFileSync(actions, 'utf8');
    const exported = count(source, /^export async function /gm);
    expect(exported).toBeGreaterThan(0);
    expect(count(source, /await getSessionUser\(\)/g), 'getSessionUser calls vs exported actions').toBe(exported);
  });

  it('never takes the target account from form input', () => {
    const source = readFileSync(actions, 'utf8');
    expect(source).not.toMatch(/data\.get\(['"](userId|accountId|id|email)['"]\)/);
  });

  for (const route of routes) {
    it(`${rel(route)}: reads the session user, and is POST-only`, () => {
      const source = readFileSync(route, 'utf8');
      expect(source).toMatch(/await getSessionUser\(\)/);
      expect(source).toMatch(/export async function POST/);
      expect(source).not.toMatch(/export async function (GET|PUT|PATCH|DELETE)/);
    });
  }
});
