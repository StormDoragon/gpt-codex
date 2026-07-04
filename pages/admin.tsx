import { Frame, ui } from "../components/frame";
import { adminQueues, performanceRows, pools } from "../lib/platform-data";

export default function AdminPage() {
  return (
    <Frame>
      <main style={{ padding: "60px 0" }}>
        <div style={ui.wrap}>
          <p style={{ color: "#e2b75e", fontWeight: 800 }}>Admin Console Preview</p>
          <h1 style={{ margin: "0 0 20px", fontSize: "clamp(2.5rem,6vw,5rem)", lineHeight: 1 }}>Review-first operations center.</h1>
          <p style={{ ...ui.muted, fontSize: 18 }}>Admin screens are designed around review queues, status controls, auditability, and controlled publishing of performance updates.</p>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18, marginTop: 30 }}>
            {adminQueues.map((queue) => (
              <article style={ui.card} key={queue.name}>
                <p style={ui.muted}>{queue.name}</p>
                <strong style={{ fontSize: 34 }}>{queue.count}</strong>
                <p style={{ color: "#e2b75e" }}>{queue.status}</p>
              </article>
            ))}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, marginTop: 28 }}>
            <div style={ui.card}>
              <h2>Admin Actions</h2>
              <p style={ui.muted}>Approve or reject investor applications.</p>
              <p style={ui.muted}>Approve deposit requests after document review.</p>
              <p style={ui.muted}>Block withdrawal requests during the lock period.</p>
              <p style={ui.muted}>Publish monthly reporting data with an audit trail.</p>
            </div>
            <div style={ui.card}>
              <h2>Current Allocation</h2>
              {pools.map((pool) => <p key={pool.name}><strong>{pool.name}</strong>: {pool.allocation}%</p>)}
            </div>
          </section>

          <section style={{ ...ui.card, marginTop: 28 }}>
            <h2>Performance Publishing Queue</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#a7b1c7" }}>
              <thead><tr><th align="left">Period</th><th align="left">Result</th><th align="left">Drawdown</th><th align="left">Status</th></tr></thead>
              <tbody>{performanceRows.map((row) => <tr key={row.period}><td>{row.period}</td><td>{row.result}</td><td>{row.drawdown}</td><td>Draft review</td></tr>)}</tbody>
            </table>
          </section>
        </div>
      </main>
    </Frame>
  );
}
