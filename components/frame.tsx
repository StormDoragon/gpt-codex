import Link from "next/link";
import type { ReactNode } from "react";
import { platform } from "../lib/platform-data";

export const ui = {
  page: { minHeight: "100vh", background: "#070b14", color: "#f6f8ff", fontFamily: "Inter, system-ui, sans-serif" },
  wrap: { width: "min(1180px, calc(100% - 32px))", margin: "0 auto" },
  card: { padding: 24, border: "1px solid rgba(255,255,255,.16)", borderRadius: 24, background: "rgba(255,255,255,.08)" },
  muted: { color: "#a7b1c7", lineHeight: 1.7 },
  btn: { padding: "14px 18px", borderRadius: 999, background: "rgba(255,255,255,.08)", color: "#fff", textDecoration: "none", fontWeight: 800 },
  primary: { background: "linear-gradient(135deg,#e2b75e,#63d5ff)", color: "#07101d" }
};

export function ButtonLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return <Link href={href} style={{ ...ui.btn, ...(primary ? ui.primary : {}) }}>{children}</Link>;
}

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={ui.page}>
      <header style={{ borderBottom: "1px solid rgba(255,255,255,.16)", padding: "18px 0" }}>
        <div style={{ ...ui.wrap, display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
          <Link href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 900 }}>{platform.name}</Link>
          <nav style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#a7b1c7" }}>
            <Link href="/">Home</Link><Link href="/investor">Investor</Link><Link href="/admin">Admin</Link><Link href="/apply">Apply</Link><Link href="/disclosures">Disclosures</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.16)", padding: "36px 0", color: "#a7b1c7" }}>
        <div style={ui.wrap}>{platform.disclaimer}</div>
      </footer>
    </div>
  );
}
