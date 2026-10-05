import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '../../components/login-form';
import { devCodeHint, getSessionRole, isLoginConfigured, usesDevCodes } from '../../lib/auth';

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
  const configured = isLoginConfigured();
  const codes = devCodeHint();

  return (
    <main className="section">
      <div className="container split-grid">
        <section>
          <p className="eyebrow">Role-based access</p>
          <h1 className="page-title">Sign in to the demo portal.</h1>
          <p className="lede">
            The investor dashboard and admin console are gated. This is a demo login — no real accounts exist,
            and no live money can move.
          </p>
          {!configured ? (
            <p className="notice notice-error">
              Portal login is not configured on this deployment. Set <code>SESSION_SECRET</code>,{' '}
              <code>DEMO_INVESTOR_CODE</code> and <code>DEMO_ADMIN_CODE</code> to enable it.
            </p>
          ) : usesDevCodes() ? (
            <p className="notice">
              Development mode. Investor code: <strong>{codes.investor}</strong> · Admin code:{' '}
              <strong>{codes.admin}</strong>. These defaults are disabled in production builds.
            </p>
          ) : (
            <p className="notice">Enter the access code for the role you are signing in as.</p>
          )}
        </section>
        {configured ? <LoginForm next={next} defaultRole={defaultRole} /> : null}
      </div>
    </main>
  );
}
