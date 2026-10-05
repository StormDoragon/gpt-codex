import Link from 'next/link';
import { logout } from '../app/login/actions';
import type { SessionUser } from '../lib/accounts';
import type { MemberRole } from '../lib/db/schema';
import type { WorkspaceSummary } from '../lib/workspaces';

export function SessionBar({
  user,
  workspace,
  role,
}: {
  user: SessionUser;
  workspace: WorkspaceSummary;
  role: MemberRole;
}) {
  return (
    <div className="session-bar">
      <span>
        <span className="badge">{role}</span> {workspace.name} · {user.email}
      </span>
      <div className="session-actions">
        <Link href="/account">Account</Link>
        <form action={logout}>
          <button type="submit" className="btn session-signout">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
