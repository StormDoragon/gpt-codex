'use client';

// The last-resort boundary: it replaces the root layout, so it must bring its
// own <html> and <body> and cannot rely on the site's stylesheet.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#070b14',
          color: '#f6f8ff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <main style={{ maxWidth: 560, padding: 24 }}>
          <h1>Something went wrong.</h1>
          <p style={{ color: '#a7b1c7', lineHeight: 1.6 }}>
            We couldn&apos;t load this page. Please try again in a moment.
          </p>
          {error.digest ? <p style={{ color: '#a7b1c7' }}>Reference: {error.digest}</p> : null}
          <button
            type="button"
            onClick={reset}
            style={{ padding: '12px 20px', borderRadius: 999, border: 0, fontWeight: 800, cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
