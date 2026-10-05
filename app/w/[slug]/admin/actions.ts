'use server';

import { revalidatePath } from 'next/cache';
import { reviewApplication } from '../../../../lib/applications';
import { isUuid, readText } from '../../../../lib/form';
import { MANAGER_ROLES, requireMembership } from '../../../../lib/tenancy';

export async function reviewApplicationAction(data: FormData): Promise<void> {
  const slug = readText(data, 'workspace', 60);
  const applicationId = readText(data, 'id', 64);
  const decision = readText(data, 'decision', 20);

  // Authorization is re-checked on every action call. Page-level checks do not
  // protect a server action, which can be invoked directly.
  const { user, workspace } = await requireMembership(slug, MANAGER_ROLES, `/w/${slug}/admin`);

  if (!isUuid(applicationId) || (decision !== 'approved' && decision !== 'rejected')) return;

  await reviewApplication({
    workspaceId: workspace.id,
    applicationId,
    decision,
    actorUserId: user.id,
  });
  revalidatePath(`/w/${slug}/admin`);
}
