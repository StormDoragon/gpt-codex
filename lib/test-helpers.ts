import { randomUUID } from 'crypto';
import { createAccountWithWorkspace } from './accounts';
import { addApplication, reviewApplication } from './applications';
import { createInvestor } from './investors';
import { acceptInvitation, createInvitation } from './invitations';
import { getWorkspaceBySlug } from './workspaces';

let counter = 0;

export const TEST_PASSWORD = 'correct horse battery staple';

/** Creates an owner + workspace with unique, collision-free names. */
export async function makeTenant(label: string) {
  counter += 1;
  const unique = `${randomUUID().slice(0, 8)}-${counter}`;
  const email = `${label}-${unique}@example.com`;
  const result = await createAccountWithWorkspace({
    name: `${label} owner`,
    workspaceName: `${label} Capital ${unique}`,
    email,
    password: TEST_PASSWORD,
  });
  if (!result.ok) throw new Error(`could not create tenant: ${result.error}`);
  const workspace = await getWorkspaceBySlug(result.workspaceSlug);
  return { userId: result.userId, slug: result.workspaceSlug, email, workspaceId: workspace!.id };
}

export type Tenant = Awaited<ReturnType<typeof makeTenant>>;

/** Adds an investor to the tenant's workspace with a unique email. */
export async function makeInvestor(tenant: Tenant, name = 'Test Investor') {
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}-${randomUUID().slice(0, 8)}@example.com`;
  const result = await createInvestor({
    workspaceId: tenant.workspaceId,
    actorUserId: tenant.userId,
    name,
    email,
  });
  if (!result.ok) throw new Error(`could not create investor: ${result.error}`);
  return { investorId: result.investorId, email, name };
}

/** Creates an investor, invites them, and accepts as a brand-new account. */
export async function makeActiveInvestor(tenant: Tenant, name = 'Active Investor') {
  const investor = await makeInvestor(tenant, name);
  const invite = await createInvitation({
    workspaceId: tenant.workspaceId,
    investorId: investor.investorId,
    actorUserId: tenant.userId,
  });
  if (!invite.ok) throw new Error(`could not invite: ${invite.error}`);
  const accepted = await acceptInvitation({
    token: invite.token,
    newAccount: { name, password: TEST_PASSWORD },
  });
  if (!accepted.ok) throw new Error(`could not accept: ${accepted.error}`);
  return { ...investor, userId: accepted.userId };
}

/** Submits and approves an application, returning its id. */
export async function makeApprovedApplication(tenant: Tenant, name: string) {
  const id = await addApplication(tenant.workspaceId, sampleApplication(name));
  await reviewApplication({
    workspaceId: tenant.workspaceId,
    applicationId: id,
    decision: 'approved',
    actorUserId: tenant.userId,
  });
  return id;
}

/** Walks a driver error's cause chain for its Postgres SQLSTATE code. */
export function sqlState(error: unknown): string | undefined {
  for (let current: unknown = error, depth = 0; current && depth < 4; depth += 1) {
    const candidate = current as { code?: string; cause?: unknown };
    if (typeof candidate.code === 'string') return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

export const sampleApplication = (name: string) => ({
  name,
  email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
  phone: '',
  country: 'Testland',
  amount: '$5,000',
  accredited: 'Yes',
  notes: '',
});
