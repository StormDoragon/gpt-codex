import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">404</p>
        <h1 className="page-title">This page isn&apos;t part of the prototype.</h1>
        <p className="lede">The link may be outdated. Head back to a page that exists.</p>
        <div className="actions">
          <Link href="/" className="btn primary">
            Return home
          </Link>
          <Link href="/disclosures" className="btn">
            Read the disclosures
          </Link>
        </div>
      </div>
    </main>
  );
}
