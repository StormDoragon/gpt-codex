'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { setApplicationStatus, type ApplicationStatus } from '../../lib/application-store';
import { getSessionRole } from '../../lib/auth';

export async function reviewApplication(data: FormData): Promise<void> {
  if (getSessionRole() !== 'admin') {
    redirect('/login?next=/admin');
  }

  const id = data.get('id');
  const decision = data.get('decision');
  if (typeof id !== 'string' || (decision !== 'approved' && decision !== 'rejected')) {
    return;
  }

  await setApplicationStatus(id, decision as ApplicationStatus);
  revalidatePath('/admin');
}
