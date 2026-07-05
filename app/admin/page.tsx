import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SessionBar } from '../../components/session-bar';
import { getSessionRole } from '../../lib/auth';
import { listApplications, countPendingApplications } from '../../lib/application-store';
import { adminQueues, performanceRows, pools } from '../../lib/platform-data';
import { reviewApplication } from './actions';

export const metadata: Metadata = {
  title: 'Admin Console',
};

const statusBadge: Record<string, string> = {
  pending: 'badge warning',
  approved: 'badge',
  rejected: 'badge danger',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function AdminPage() {
  const role = getSessionRole();
  if (role !== 'admin') {
    redirect('/login?next=/admin');
  }

  const applications = await listApplications();
  const pendingCount = await countPendingApplications();

  const queues = adminQueues.map((queue) =>
    queue.name === 'Investor applications' ? { ...queue, count: pendingCount } : queue,
  );

  return (
    <main className="section">
      <div className="container stack">
        <SessionBar role={role} />
        <div>
          <p className="eyebrow">Admin Console Preview</p>
          <h1 className="page-title">Review-first operations center.</h1>
          <p className="lede">
            Admin screens are designed around review queues, status controls, auditability, and controlled
            publishing of performance updates.
          </p>
        </div>

        <section className="stat-grid">
          {queues.map((queue) => (
            <article className="card" key={queue.name}>
              <p>{queue.name}</p>
              <strong style={{ fontSize: 34 }}>{queue.count}</strong>
              <p style={{ marginTop: 8, marginBottom: 0 }}>
                <span className="badge warning">{queue.status}</span>
              </p>
            </article>
          ))}
        </section>

        <section className="card">
          <h2>Investor Application Queue</h2>
          <p style={{ marginTop: -6 }}>
            Live queue backed by submitted applications. Approving or rejecting updates the pending count above.
          </p>
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
                    <td>{formatDate(application.submittedAt)}</td>
                    <td>
                      <span className={statusBadge[application.status]}>{application.status}</span>
                    </td>
                    <td>
                      {application.status === 'pending' ? (
                        <div className="row-actions">
                          <form action={reviewApplication}>
                            <input type="hidden" name="id" value={application.id} />
                            <input type="hidden" name="decision" value="approved" />
                            <button type="submit" className="btn btn-sm">
                              Approve
                            </button>
                          </form>
                          <form action={reviewApplication}>
                            <input type="hidden" name="id" value={application.id} />
                            <input type="hidden" name="decision" value="rejected" />
                            <button type="submit" className="btn btn-sm btn-danger">
                              Reject
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="muted">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="split-grid">
          <div className="card">
            <h2>Admin Actions</h2>
            <p>Approve or reject investor applications.</p>
            <p>Approve deposit requests after document review.</p>
            <p>Block withdrawal requests during the lock period.</p>
            <p>Publish monthly reporting data with an audit trail.</p>
          </div>
          <div className="card">
            <h2>Current Allocation</h2>
            {pools.map((pool) => (
              <p key={pool.name}>
                <strong>{pool.name}</strong>: {pool.allocation}%
              </p>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Performance Publishing Queue</h2>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Result</th>
                  <th scope="col">Drawdown</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {performanceRows.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{row.result}</td>
                    <td>{row.drawdown}</td>
                    <td>Draft review</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
