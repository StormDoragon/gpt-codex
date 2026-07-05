import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclosures',
};

const items = [
  'This website is a prototype and not a live investment offering.',
  'Real funding flows require legal review, documents, approval checks, and approved partners.',
  'Investments involve risk, including possible loss of principal. Returns are not guaranteed.',
  'The lock period, liquidity rules, fees, reporting, and eligibility must be defined before launch.',
];

export default function DisclosuresPage() {
  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">Risk and Compliance</p>
        <h1 className="page-title">Disclosure-first product design.</h1>
        <section className="stack" style={{ marginTop: 30 }}>
          {items.map((item) => (
            <article className="card" key={item}>
              <p style={{ margin: 0 }}>{item}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
