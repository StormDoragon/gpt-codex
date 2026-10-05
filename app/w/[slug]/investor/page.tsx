import type { Metadata } from 'next';
import Link from 'next/link';
import { AllocationChart } from '../../../../components/allocation-chart';
import { SessionBar } from '../../../../components/session-bar';
import { ledgerTypeLabel } from '../../../../lib/investor-labels';
import { getOwnPortfolio } from '../../../../lib/investors';
import { formatCents } from '../../../../lib/money';
import { investorMetrics, performanceRows, sampleFund } from '../../../../lib/sample-data';
import { ALL_ROLES, requireMembership } from '../../../../lib/tenancy';

export const metadata: Metadata = { title: 'Investor portal' };

export default async function InvestorPortalPage({ params }: { params: { slug: string } }) {
  const { user, workspace, role } = await requireMembership(params.slug, ALL_ROLES, `/w/${params.slug}/investor`);

  if (role !== 'investor') {
    return (
      <main className="section">
        <div className="container stack">
          <SessionBar user={user} workspace={workspace} role={role} />
          <div>
            <p className="eyebrow">{workspace.name} · investor view preview</p>
            <h1 className="page-title">What your investors will see.</h1>
            <p className="notice">
              This is a preview with <strong>sample data</strong>. Each investor sees only their own real figures,
              taken from the entries you record. Manage them under{' '}
              <Link href={`/w/${workspace.slug}/admin/investors`}>
                <u>Investors</u>
              </Link>
              .
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
            <h2>Performance snapshot (sample)</h2>
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

  // An investor sees their own record only: it is found through their login,
  // and there is no parameter that could select someone else's.
  const portfolio = await getOwnPortfolio(workspace.id, user.id);

  return (
    <main className="section">
      <div className="container stack">
        <SessionBar user={user} workspace={workspace} role={role} />
        <div>
          <p className="eyebrow">{workspace.name}</p>
          <h1 className="page-title">Your investment.</h1>
          <p className="lede">
            {portfolio ? `Hello, ${portfolio.investor.name}.` : 'Welcome.'} These are the figures {workspace.name} has
            recorded for you.
          </p>
        </div>

        {portfolio ? (
          <>
            <section className="stat-grid" aria-label="Your totals">
              <article className="card">
                <p>Total commitment</p>
                <strong style={{ fontSize: 28 }} data-testid="commitment">
                  {formatCents(portfolio.investor.commitmentCents)}
                </strong>
              </article>
              <article className="card">
                <p>Capital called</p>
                <strong style={{ fontSize: 28 }} data-testid="called">
                  {formatCents(portfolio.investor.calledCents)}
                </strong>
              </article>
              <article className="card">
                <p>Uncalled commitment</p>
                <strong style={{ fontSize: 28 }} data-testid="uncalled">
                  {formatCents(portfolio.investor.commitmentCents - portfolio.investor.calledCents)}
                </strong>
              </article>
              <article className="card">
                <p>Distributions to date</p>
                <strong style={{ fontSize: 28 }} data-testid="distributed">
                  {formatCents(portfolio.investor.distributedCents)}
                </strong>
              </article>
            </section>

            <section className="card">
              <h2>Activity</h2>
              {portfolio.ledger.length === 0 ? (
                <p>{workspace.name} has not recorded any activity for you yet.</p>
              ) : (
                <div className="table-scroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Type</th>
                        <th scope="col">Amount</th>
                        <th scope="col">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.ledger.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.effectiveDate}</td>
                          <td>{ledgerTypeLabel[entry.type]}</td>
                          <td>{formatCents(entry.amountCents)}</td>
                          <td>{entry.memo || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <p className="notice">No investor record is linked to your account in this workspace.</p>
        )}

        <p className="notice">
          These figures are entered by {workspace.name} and are not audited or verified by this platform. The platform
          is software only: it does not hold or move money, and capital calls and distributions are handled directly
          with {workspace.name}.
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          Documents and reports will appear here once {workspace.name} starts publishing them.
        </p>
      </div>
    </main>
  );
}
