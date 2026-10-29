import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Masthead, StepFoot, Note } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { useAuth } from "../state/AuthContext";
import { mergeText } from "../lib/merge";
import { buildFinalHtml } from "../lib/email";
import { sendMail } from "../graph/sendMail";

const OUTLOOK_URL = "https://outlook.office.com/mail/";

const CHECKS = [
  "Variables filled in with the right values",
  "Links and buttons click through correctly",
  "Images and the logo display",
  "Formatting looks right on mobile and desktop",
];

export function TestSend() {
  const nav = useNavigate();
  const { account, signIn } = useAuth();
  const { draft, markTestSent } = useCampaign();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authIssue, setAuthIssue] = useState(false);

  const row = draft.csv?.rows[0] ?? {};
  const mailbox = account?.email ?? "";

  const send = async () => {
    setBusy(true);
    setError(null);
    setAuthIssue(false);
    try {
      const subject = "[TEST] " + mergeText(draft.subject, row, draft.mapping, false).text;
      const body = mergeText(draft.bodyHtml, row, draft.mapping, true).text;
      const res = await sendMail({ to: mailbox, subject, html: buildFinalHtml(body, mailbox, draft.isHtmlMode) });
      if (res.ok) {
        markTestSent();
      } else if ("retryAfterSec" in res) {
        setError(`Microsoft is rate-limiting right now. Wait about ${res.retryAfterSec}s, then try again.`);
      } else if ("authExpired" in res) {
        setAuthIssue(true);
        setError(
          res.error
            ? `Microsoft wouldn't authorize the send: ${res.error}. This usually means the Mail.Send permission hasn't been granted for your account yet.`
            : "Your Microsoft sign-in (or the Mail.Send permission) needs approval. Sign in again and approve, then retry."
        );
      } else {
        setError(res.error || "Test send failed. Please try again.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Re-authorize (re-consent to Mail.Send) then retry the test.
  const reauthAndRetry = async () => {
    try {
      await signIn();
      await send();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const sent = !!draft.testSentAt;

  return (
    <Shell>
      <div className="page">
        <Masthead label="FR#8" title="Send yourself a test" sub="Required before the first real send. Proves the merge, formatting, links and images render in a real inbox." />

        <div className="wizard even">
          <div className="panel" style={{ textAlign: "center", padding: "44px 34px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 60, height: 60, borderRadius: 17, background: sent ? "var(--green-bg)" : "var(--accent-tint)", color: sent ? "var(--green)" : "var(--accent-600)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              {sent ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></svg>
              )}
            </span>
            <p style={{ fontSize: 15, color: "var(--gray)", margin: "0 0 24px", lineHeight: 1.55, maxWidth: 340 }}>
              {sent
                ? <>Test sent to <b style={{ color: "var(--ink)" }}>{mailbox}</b>. Open Outlook to check it looks right.</>
                : <>A test copy goes to <b style={{ color: "var(--ink)" }}>{mailbox}</b> using recipient #1's merged values.</>}
            </p>

            {sent ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <a className="btn btn-lg" href={OUTLOOK_URL} target="_blank" rel="noopener noreferrer" style={{ background: "var(--green)", color: "#fff", fontWeight: 600 }}>
                  <OutlookIcon /> Open Outlook
                </a>
                <button className="btn btn-ghost" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send another test"}</button>
              </div>
            ) : (
              <button className="btn btn-pri btn-lg" onClick={send} disabled={busy}>
                {busy ? "Sending…" : "Send test to myself"}
              </button>
            )}

            {error && (
              <div style={{ marginTop: 22, textAlign: "left", width: "100%" }}>
                <Note kind="err">{error}</Note>
                {authIssue && (
                  <button className="btn btn-sec btn-sm" style={{ marginTop: 12 }} onClick={reauthAndRetry} disabled={busy}>
                    Sign in again &amp; retry
                  </button>
                )}
              </div>
            )}
            {sent && !error && (
              <div style={{ marginTop: 22, textAlign: "left", width: "100%" }}>
                <Note kind="ok"><b>Test sent {relativeMin(draft.testSentAt!)}.</b></Note>
              </div>
            )}
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

function OutlookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

function relativeMin(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m <= 0) return "just now";
  if (m === 1) return "1 min ago";
  return `${m} min ago`;
}
