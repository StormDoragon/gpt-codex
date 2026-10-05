import type { Metadata } from 'next';
import Link from 'next/link';
import { AddInvestorForm } from '../../../../../components/add-investor-form';
import { AdminTabs } from '../../../../../components/admin-tabs';
import { SessionBar } from '../../../../../components/session-bar';
import { statusBadge } from '../../../../../lib/investor-labels';
import { listInvestors } from '../../../../../lib/investors';
import { formatCents } from '../../../../../lib/money';
import { MANAGER_ROLES, requireMembership } from '../../../../../lib/tenancy';

export const metadata: Metadata = { title: 'Investors' };

const notices: Record<string, string> = {
  application_not_found: 'That application was not found.',
  application_not_approved: 'Only approved applications can be added as investors.',
  email_taken: 'An investor with that applicant’s email already exists in this workspace.',
  application_already_linked: 'That applicant is already an investor.',
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function InvestorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { user, workspace, role } = await requireMembership(slug, MANAGER_ROLES, `/w/${slug}/admin/investors`);
  const investors = await listInvestors(workspace.id);
  const rawNotice = (await searchParams).notice;
  const notice = notices[Array.isArray(rawNotice) ? (rawNotice[0] ?? '') : (rawNotice ?? '')];

  return (
    <main className="section">
      <div className="container stack">
        <SessionBar user={user} workspace={workspace} role={role} />
        <AdminTabs slug={workspace.slug} active="investors" role={role} />
        <div>
          <p className="eyebrow">Investors</p>
          <h1 className="page-title">Investors in {workspace.name}.</h1>
          <p className="lede">
            Record commitments, capital calls and distributions, and invite each investor to see their own figures.
          </p>
        </div>

        {notice ? (
          <p className="notice notice-error" role="alert">
            {notice}
          </p>
        ) : null}

        <section className="card">
          <h2>Investor register</h2>
          {investors.length === 0 ? (
            <p>No investors yet. Add one below, or approve an application and add the applicant from there.</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Investor</th>
                    <th scope="col">Access</th>
                    <th scope="col">Commitment</th>
                    <th scope="col">Called</th>
                    <th scope="col">Uncalled</th>
                    <th scope="col">Distributed</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {investors.map((investor) => {
                    const badge = statusBadge[investor.status];
                    return (
                      <tr key={investor.id}>
                        <td>
                          <strong>{investor.name}</strong>
                          <br />
                          <span className="muted" style={{ fontSize: '.85rem' }}>
                            {investor.email}
                          </span>
                        </td>
                        <td>
                          <span className={badge.className}>{badge.label}</span>
                        </td>
                        <td>{formatCents(investor.commitmentCents)}</td>
                        <td>{formatCents(investor.calledCents)}</td>
                        <td>{formatCents(investor.commitmentCents - investor.calledCents)}</td>
                        <td>{formatCents(investor.distributedCents)}</td>
                        <td>
                          <Link className="btn btn-sm" href={`/w/${workspace.slug}/admin/investors/${investor.id}`}>
                            Manage<span className="sr-only"> {investor.name}</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <AddInvestorForm workspaceSlug={workspace.slug} />
      </div>
    </main>
  );
}
