import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead, ActionBar } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { useAuth } from "../state/AuthContext";
import { mergeText } from "../lib/merge";
import { buildFinalHtml } from "../lib/email";
import { sendMail } from "../graph/sendMail";

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
    <div className="container container-narrow">
      <ScreenHead
        eyebrow="FR#8"
        title="Send yourself a test"
        sub="Required before the first real send. Proves the merge, formatting, links and images render in a real inbox."
      />

      <div className="card card-pad stack-16">
        <p className="muted small">
          A test copy goes to <span className="mono strong">{mailbox}</span> using recipient #1's merged values.
        </p>
        <div>
          <button className="btn btn-primary" onClick={send} disabled={busy}>
            {busy ? "Sending…" : sent ? "Send another test" : "Send test to myself"}
          </button>
        </div>
        {error && <div className="banner banner-error"><span className="ico">!</span><span>{error}</span></div>}
        {sent && (
          <div className="banner banner-ok">
            <span className="ico">✓</span>
            <span>Test sent {relativeMin(draft.testSentAt!)}. Check that links click through, images show, and variables filled in correctly.</span>
          </div>
        )}
      </div>

      <ActionBar
        backLabel="Back"
        onBack={() => nav("/campaign/preview")}
        primary={
          <button className="btn btn-primary" disabled={!sent} onClick={() => nav("/campaign/confirm")}>
            Continue to confirm
          </button>
        }
      />
      {!sent && <p className="tiny muted" style={{ textAlign: "right", marginTop: 8 }}>The real send stays locked until a test passes.</p>}
    </div>
  );
}

function relativeMin(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m <= 0) return "just now";
  if (m === 1) return "1 min ago";
  return `${m} min ago`;
}
