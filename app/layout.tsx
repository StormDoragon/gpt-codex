import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { product } from '../lib/product';

export const metadata: Metadata = {
  title: {
    default: `${product.name}: ${product.tagline}`,
    template: `%s · ${product.name}`,
  },
  description:
    'Pre-release software for emerging fund managers: investor intake, review queues and an audit trail in one branded workspace. Software only; it never holds or moves money.',
  robots: { index: false, follow: false },
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/#how', label: 'How it works' },
  { href: '/#security', label: 'Security' },
  { href: '/legal', label: 'Legal' },
];

const footerGroups = [
  {
    title: 'Product',
    links: [
      { href: '/#how', label: 'How it works' },
      { href: '/#security', label: 'Security' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/signup', label: 'Create a workspace' },
      { href: '/legal', label: 'Important notice' },
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
              <span>Pre-release · closed beta</span>
              <span>Software only · we never hold or move your investors&apos; money</span>
            </div>
          </div>
          <div className="container nav-shell">
            <Link href="/" className="brand-lockup" aria-label={`${product.name} home`}>
              <span className="brand-mark">{product.name.charAt(0)}</span>
              <span>
                <strong>{product.name}</strong>
                <small>Investor portals for emerging managers</small>
              </span>
            </Link>
            <nav className="nav-menu" aria-label="Primary navigation">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <Link href="/login">Sign in</Link>
            </nav>
            <Link href="/signup" className="nav-cta">
              Create workspace
            </Link>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container footer-grid">
            <div className="footer-brand">
              <Link href="/" className="brand-lockup">
                <span className="brand-mark">{product.name.charAt(0)}</span>
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.tagline}</small>
                </span>
              </Link>
              <p>{product.disclaimer}</p>
              <div className="footer-badges">
                <span>Software only</span>
                <span>Tenant-isolated workspaces</span>
                <span>Audit-logged reviews</span>
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
              <h3>Status</h3>
              <p>
                Pre-release software in closed beta. Features marked &ldquo;coming soon&rdquo; are not available
                yet.
              </p>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>
              © {new Date().getFullYear()} {product.name}. All rights reserved.
            </span>
            <span>Not an offer · Not investment advice</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
