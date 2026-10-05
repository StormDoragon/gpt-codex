import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminTabs } from '../../../../../../components/admin-tabs';
import { InvitePanel } from '../../../../../../components/invite-panel';
import { LedgerForm } from '../../../../../../components/ledger-form';
import { SessionBar } from '../../../../../../components/session-bar';
import { isUuid } from '../../../../../../lib/form';
import { ledgerTypeLabel, statusBadge } from '../../../../../../lib/investor-labels';
import { getInvestor, listLedger } from '../../../../../../lib/investors';
import { formatCents } from '../../../../../../lib/money';
import { MANAGER_ROLES, requireMembership } from '../../../../../../lib/tenancy';

export const metadata: Metadata = { title: 'Investor' };

export default async function InvestorDetailPage({ params }: { params: { slug: string; investorId: string } }) {
  const { user, workspace, role } = await requireMembership(
    params.slug,
    MANAGER_ROLES,
    `/w/${params.slug}/admin/investors/${params.investorId}`,
  );

  // Looked up inside this workspace only: another workspace's investor id is a 404.
  const investor = isUuid(params.investorId) ? await getInvestor(workspace.id, params.investorId) : null;
  if (!investor) notFound();

  const ledger = await listLedger(workspace.id, investor.id);
  const badge = statusBadge[investor.status];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="section">
      <div className="container stack">
        <SessionBar user={user} workspace={workspace} role={role} />
        <AdminTabs slug={workspace.slug} active="investors" role={role} />
        <div>
          <p className="eyebrow">
            <Link href={`/w/${workspace.slug}/admin/investors`}>
              <u>Investors</u>
            </Link>{' '}
            / {investor.name}
          </p>
          <h1 className="page-title">{investor.name}</h1>
          <p className="lede">
            {investor.email} · <span className={badge.className}>{badge.label}</span>
          </p>
        </div>

        <section className="stat-grid" aria-label="Investor totals">
          <article className="card">
            <p>Commitment</p>
            <strong style={{ fontSize: 28 }}>{formatCents(investor.commitmentCents)}</strong>
          </article>
          <article className="card">
            <p>Capital called</p>
            <strong style={{ fontSize: 28 }}>{formatCents(investor.calledCents)}</strong>
          </article>
          <article className="card">
            <p>Uncalled</p>
            <strong style={{ fontSize: 28 }}>{formatCents(investor.commitmentCents - investor.calledCents)}</strong>
          </article>
          <article className="card">
            <p>Distributions</p>
            <strong style={{ fontSize: 28 }}>{formatCents(investor.distributedCents)}</strong>
          </article>
        </section>

        <div className="split-grid">
          <InvitePanel workspaceSlug={workspace.slug} investorId={investor.id} status={investor.status} />
          <LedgerForm workspaceSlug={workspace.slug} investorId={investor.id} defaultDate={today} />
        </div>

        <section className="card">
          <h2>Ledger</h2>
          {ledger.length === 0 ? (
            <p>No entries yet. Record a commitment to get started.</p>
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
                  {ledger.map((entry) => (
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
      </div>
    </main>
  );
}
