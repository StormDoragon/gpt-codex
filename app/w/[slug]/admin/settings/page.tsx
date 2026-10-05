import type { Metadata } from 'next';
import { AdminTabs } from '../../../../../components/admin-tabs';
import { DeleteWorkspaceForm } from '../../../../../components/delete-workspace-form';
import { SessionBar } from '../../../../../components/session-bar';
import { OWNER_ROLES, requireMembership } from '../../../../../lib/tenancy';

export const metadata: Metadata = { title: 'Workspace settings' };

export default async function SettingsPage({ params }: { params: { slug: string } }) {
  const { user, workspace, role } = await requireMembership(params.slug, OWNER_ROLES, `/w/${params.slug}/admin/settings`);

  return (
    <main className="section">
      <div className="container stack">
        <SessionBar user={user} workspace={workspace} role={role} />
        <AdminTabs slug={workspace.slug} active="settings" role={role} />
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="page-title">Workspace settings.</h1>
          <p className="lede">Export your data, or delete this workspace. Only the owner can do either.</p>
        </div>

        <section className="card">
          <h2 style={{ fontSize: '1.4rem' }}>Export your data</h2>
          <p>
            Download everything in this workspace as a JSON file: members, applications, investors, the ledger,
            invitations (never the links themselves) and the audit log. It contains personal data about your
            investors, so store it securely. Passwords and session data are never included.
          </p>
          <form method="post" action={`/w/${workspace.slug}/admin/export`}>
            <button type="submit" className="btn primary">
              Download workspace export (JSON)
            </button>
          </form>
        </section>

        <section className="card danger-zone">
          <h2 style={{ fontSize: '1.4rem' }}>Delete this workspace</h2>
          <p>
            This permanently deletes the workspace and everything in it: applications, investors, the ledger,
            invitations and the audit log. It cannot be undone. Investors&apos; own accounts are not deleted, but
            they lose access to this workspace.
          </p>
          <p>Consider downloading an export first.</p>
          <DeleteWorkspaceForm workspaceSlug={workspace.slug} workspaceName={workspace.name} />
        </section>
      </div>
    </main>
  );
}
