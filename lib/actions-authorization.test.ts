import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Server actions can be invoked directly, bypassing every page-level check, so
// each one must authorize for itself. This is a cheap structural guard against
// adding an action and forgetting the check; behaviour is covered by the
// replay test in tests/investors.spec.ts.

const appDir = path.join(process.cwd(), 'app');

function actionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return actionFiles(full);
    return entry === 'actions.ts' ? [full] : [];
  });
}

// Intentionally public: the investor intake form anyone can submit, resolved to
// a workspace by its public slug. Everything else under /w must require a member.
const PUBLIC_ACTIONS = new Set([path.join('app', 'w', '[slug]', 'apply', 'actions.ts')]);

describe('server action authorization', () => {
  const files = actionFiles(path.join(appDir, 'w'));

  it('finds the workspace action files', () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  for (const file of files) {
    const relative = path.relative(process.cwd(), file);
    if (PUBLIC_ACTIONS.has(relative)) continue;

    it(`${relative}: every action authorizes with requireMembership`, () => {
      const source = readFileSync(file, 'utf8');
      const actions = (source.match(/^export async function /gm) ?? []).length;
      const checks = (source.match(/await requireMembership\(/g) ?? []).length;
      expect(actions).toBeGreaterThan(0);
      expect(checks, `${actions} exported actions but ${checks} requireMembership calls`).toBe(actions);
    });

    it(`${relative}: only manager roles are allowed`, () => {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/requireMembership\([^)]*ALL_ROLES/);
      expect(source).not.toMatch(/requireMembership\([^)]*\['investor'/);
    });
  }
});
