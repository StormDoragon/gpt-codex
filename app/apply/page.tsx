import type { Metadata } from 'next';
import { ApplyForm } from '../../components/apply-form';

export const metadata: Metadata = {
  title: 'Apply',
};

export default function ApplyPage() {
  return (
    <main className="section">
      <div className="container split-grid">
        <section>
          <p className="eyebrow">Investor Access</p>
          <h1 className="page-title">Apply before funding instructions.</h1>
          <p className="lede">
            This prototype intentionally collects application information before showing any payment flow. The
            next real version should connect KYC, documents, and approved payment partners.
          </p>
          <p className="notice">
            Submitting this form does not create an account, accept an investment, or authorize a transfer. It
            is a front-end prototype for review.
          </p>
        </section>
        <ApplyForm />
      </div>
    </main>
  );
}
