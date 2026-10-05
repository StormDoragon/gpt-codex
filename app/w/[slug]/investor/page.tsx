import type { Metadata } from 'next';
import { AllocationChart } from '../../../../components/allocation-chart';
import { SessionBar } from '../../../../components/session-bar';
import { investorMetrics, performanceRows, sampleFund } from '../../../../lib/sample-data';
import { ALL_ROLES, requireMembership } from '../../../../lib/tenancy';

export const metadata: Metadata = { title: 'Investor portal' };

export default async function InvestorPortalPage({ params }: { params: { slug: string } }) {
  const { user, workspace, role } = await requireMembership(params.slug, ALL_ROLES, `/w/${params.slug}/investor`);

  return (
    <main className="section">
      <div className="container stack">
        <SessionBar user={user} workspace={workspace} role={role} />
        <div>
          <p className="eyebrow">{workspace.name} · investor view</p>
          <h1 className="page-title">Your commitments and reporting.</h1>
          <p className="notice">
            Preview: the figures below are <strong>sample data</strong> showing what investors will see.
            Publishing real reporting and documents is not available yet.
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
            <h2>Allocation ({sampleFund.name})</h2>
            <AllocationChart />
          </div>
          <div className="card">
            <h2>Documents</h2>
            <p>A secure document vault for subscription agreements, statements and tax documents is coming soon.</p>
          </div>
        </section>

        <section className="card">
          <h2>Performance snapshot</h2>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Result</th>
                  <th scope="col">Drawdown</th>
                  <th scope="col">Note</th>
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
          </div>
        </section>
      </div>
    </main>
  );
}
