import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminTabs } from '../../../../components/admin-tabs';
import { SessionBar } from '../../../../components/session-bar';
import { countApplicationsByStatus, listApplications, listRecentActivity } from '../../../../lib/applications';
import { formatCents } from '../../../../lib/money';
import { MANAGER_ROLES, requireMembership } from '../../../../lib/tenancy';
import { reviewApplicationAction } from './actions';
import { addInvestorFromApplication } from './investors/actions';

export const metadata: Metadata = { title: 'Admin console' };

const statusBadge: Record<string, string> = {
  pending: 'badge warning',
  approved: 'badge',
  rejected: 'badge danger',
};

const actionLabel: Record<string, string> = {
  'application.approved': 'approved an application',
  'application.rejected': 'rejected an application',
  'investor.created': 'added an investor',
  'ledger.commitment': 'recorded a commitment',
  'ledger.capital_call': 'recorded a capital call',
  'ledger.distribution': 'recorded a distribution',
  'invitation.created': 'created an investor invitation',
  'invitation.accepted': 'accepted an invitation',
};

type ActivityMetadata = { applicant?: string; name?: string; amountCents?: number };

function describeDetail(metadata: unknown): string {
  const { applicant, name, amountCents } = (metadata ?? {}) as ActivityMetadata;
  if (applicant) return ` from ${applicant}`;
  if (typeof amountCents === 'number') return `: ${formatCents(amountCents)}`;
  if (name) return `: ${name}`;
  return '';
}

const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

export default async function AdminPage({ params }: { params: { slug: string } }) {
  const { user, workspace, role } = await requireMembership(params.slug, MANAGER_ROLES, `/w/${params.slug}/admin`);

  const [applications, totals, activity] = await Promise.all([
    listApplications(workspace.id),
    countApplicationsByStatus(workspace.id),
    listRecentActivity(workspace.id),
  ]);
  const intakePath = `/w/${workspace.slug}/apply`;

  return (
    <main className="section">
      <div className="container stack">
        <SessionBar user={user} workspace={workspace} role={role} />
        <AdminTabs slug={workspace.slug} active="applications" />
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="page-title">Review applications for {workspace.name}.</h1>
          <p className="lede">
            Every approval and rejection is recorded in the audit log with who made the decision and when.
          </p>
        </div>

        <section className="card">
          <h2 style={{ fontSize: '1.4rem' }}>Your investor intake link</h2>
          <p>
            Share this link with prospective investors. Their applications land in the queue below.
          </p>
          <p>
            <code>{intakePath}</code>{' '}
            <Link href={intakePath}>
              <u>Open the form</u>
            </Link>
          </p>
        </section>

        <section className="stat-grid" aria-label="Application totals">
          <article className="card">
            <p>Pending review</p>
            <strong style={{ fontSize: 34 }} data-testid="pending-count">
              {totals.pending}
            </strong>
          </article>
          <article className="card">
            <p>Approved</p>
            <strong style={{ fontSize: 34 }}>{totals.approved}</strong>
          </article>
          <article className="card">
            <p>Rejected</p>
            <strong style={{ fontSize: 34 }}>{totals.rejected}</strong>
          </article>
          <article className="card">
            <p>Total applications</p>
            <strong style={{ fontSize: 34 }}>{totals.pending + totals.approved + totals.rejected}</strong>
          </article>
        </section>

        <section className="card">
          <h2>Application queue</h2>
          {applications.length === 0 ? (
            <p>No applications yet. Share your intake link to get started.</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Applicant</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Accredited</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">Status</th>
                    <th scope="col">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td>
                        <strong>{application.name}</strong>
                        <br />
                        <span className="muted" style={{ fontSize: '.85rem' }}>
                          {application.email}
                          {application.country ? ` · ${application.country}` : ''}
                        </span>
                      </td>
                      <td>{application.amount || '—'}</td>
                      <td>{application.accredited}</td>
                      <td>{dateFormat.format(application.submittedAt)}</td>
                      <td>
                        <span className={statusBadge[application.status]}>{application.status}</span>
                      </td>
                      <td>
                        {application.status === 'pending' ? (
                          <div className="row-actions">
                            {(['approved', 'rejected'] as const).map((decision) => (
                              <form action={reviewApplicationAction} key={decision}>
                                <input type="hidden" name="workspace" value={workspace.slug} />
                                <input type="hidden" name="id" value={application.id} />
                                <input type="hidden" name="decision" value={decision} />
                                <button
                                  type="submit"
                                  className={`btn btn-sm${decision === 'rejected' ? ' btn-danger' : ''}`}
                                  aria-label={`${decision === 'approved' ? 'Approve' : 'Reject'} ${application.name}`}
                                >
                                  {decision === 'approved' ? 'Approve' : 'Reject'}
                                </button>
                              </form>
                            ))}
                          </div>
                        ) : application.status === 'approved' && application.investorId ? (
                          <Link className="btn btn-sm" href={`/w/${workspace.slug}/admin/investors/${application.investorId}`}>
                            View investor<span className="sr-only"> {application.name}</span>
                          </Link>
                        ) : application.status === 'approved' ? (
                          <form action={addInvestorFromApplication}>
                            <input type="hidden" name="workspace" value={workspace.slug} />
                            <input type="hidden" name="applicationId" value={application.id} />
                            <button type="submit" className="btn btn-sm" aria-label={`Add ${application.name} as an investor`}>
                              Add as investor
                            </button>
                          </form>
                        ) : (
                          <span className="muted">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Recent activity</h2>
          {activity.length === 0 ? (
            <p>Decisions you make will appear here.</p>
          ) : (
            <ul className="activity-list">
              {activity.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.actorName ?? 'A former member'}</strong> {actionLabel[entry.action] ?? entry.action}
                  {describeDetail(entry.metadata)} ·{' '}
                  <span className="muted">{timeFormat.format(entry.createdAt)} UTC</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
