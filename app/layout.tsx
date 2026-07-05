import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { platform } from '../lib/platform-data';

export const metadata: Metadata = {
  title: {
    default: platform.name,
    template: `%s · ${platform.name}`,
  },
  description:
    'Prototype website and investor portal for a long-term diversified investment platform. Demo only — no live deposits or withdrawals.',
  robots: { index: false, follow: false },
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/#model', label: 'Strategy' },
  { href: '/#security', label: 'Security' },
  { href: '/investor', label: 'Investor Portal' },
  { href: '/admin', label: 'Admin' },
  { href: '/disclosures', label: 'Disclosures' },
];

const footerGroups = [
  {
    title: 'Platform',
    links: [
      { href: '/', label: 'Public website' },
      { href: '/investor', label: 'Investor dashboard' },
      { href: '/apply', label: 'Application flow' },
    ],
  },
  {
    title: 'Governance',
    links: [
      { href: '/admin', label: 'Admin review' },
      { href: '/disclosures', label: 'Risk disclosures' },
      { href: '/#security', label: 'Security model' },
    ],
  },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="header-topline">
            <div className="container header-topline-inner">
              <span>Private market prototype</span>
              <span>
                {platform.minimumInvestment} minimum · {platform.lockPeriod} lock period · Demo controls only
              </span>
            </div>
          </div>
          <div className="container nav-shell">
            <Link href="/" className="brand-lockup" aria-label={`${platform.name} home`}>
              <span className="brand-mark">G</span>
              <span>
                <strong>{platform.name}</strong>
                <small>Long-term capital operations</small>
              </span>
            </Link>
            <nav className="nav-menu" aria-label="Primary navigation">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <Link href="/apply" className="nav-cta">
              Apply
            </Link>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container footer-grid">
            <div className="footer-brand">
              <Link href="/" className="brand-lockup">
                <span className="brand-mark">G</span>
                <span>
                  <strong>{platform.name}</strong>
                  <small>Investor reporting prototype</small>
                </span>
              </Link>
              <p>{platform.disclaimer}</p>
              <div className="footer-badges">
                <span>Review-first onboarding</span>
                <span>No live money movement</span>
                <span>Audit-ready workflows</span>
              </div>
            </div>
            {footerGroups.map((group) => (
              <div className="footer-links" key={group.title}>
                <h3>{group.title}</h3>
                {group.links.map((link) => (
                  <Link href={link.href} key={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="footer-contact">
              <h3>Operating posture</h3>
              <p>
                Designed for gated investor access, administrator approval queues, disclosure visibility, and
                transparent sample reporting before production integrations.
              </p>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© {new Date().getFullYear()} {platform.name}. All rights reserved.</span>
            <span>Prototype environment · Not an offer · Not investment advice</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
