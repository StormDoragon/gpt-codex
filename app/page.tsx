import Link from 'next/link';
import { product } from '../lib/product';

const steps = [
  {
    title: 'Create your workspace',
    body: 'One workspace per fund or firm, with its own investor intake link, its own data, and its own team.',
    live: true,
  },
  {
    title: 'Share your intake link',
    body: 'Prospective investors apply through a form hosted for you. No more emailed spreadsheets or PDFs.',
    live: true,
  },
  {
    title: 'Review and approve',
    body: 'Work through a single queue. Every approval and rejection is logged with who decided and when.',
    live: true,
  },
  {
    title: 'Publish reporting and documents',
    body: 'Give each investor a private view of their commitment, statements and documents.',
    live: false,
  },
];

const controls = [
  {
    title: 'Tenant-isolated workspaces',
    body: 'Every record belongs to exactly one workspace. Automated tests check that one workspace cannot read or change another’s data.',
    live: true,
  },
  {
    title: 'Audit log',
    body: 'Application decisions are recorded with the person, the action and the time.',
    live: true,
  },
  {
    title: 'Hashed passwords, revocable sessions',
    body: 'Passwords are hashed with scrypt. Sessions live server-side as hashes and end when you sign out.',
    live: true,
  },
  {
    title: 'Two-factor authentication',
    body: 'Authenticator-app and passkey sign-in for managers and investors.',
    live: false,
  },
  {
    title: 'Document vault',
    body: 'Private storage with short-lived signed links for subscription documents and statements.',
    live: false,
  },
  {
    title: 'Data export and deletion',
    body: 'Self-serve export of everything in your workspace, and deletion on request.',
    live: false,
  },
];

function Availability({ live }: { live: boolean }) {
  return <span className={live ? 'badge' : 'badge warning'}>{live ? 'Available now' : 'Coming soon'}</span>;
}

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Pre-release · for emerging fund managers</p>
          <h1>
            Your investor portal,
            <br />
            without the spreadsheet.
          </h1>
          <p className="lede">
            Collect investor applications, review and approve them, and keep an audit trail, all from a branded
            workspace. {product.name} is software only: we never hold or move your investors&apos; money.
          </p>
          <div className="actions">
            <Link href="/signup" className="btn primary">
              Create a workspace
            </Link>
            <Link href="/login" className="btn">
              Sign in
            </Link>
          </div>
          <div className="meta-strip">
            <div className="card">
              <p>Built for</p>
              <strong>Syndicate leads, SPV sponsors, emerging managers</strong>
            </div>
            <div className="card">
              <p>Model</p>
              <strong>One isolated workspace per fund</strong>
            </div>
            <div className="card">
              <p>Money movement</p>
              <strong>None. Software only.</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <div className="section-head">
            <h2>How it works</h2>
            <p>The first three steps work today. Reporting and documents are next on the roadmap.</p>
          </div>
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {steps.map((step, index) => (
              <article className="card" key={step.title}>
                <span className="pool-percent">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <Availability live={step.live} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="section">
        <div className="container">
          <div className="section-head">
            <h2>Security you can check, not just read</h2>
            <p>What exists today and what does not, stated plainly.</p>
          </div>
          <div className="split-grid">
            {controls.map((control) => (
              <article className="card" key={control.title}>
                <Availability live={control.live} />
                <h3 style={{ marginTop: 14 }}>{control.title}</h3>
                <p style={{ marginBottom: 0 }}>{control.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="notice">
            <strong>What this is not.</strong> {product.disclaimer} Each manager is responsible for their own
            offering and compliance. Read the <Link href="/legal"><u>important notice</u></Link>, or{' '}
            <Link href="/signup"><u>create a workspace</u></Link> to try it.
          </div>
        </div>
      </section>
    </main>
  );
}
