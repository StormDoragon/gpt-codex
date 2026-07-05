import type { Metadata } from 'next';
import { investorMetrics, performanceRows, pools } from '../../lib/platform-data';

export const metadata: Metadata = {
  title: 'Investor Portal',
};

export default function InvestorPortalPage() {
  return (
    <main className="section">
      <div className="container stack">
        <div>
          <p className="eyebrow">Investor Portal Preview</p>
          <h1 className="page-title">Secure capital tracking dashboard.</h1>
          <p className="lede">
            Demo view for allocation, lock-period tracking, requests, documents, and reporting. All values are
            sample data.
          </p>
        </div>

        <section className="stat-grid">
          {investorMetrics.map((metric) => (
            <article className="card" key={metric.label}>
              <p>{metric.label}</p>
              <strong style={{ fontSize: 28 }}>{metric.value}</strong>
              <p style={{ marginTop: 8, marginBottom: 0 }}>{metric.note}</p>
            </article>
          ))}
        </section>

        <section className="split-grid">
          <div className="card">
            <h2>Pool Allocation</h2>
            {pools.map((pool) => (
              <p key={pool.name}>
                <strong>{pool.name}</strong>: {pool.allocation}%
              </p>
            ))}
          </div>
          <div className="card">
            <h2>Request Status</h2>
            <p>Deposit request: Under compliance review</p>
            <p>Withdrawal request: Locked until Jan 1, 2029</p>
            <p>Documents: Risk disclosure pending signature</p>
          </div>
        </section>

        <section className="card">
          <h2>Performance Snapshot</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Result</th>
                <th>Drawdown</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {performanceRows.map((row) => (
                <tr key={row.period}>
                  <td>{row.period}</td>
                  <td>{row.result}</td>
                  <td>{row.drawdown}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
