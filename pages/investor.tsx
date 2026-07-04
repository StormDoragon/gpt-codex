import { Frame, ui } from "../components/frame";
import { investorMetrics, performanceRows, pools } from "../lib/platform-data";

export default function InvestorPortalPage() {
  return (
    <Frame>
      <main style={{ padding: "60px 0" }}>
        <div style={ui.wrap}>
          <p style={{ color: "#e2b75e", fontWeight: 800 }}>Investor Portal Preview</p>
          <h1 style={{ margin: "0 0 20px", fontSize: "clamp(2.5rem,6vw,5rem)", lineHeight: 1 }}>Secure capital tracking dashboard.</h1>
          <p style={{ ...ui.muted, fontSize: 18 }}>Demo view for allocation, lock-period tracking, requests, documents, and reporting. All values are sample data.</p>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, marginTop: 30 }}>
            {investorMetrics.map((metric) => (
              <article style={ui.card} key={metric.label}>
                <p style={ui.muted}>{metric.label}</p>
                <strong style={{ fontSize: 28 }}>{metric.value}</strong>
                <p style={ui.muted}>{metric.note}</p>
              </article>
            ))}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, marginTop: 28 }}>
            <div style={ui.card}>
              <h2>Pool Allocation</h2>
              {pools.map((pool) => <p key={pool.name}><strong>{pool.name}</strong>: {pool.allocation}%</p>)}
            </div>
            <div style={ui.card}>
              <h2>Request Status</h2>
              <p style={ui.muted}>Deposit request: Under compliance review</p>
              <p style={ui.muted}>Withdrawal request: Locked until Jan 1, 2029</p>
              <p style={ui.muted}>Documents: Risk disclosure pending signature</p>
            </div>
          </section>

          <section style={{ ...ui.card, marginTop: 28 }}>
            <h2>Performance Snapshot</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#a7b1c7" }}>
              <thead><tr><th align="left">Period</th><th align="left">Result</th><th align="left">Drawdown</th><th align="left">Note</th></tr></thead>
              <tbody>{performanceRows.map((row) => <tr key={row.period}><td>{row.period}</td><td>{row.result}</td><td>{row.drawdown}</td><td>{row.note}</td></tr>)}</tbody>
            </table>
          </section>
        </div>
      </main>
    </Frame>
  );
}
