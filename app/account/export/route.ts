import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '../../../lib/auth/session';
import { exportAccount } from '../../../lib/export';
import { logSecurity, short } from '../../../lib/log';
import { getClientIp } from '../../../lib/request';
import { hashToken } from '../../../lib/tokens';

// POST for the same reason as the workspace export: not triggerable cross-site.
export async function POST() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/account');

  // The export is built from the session's own user id; nothing in the request selects whose data it is.
  const data = await exportAccount(user.id);
  if (!data) redirect('/login');

  logSecurity('account.exported', { ip: await getClientIp(), actor: short(hashToken(user.email)) });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="my-data-${day}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
