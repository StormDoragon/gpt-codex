import { ButtonLink, Frame, ui } from "../components/frame";
import { platform, pools, securityControls } from "../lib/platform-data";

export default function HomePage() {
  return (
    <Frame>
      <main>
        <section style={{ padding: "72px 0" }}>
          <div style={{ ...ui.wrap, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 28, alignItems: "center" }}>
            <div>
              <p style={{ color: "#e2b75e", fontWeight: 800 }}>Regulation-aware fintech prototype</p>
              <h1 style={{ margin: "0 0 20px", fontSize: "clamp(3rem,8vw,6rem)", lineHeight: .92, letterSpacing: "-.08em" }}>{platform.tagline}</h1>
              <p style={{ ...ui.muted, fontSize: 19 }}>A premium investor website and portal concept for diversified long-term capital tracking across stocks, forex, real estate, and IT businesses.</p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
                <ButtonLink href="/apply" primary>Apply for Investor Access</ButtonLink>
                <ButtonLink href="/investor">View Portal Preview</ButtonLink>
              </div>
            </div>
            <div style={ui.card}>
              <span style={{ color: "#e2b75e", fontWeight: 800 }}>Prototype only</span>
              <h2 style={{ fontSize: "clamp(2rem,4vw,3.4rem)", lineHeight: 1, margin: "14px 0" }}>Investor portal before live money rails.</h2>
              <p style={ui.muted}>The first version focuses on onboarding, review, dashboard reporting, documents, and admin controls. No live custody, deposit, or withdrawal processing is enabled.</p>
              <p style={{ ...ui.muted, border: "1px solid rgba(226,183,94,.32)", borderRadius: 20, padding: 18 }}>{platform.disclaimer}</p>
            </div>
          </div>
        </section>

        <section style={{ padding: "56px 0" }}>
          <div style={ui.wrap}>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3.4rem)", margin: "0 0 24px" }}>Four-pool allocation model.</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 }}>
              {pools.map((pool) => (
                <article style={ui.card} key={pool.name}>
                  <strong style={{ color: "#63d5ff", fontSize: 28 }}>{pool.allocation}%</strong>
                  <h3>{pool.name}</h3>
                  <p style={ui.muted}>{pool.description}</p>
                  <p style={{ color: "#e2b75e" }}>{pool.risk}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "56px 0" }}>
          <div style={{ ...ui.wrap, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
            {securityControls.map((item) => <div style={ui.card} key={item}>{item}</div>)}
          </div>
        </section>
      </main>
    </Frame>
  );
}
