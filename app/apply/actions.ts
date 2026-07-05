'use server';

import { revalidatePath } from 'next/cache';
import { addApplication } from '../../lib/application-store';

export type ApplyState = {
  ok: boolean;
  message: string;
};

function field(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function submitApplication(_prev: ApplyState, data: FormData): Promise<ApplyState> {
  const name = field(data, 'name');
  const email = field(data, 'email');
  const riskAcknowledged = data.get('risk-acknowledged') === 'on';

  if (!name || !email) {
    return { ok: false, message: 'Please provide at least your name and email.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }
  if (!riskAcknowledged) {
    return { ok: false, message: 'Please acknowledge the investment risk to continue.' };
  }

  await addApplication({
    name,
    email,
    phone: field(data, 'phone'),
    country: field(data, 'country'),
    amount: field(data, 'amount'),
    accredited: field(data, 'accredited') || 'Not sure',
    notes: field(data, 'notes'),
  });

  revalidatePath('/admin');

  return {
    ok: true,
    message:
      'Application received and added to the admin review queue. This prototype does not create accounts, accept investments, or authorize transfers.',
  };
}
