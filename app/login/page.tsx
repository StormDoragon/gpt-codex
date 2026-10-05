import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '../../components/login-form';
import { getSessionUser } from '../../lib/auth/session';
import { safeNextPath } from '../../lib/form';

export const metadata: Metadata = { title: 'Sign in' };

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = searchParams.next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);

  if (await getSessionUser()) {
    redirect(next || '/workspaces');
  }

  return (
    <main className="section">
      <div className="container split-grid">
        <section>
          <p className="eyebrow">Welcome back</p>
          <h1 className="page-title">Sign in to your workspace.</h1>
          <p className="lede">
            Manage investor applications and reporting for your fund, or see what your fund manager has shared
            with you.
          </p>
        </section>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
