import { randomUUID } from 'crypto';
import { createAccountWithWorkspace } from './accounts';

let counter = 0;

/** Creates an owner + workspace with unique, collision-free names. */
export async function makeTenant(label: string) {
  counter += 1;
  const unique = `${randomUUID().slice(0, 8)}-${counter}`;
  const email = `${label}-${unique}@example.com`;
  const result = await createAccountWithWorkspace({
    name: `${label} owner`,
    workspaceName: `${label} Capital ${unique}`,
    email,
    password: 'correct horse battery staple',
  });
  if (!result.ok) throw new Error(`could not create tenant: ${result.error}`);
  return { userId: result.userId, slug: result.workspaceSlug, email };
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
