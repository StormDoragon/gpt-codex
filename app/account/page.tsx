import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DeleteAccountForm } from '../../components/delete-account-form';
import { getSessionUser } from '../../lib/auth/session';
import { listMemberships } from '../../lib/workspaces';

export const metadata: Metadata = { title: 'Your account' };

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/account');

  const memberships = await listMemberships(user.id);
  const owned = memberships.filter((membership) => membership.role === 'owner');

  return (
    <main className="section">
      <div className="container stack">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="page-title">Your account.</h1>
          <p className="lede">
            {user.name} · {user.email}
          </p>
        </div>

        <section className="card">
          <h2 style={{ fontSize: '1.4rem' }}>Your workspaces</h2>
          {memberships.length === 0 ? (
            <p>You are not a member of any workspace.</p>
          ) : (
            <ul className="activity-list">
              {memberships.map(({ workspace, role }) => (
                <li key={workspace.id}>
                  <span className="badge">{role}</span> {workspace.name}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 style={{ fontSize: '1.4rem' }}>Download your data</h2>
          <p>
            Get a copy of the data this platform holds about you as a JSON file: your account details and, for each
            fund you invest in, the records the fund manager has entered about you. Passwords and session data are
            never included.
          </p>
          <form method="post" action="/account/export">
            <button type="submit" className="btn primary">
              Download my data (JSON)
            </button>
          </form>
        </section>

        <section className="card danger-zone">
          <h2 style={{ fontSize: '1.4rem' }}>Delete your account</h2>
          <p>
            This permanently deletes your login and removes your access to every workspace. It cannot be undone.
          </p>
          <p>
            <strong>Records your fund manager keeps about you stay with them.</strong> They are the manager&apos;s
            records, so contact the manager directly to ask for those to be corrected or removed.
          </p>
          {owned.length > 0 ? (
            <div className="notice">
              <p style={{ marginTop: 0 }}>
                You own {owned.map((m) => m.workspace.name).join(', ')}. Delete{' '}
                {owned.length === 1 ? 'that workspace' : 'those workspaces'} first, from{' '}
                {owned.length === 1 ? 'its' : 'each'} settings page, so a workspace is never left without an owner.
              </p>
              <p style={{ marginBottom: 0 }}>
                {owned.map((m) => (
                  <span key={m.workspace.id}>
                    <Link href={`/w/${m.workspace.slug}/admin/settings`}>
                      <u>Settings for {m.workspace.name}</u>
                    </Link>{' '}
                  </span>
                ))}
              </p>
            </div>
          ) : (
            <DeleteAccountForm email={user.email} />
          )}
        </section>
      </div>
    </main>
  );
}
