import { Frame, ui } from "../components/frame";

const items = [
  "This website is a prototype and not a live investment offering.",
  "Real funding flows require legal review, documents, approval checks, and approved partners.",
  "Investments involve risk, including possible loss of principal. Returns are not guaranteed.",
  "The lock period, liquidity rules, fees, reporting, and eligibility must be defined before launch."
];

export default function DisclosuresPage() {
  return (
    <Frame>
      <main style={{ padding: "60px 0" }}>
        <div style={ui.wrap}>
          <p style={{ color: "#e2b75e", fontWeight: 800 }}>Risk and Compliance</p>
          <h1 style={{ margin: "0 0 20px", fontSize: "clamp(2.5rem,6vw,5rem)", lineHeight: 1 }}>Disclosure-first product design.</h1>
          <section style={{ display: "grid", gap: 18, marginTop: 30 }}>
            {items.map((item) => <article style={ui.card} key={item}><p style={ui.muted}>{item}</p></article>)}
          </section>
        </div>
      </main>
    </Frame>
  );
}
