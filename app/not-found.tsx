import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">404</p>
        <h1 className="page-title">We couldn&apos;t find that page.</h1>
        <p className="lede">
          The link may be outdated, or you may not have access to it. Head back to a page that exists.
        </p>
        <div className="actions">
          <Link href="/" className="btn primary">
            Return home
          </Link>
          <Link href="/workspaces" className="btn">
            Your workspaces
          </Link>
        </div>
      </div>
    </main>
  );
}
