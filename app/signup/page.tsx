import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignupForm } from '../../components/signup-form';
import { getSessionUser } from '../../lib/auth/session';
import { signupCodeRequired } from '../../lib/signup-gate';

export const metadata: Metadata = { title: 'Create a workspace' };

export default async function SignupPage() {
  if (await getSessionUser()) {
    redirect('/workspaces');
  }

  return (
    <main className="section">
      <div className="container split-grid">
        <section>
          <p className="eyebrow">Pre-release · closed beta</p>
          <h1 className="page-title">Create your investor portal.</h1>
          <p className="lede">
            One workspace per fund. You get an investor intake link, a review queue, and an audit trail of every
            decision.
          </p>
          <p className="notice">
            This is pre-release software. Please do not upload sensitive investor documents yet; the document
            vault and two-factor authentication are still on the roadmap.
          </p>
        </section>
        <SignupForm codeRequired={signupCodeRequired()} />
      </div>
    </main>
  );
}
