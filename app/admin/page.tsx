import type { Metadata } from 'next';
import { adminQueues, performanceRows, pools } from '../../lib/platform-data';

export const metadata: Metadata = {
  title: 'Admin Console',
};

export default function AdminPage() {
  return (
    <main className="section">
      <div className="container stack">
        <div>
          <p className="eyebrow">Admin Console Preview</p>
          <h1 className="page-title">Review-first operations center.</h1>
          <p className="lede">
            Admin screens are designed around review queues, status controls, auditability, and controlled
            publishing of performance updates.
          </p>
        </div>

        <section className="stat-grid">
          {adminQueues.map((queue) => (
            <article className="card" key={queue.name}>
              <p>{queue.name}</p>
              <strong style={{ fontSize: 34 }}>{queue.count}</strong>
              <p style={{ marginTop: 8, marginBottom: 0 }}>
                <span className="badge warning">{queue.status}</span>
              </p>
            </article>
          ))}
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
          <table className="table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Result</th>
                <th>Drawdown</th>
                <th>Status</th>
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
        </section>
      </div>
    </main>
  );
}
