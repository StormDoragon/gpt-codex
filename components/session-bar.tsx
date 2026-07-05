import { logout } from '../app/login/actions';
import type { Role } from '../lib/auth';

export function SessionBar({ role }: { role: Role }) {
  return (
    <div className="session-bar">
      <span>
        <span className="badge">Signed in</span> Demo {role} session
      </span>
      <form action={logout}>
        <button type="submit" className="btn session-signout">
          Sign out
        </button>
      </form>
    </div>
  );
}
