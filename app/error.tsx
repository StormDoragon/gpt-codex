'use client';

import Link from 'next/link';

// Shown when something unexpected fails while rendering a page, such as the
// database being unreachable. In production Next.js strips the error message
// from what reaches the browser, leaving only an opaque `digest` that matches
// the full error in the server logs, so nothing internal can leak from here.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="page-title">We couldn&apos;t load this page.</h1>
        <p className="lede">
          This is a problem on our side, not yours. Please try again in a moment. If it keeps happening, tell your
          fund manager and quote the reference below.
        </p>
        {error.digest ? (
          <p className="muted">
            Reference: <code>{error.digest}</code>
          </p>
        ) : null}
        <div className="actions">
          <button type="button" className="btn primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
