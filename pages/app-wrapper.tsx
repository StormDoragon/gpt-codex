import { Frame, ui } from "../components/frame";

export default function PlatformMapPage() {
  return (
    <Frame>
      <main style={{ padding: "70px 0" }}>
        <div style={ui.wrap}>
          <h1>Platform Map</h1>
          <p style={ui.muted}>Use the main navigation to review the public site, investor portal, admin console, application form, and disclosures.</p>
        </div>
      </main>
    </Frame>
  );
}
