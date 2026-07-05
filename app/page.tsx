import Link from 'next/link';
import { AllocationChart } from '../components/allocation-chart';
import { platform, pools, securityControls } from '../lib/platform-data';

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Long-term diversified investment platform</p>
          <h1>
            Private Capital.
            <br />
            Structured for the Long Term.
          </h1>
          <p className="lede">
            Premium investor portal for diversified long-term capital across public markets, real assets, and
            operating businesses. Built review-first: applications, disclosures, and admin approval before any
            funding flow.
          </p>
          <div className="actions">
            <Link href="/apply" className="btn primary">
              Apply for access
            </Link>
            <Link href="/investor" className="btn">
              Investor portal preview
            </Link>
            <Link href="/disclosures" className="btn">
              Read the disclosures
            </Link>
          </div>
          <div className="meta-strip">
            <div className="card">
              <p>Minimum investment</p>
              <strong>{platform.minimumInvestment}</strong>
            </div>
            <div className="card">
              <p>Lock period</p>
              <strong>{platform.lockPeriod}</strong>
            </div>
            <div className="card">
              <p>Status</p>
              <strong>Prototype — no live money movement</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="model" className="section">
        <div className="container">
          <div className="section-head">
            <h2>Four-Pool Allocation Model</h2>
            <p>Diversified across four pools with disciplined sizing, transparent reporting, and a long-term focus.</p>
          </div>
          <div className="grid-2">
            <div className="card">
              <AllocationChart />
            </div>
            <div className="stack">
              {pools.map((pool) => (
                <article className="card" key={pool.name}>
                  <span className="pool-percent" style={{ color: pool.color }}>
                    {pool.allocation}%
                  </span>
                  <h3>{pool.name}</h3>
                  <p>{pool.description}</p>
                  <p>
                    <strong>Key risks:</strong> {pool.risk}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="section">
        <div className="container">
          <div className="section-head">
            <h2>Security &amp; Governance Model</h2>
            <p>
              Controls the platform is designed around before any production integration goes live.
            </p>
          </div>
          <div className="split-grid">
            {securityControls.map((control) => (
              <div className="card" key={control}>
                <span className="badge">Control</span>
                <p style={{ marginTop: 14, marginBottom: 0 }}>{control}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="notice">
            Ready to look deeper? Review the <Link href="/disclosures"><u>risk disclosures</u></Link>, then{' '}
            <Link href="/apply"><u>apply for access</u></Link>. {platform.disclaimer}
          </div>
        </div>
      </section>
    </main>
  );
}
