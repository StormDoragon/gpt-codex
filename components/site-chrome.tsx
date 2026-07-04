import Link from "next/link";
import { platform } from "@/lib/platform-data";

export function SiteNav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">G</span>
          <span>{platform.name}</span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/#model">Model</Link>
          <Link href="/#security">Security</Link>
          <Link href="/investor">Investor Portal</Link>
          <Link href="/admin">Admin</Link>
          <Link href="/apply">Apply</Link>
          <Link href="/disclosures">Disclosures</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>2026 {platform.name}. Prototype for investor reporting flows.</p>
        <p>{platform.disclaimer}</p>
      </div>
    </footer>
  );
}
