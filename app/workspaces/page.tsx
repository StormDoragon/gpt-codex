import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '../../lib/auth/session';
import { landingPath, listMemberships } from '../../lib/workspaces';

export const metadata: Metadata = { title: 'Your workspaces' };

export default async function WorkspacesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/workspaces');

  const memberships = await listMemberships(user.id);
  if (memberships.length === 1) {
    redirect(landingPath(memberships[0].workspace.slug, memberships[0].role));
  }

  return (
    <main className="section">
      <div className="container stack">
        <div>
          <p className="eyebrow">Signed in as {user.email}</p>
          <h1 className="page-title">Your workspaces.</h1>
        </div>
        {memberships.length === 0 ? (
          <p className="notice">You are not a member of any workspace yet.</p>
        ) : (
          <div className="split-grid">
            {memberships.map(({ workspace, role }) => (
              <article className="card" key={workspace.id}>
                <span className="badge">{role}</span>
                <h2 style={{ fontSize: '1.5rem', marginTop: 14 }}>{workspace.name}</h2>
                <p>
                  <Link className="btn" href={landingPath(workspace.slug, role)}>
                    Open workspace
                  </Link>
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
