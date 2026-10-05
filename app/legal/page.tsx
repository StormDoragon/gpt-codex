import type { Metadata } from 'next';
import { product } from '../../lib/product';

export const metadata: Metadata = {
  title: 'Important notice',
};

const items = [
  `${product.name} is software provided to fund managers. It is not a broker-dealer, investment adviser, funding portal or bank.`,
  'We do not hold, transmit or take custody of funds, and nothing on this site is an offer to sell or a solicitation to buy securities.',
  'Each workspace is operated by its own manager, who alone is responsible for its offering, its communications with investors, and its regulatory compliance.',
  'This is pre-release software with no uptime guarantee. Figures shown in the investor dashboard preview are illustrative sample data.',
  'This notice is a draft pending review by counsel. Terms of service and a privacy policy have not been published yet.',
];

export default function LegalPage() {
  return (
    <main className="section">
      <div className="container">
        <p className="eyebrow">Legal</p>
        <h1 className="page-title">Important notice.</h1>
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
