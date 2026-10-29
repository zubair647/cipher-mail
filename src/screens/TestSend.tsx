import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Masthead, StepFoot, Note } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { useAuth } from "../state/AuthContext";
import { mergeText } from "../lib/merge";
import { buildFinalHtml } from "../lib/email";
import { sendMail } from "../graph/sendMail";

const CHECKS = [
  "Variables filled in with the right values",
  "Links and buttons click through correctly",
  "Images and the logo display",
  "Formatting looks right on mobile and desktop",
];

export function TestSend() {
  const nav = useNavigate();
  const { account } = useAuth();
  const { draft, markTestSent } = useCampaign();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const row = draft.csv?.rows[0] ?? {};
  const mailbox = account?.email ?? "";

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const subject = "[TEST] " + mergeText(draft.subject, row, draft.mapping, false).text;
      const body = mergeText(draft.bodyHtml, row, draft.mapping, true).text;
      const res = await sendMail({ to: mailbox, subject, html: buildFinalHtml(body, mailbox, draft.isHtmlMode) });
      if (res.ok) markTestSent();
      else setError("error" in res ? res.error : "Test send failed. Please try again.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sent = !!draft.testSentAt;

  return (
    <Shell>
      <div className="page">
        <Masthead label="FR#8" title="Send yourself a test" sub="Required before the first real send. Proves the merge, formatting, links and images render in a real inbox." />

        <div className="wizard even">
          <div className="panel" style={{ textAlign: "center", padding: "44px 34px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 60, height: 60, borderRadius: 17, background: "var(--accent-tint)", color: "var(--accent-600)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>
            </span>
            <p style={{ fontSize: 15, color: "var(--gray)", margin: "0 0 24px", lineHeight: 1.55, maxWidth: 320 }}>
              A test copy goes to <b style={{ color: "var(--ink)" }}>{mailbox}</b> using recipient #1's merged values.
            </p>
            <button className="btn btn-pri btn-lg" onClick={send} disabled={busy}>
              {busy ? "Sending…" : sent ? "Send another test" : "Send test to myself"}
            </button>
            {error && <div style={{ marginTop: 22, textAlign: "left", width: "100%" }}><Note kind="err">{error}</Note></div>}
            {sent && <div style={{ marginTop: 22, textAlign: "left", width: "100%" }}><Note kind="ok"><b>Test sent {relativeMin(draft.testSentAt!)}.</b> Check it looks right in your inbox.</Note></div>}
          </div>

          <div className="ctx">
            <div className="cx">
              <span className="lbl">Check in your inbox</span>
              {CHECKS.map((c) => (
                <div key={c} className="ck">
                  <span className="b"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg></span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <StepFoot onBack={() => nav("/campaign/preview")}>
          {!sent && <span style={{ fontSize: 12.5, color: "var(--faint)", marginRight: 4 }}>The real send stays locked until a test passes.</span>}
          <button className="btn btn-pri" disabled={!sent} onClick={() => nav("/campaign/confirm")}>Continue to confirm</button>
        </StepFoot>
      </div>
    </Shell>
  );
}

function relativeMin(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m <= 0) return "just now";
  if (m === 1) return "1 min ago";
  return `${m} min ago`;
}
