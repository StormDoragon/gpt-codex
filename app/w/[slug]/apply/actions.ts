'use server';

import { revalidatePath } from 'next/cache';
import { addApplication } from '../../../../lib/applications';
import { isValidEmail, readText } from '../../../../lib/form';
import { getWorkspaceBySlug } from '../../../../lib/workspaces';

export type ApplyState = { ok: boolean; message: string };

const ACCREDITED_OPTIONS = ['Not sure', 'Yes', 'No'];

export async function submitApplication(_prev: ApplyState, data: FormData): Promise<ApplyState> {
  // The workspace is resolved from the public slug on the server; the client
  // never supplies a workspace id.
  const workspace = await getWorkspaceBySlug(readText(data, 'workspace', 60));
  if (!workspace) {
    return { ok: false, message: 'This intake form is no longer available.' };
  }

  // Honeypot: real people never see or fill this field. Pretend it worked.
  if (readText(data, 'website', 200)) {
    return { ok: true, message: `Thanks. ${workspace.name} will review your application.` };
  }

  const name = readText(data, 'name', 120);
  const email = readText(data, 'email', 254);
  if (!name || !email) {
    return { ok: false, message: 'Please provide at least your name and email.' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  if (data.get('risk-acknowledged') !== 'on') {
    return { ok: false, message: 'Please acknowledge the investment risk to continue.' };
  }

  const accredited = readText(data, 'accredited', 20);
  await addApplication(workspace.id, {
    name,
    email,
    phone: readText(data, 'phone', 40),
    country: readText(data, 'country', 80),
    amount: readText(data, 'amount', 40),
    accredited: ACCREDITED_OPTIONS.includes(accredited) ? accredited : 'Not sure',
    notes: readText(data, 'notes', 2000),
  });

  revalidatePath(`/w/${workspace.slug}/admin`);
  return {
    ok: true,
    message: `Thanks. ${workspace.name} has received your application and will be in touch. Submitting this form is not an investment.`,
  };
}
