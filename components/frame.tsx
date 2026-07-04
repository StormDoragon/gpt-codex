import Link from "next/link";
import type { ReactNode } from "react";
import { platform } from "../lib/platform-data";

export const ui = {
  page: { minHeight: "100vh", background: "transparent", color: "#f6f8ff", fontFamily: "Inter, system-ui, sans-serif" },
  wrap: { width: "min(1180px, calc(100% - 32px))", margin: "0 auto" },
  card: { padding: 24, border: "1px solid rgba(255,255,255,.16)", borderRadius: 24, background: "rgba(255,255,255,.08)", boxShadow: "0 24px 80px rgba(0,0,0,.25)", backdropFilter: "blur(18px)" },
  muted: { color: "#a7b1c7", lineHeight: 1.7 },
  btn: { padding: "14px 18px", borderRadius: 999, background: "rgba(255,255,255,.08)", color: "#fff", textDecoration: "none", fontWeight: 800, border: "1px solid rgba(255,255,255,.16)" },
  primary: { background: "linear-gradient(135deg,#e2b75e,#63d5ff)", color: "#07101d", borderColor: "transparent" }
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#model", label: "Strategy" },
  { href: "/#security", label: "Security" },
  { href: "/investor", label: "Investor Portal" },
  { href: "/admin", label: "Admin" },
  { href: "/disclosures", label: "Disclosures" }
];

const footerGroups = [
  {
    title: "Platform",
    links: [
      { href: "/", label: "Public website" },
      { href: "/investor", label: "Investor dashboard" },
      { href: "/apply", label: "Application flow" }
    ]
  },
  {
    title: "Governance",
    links: [
      { href: "/admin", label: "Admin review" },
      { href: "/disclosures", label: "Risk disclosures" },
      { href: "/#security", label: "Security model" }
    ]
  }
];

export function ButtonLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return <Link href={href} style={{ ...ui.btn, ...(primary ? ui.primary : {}) }}>{children}</Link>;
}

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={ui.page}>
      <header className="site-header">
        <div className="header-topline">
          <div style={ui.wrap} className="header-topline-inner">
            <span>Private market prototype</span>
            <span>{platform.minimumInvestment} minimum · {platform.lockPeriod} lock period · Demo controls only</span>
          </div>
        </div>
        <div style={ui.wrap} className="nav-shell">
          <Link href="/" className="brand-lockup" aria-label={`${platform.name} home`}>
            <span className="brand-mark">G</span>
            <span>
              <strong>{platform.name}</strong>
              <small>Long-term capital operations</small>
            </span>
          </Link>
          <nav className="nav-menu" aria-label="Primary navigation">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
          <Link href="/apply" className="nav-cta">Apply</Link>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div style={ui.wrap} className="footer-grid">
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
              {group.links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
            </div>
          ))}
          <div className="footer-contact">
            <h3>Operating posture</h3>
            <p>Designed for gated investor access, administrator approval queues, disclosure visibility, and transparent sample reporting before production integrations.</p>
          </div>
        </div>
        <div style={ui.wrap} className="footer-bottom">
          <span>© 2026 {platform.name}. All rights reserved.</span>
          <span>Prototype environment · Not an offer · Not investment advice</span>
        </div>
      </footer>
    </div>
  );
}
