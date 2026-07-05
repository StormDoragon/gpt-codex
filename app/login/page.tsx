import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '../../components/login-form';
import { getSessionRole, getDemoAccessCode, isDefaultAccessCode } from '../../lib/auth';

export const metadata: Metadata = {
  title: 'Portal Login',
};

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const role = getSessionRole();
  if (role) {
    redirect(role === 'admin' ? '/admin' : '/investor');
  }

  const next = firstParam(searchParams.next);
  const defaultRole = next.startsWith('/admin') ? 'admin' : 'investor';

  return (
    <main className="section">
      <div className="container split-grid">
        <section>
          <p className="eyebrow">Role-based access</p>
          <h1 className="page-title">Sign in to the demo portal.</h1>
          <p className="lede">
            The investor dashboard and admin console are gated. This is a demo login — no real accounts or
            credentials exist, and no live money can move.
          </p>
          {isDefaultAccessCode() ? (
            <p className="notice">
              Demo access code: <strong>{getDemoAccessCode()}</strong>. Set the <code>DEMO_ACCESS_CODE</code>{' '}
              environment variable to change it.
            </p>
          ) : (
            <p className="notice">Enter the configured demo access code to continue.</p>
          )}
        </section>
        <LoginForm next={next} defaultRole={defaultRole} />
      </div>
    </main>
  );
}
