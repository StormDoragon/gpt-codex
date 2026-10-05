'use server';

import { redirect } from 'next/navigation';
import { readText } from '../../../../../lib/form';
import { deleteWorkspace } from '../../../../../lib/deletion';
import { logSecurity, short } from '../../../../../lib/log';
import { getClientIp } from '../../../../../lib/request';
import { OWNER_ROLES, requireMembership } from '../../../../../lib/tenancy';
import { hashToken } from '../../../../../lib/tokens';

export type DeleteWorkspaceState = { error: string };

export async function deleteWorkspaceAction(_prev: DeleteWorkspaceState, data: FormData): Promise<DeleteWorkspaceState> {
  const slug = readText(data, 'workspace', 60);
  // Owner only, re-checked here because actions can be called directly.
  const { user, workspace } = await requireMembership(slug, OWNER_ROLES, `/w/${slug}/admin/settings`);

  if (readText(data, 'confirm', 200) !== workspace.name) {
    return { error: 'The name you typed does not match this workspace. Nothing was deleted.' };
  }

  await deleteWorkspace(workspace.id);
  logSecurity('workspace.deleted', { ip: await getClientIp(), workspace: workspace.slug, actor: short(hashToken(user.email)) });
  redirect('/workspaces');
}
