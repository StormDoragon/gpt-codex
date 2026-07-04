import { Frame, ui } from "../components/frame";

const inputStyle = { width: "100%", padding: 13, borderRadius: 14, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.07)", color: "#fff" };

export default function ApplyPage() {
  return (
    <Frame>
      <main style={{ padding: "60px 0" }}>
        <div style={{ ...ui.wrap, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 28 }}>
          <section>
            <p style={{ color: "#e2b75e", fontWeight: 800 }}>Investor Access</p>
            <h1 style={{ margin: "0 0 20px", fontSize: "clamp(2.5rem,6vw,5rem)", lineHeight: 1 }}>Apply before funding instructions.</h1>
            <p style={{ ...ui.muted, fontSize: 18 }}>This prototype intentionally collects application information before showing any payment flow. The next real version should connect KYC, documents, and approved payment partners.</p>
            <p style={{ ...ui.muted, border: "1px solid rgba(226,183,94,.32)", borderRadius: 20, padding: 18 }}>Submitting this form does not create an account, accept an investment, or authorize a transfer. It is a front-end prototype for review.</p>
          </section>

          <form style={ui.card}>
            <div style={{ display: "grid", gap: 14 }}>
              <label>Full name<input style={inputStyle} name="name" placeholder="Your full name" /></label>
              <label>Email<input style={inputStyle} name="email" type="email" placeholder="you@example.com" /></label>
              <label>Phone<input style={inputStyle} name="phone" placeholder="Phone number" /></label>
              <label>Country<input style={inputStyle} name="country" placeholder="Country" /></label>
              <label>Desired investment amount<input style={inputStyle} name="amount" placeholder="$1,200 minimum" /></label>
              <label>Accredited investor status<select style={inputStyle} name="accredited"><option>Not sure</option><option>Yes</option><option>No</option></select></label>
              <label>Notes<textarea style={{ ...inputStyle, minHeight: 110 }} name="notes" placeholder="Tell us your investment timeline and questions." /></label>
              <label style={ui.muted}><input type="checkbox" /> I understand that investments involve risk, including possible loss of principal.</label>
              <button type="button" style={{ ...ui.btn, ...ui.primary, border: 0 }}>Submit Application Preview</button>
            </div>
          </form>
        </div>
      </main>
    </Frame>
  );
}
