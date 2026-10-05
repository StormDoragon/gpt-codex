import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApplyForm } from '../../../../components/apply-form';
import { product } from '../../../../lib/product';
import { getWorkspaceBySlug } from '../../../../lib/workspaces';

export const metadata: Metadata = { title: 'Investor application' };

export default async function ApplyPage({ params }: { params: { slug: string } }) {
  const workspace = await getWorkspaceBySlug(params.slug);
  if (!workspace) notFound();

  return (
    <main className="section">
      <div className="container split-grid">
        <section>
          <p className="eyebrow">{workspace.name}</p>
          <h1 className="page-title">Apply for investor access.</h1>
          <p className="lede">
            Tell {workspace.name} a little about yourself. They review every application and will follow up
            directly before any investment materials are shared.
          </p>
          <p className="notice">
            Submitting this form sends your details to {workspace.name} for review. It is not an offer of
            securities and it does not commit you to invest. This page is hosted by {product.name}, which
            provides software only and does not hold or move money.
          </p>
        </section>
        <ApplyForm workspaceSlug={workspace.slug} />
      </div>
    </main>
  );
}
