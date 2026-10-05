import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
import { recordAudit } from '../../../../../lib/audit';
import { getDb } from '../../../../../lib/db';
import { exportWorkspace } from '../../../../../lib/export';
import { logSecurity, short } from '../../../../../lib/log';
import { getClientIp } from '../../../../../lib/request';
import { OWNER_ROLES, requireMembership } from '../../../../../lib/tenancy';
import { hashToken } from '../../../../../lib/tokens';

// POST, not GET: a cross-site page cannot make a logged-in browser submit a
// cross-site POST with its SameSite=Lax session cookie, so this cannot be
// triggered from another site (and a download is not a side-effect-free GET).
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Owner only: the export contains personal data about every investor.
  const { user, workspace } = await requireMembership(slug, OWNER_ROLES, `/w/${slug}/admin/settings`);

  const data = await exportWorkspace(workspace.id);
  if (!data) notFound();

  await recordAudit(await getDb(), {
    workspaceId: workspace.id,
    actorUserId: user.id,
    action: 'workspace.exported',
    targetType: 'workspace',
    targetId: workspace.id,
  });
  logSecurity('workspace.exported', { ip: await getClientIp(), workspace: workspace.slug, actor: short(hashToken(user.email)) });

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${workspace.slug}-export-${day}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
