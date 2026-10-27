import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "../components/common";
import { adminConsentUrl } from "../auth/authProvider";
import { MS_CLIENT_ID } from "../auth/msalConfig";
import { useAuth } from "../state/AuthContext";

const REQUEST_MESSAGE = `Hi — please approve the app "Cipher Mail" for our tenant. It needs Mail.Send (delegated) so it can send email as the signed-in user. Business need: sending personalized batch emails from our own CipherSchools mailboxes. Thank you!`;

export function ConsentHelper() {
  const nav = useNavigate();
  const { signIn, clearConsent } = useAuth();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(REQUEST_MESSAGE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const requestApproval = () => {
    if (!MS_CLIENT_ID) return;
    window.open(adminConsentUrl(), "_blank", "noopener");
  };

  return (
    <div className="center-screen">
      <div className="stack-20" style={{ width: 520, maxWidth: "100%" }}>
        <div className="row" style={{ justifyContent: "center" }}><Wordmark size={38} /></div>
        <div className="card card-pad-lg stack-16">
          <h1 style={{ fontSize: 24 }}>One-time admin approval needed</h1>
          <p className="muted">
            Your organization requires an admin to approve Cipher Mail once before it can send mail as you.
            This is a tenant policy — not something the app controls.
          </p>

          <div className="stack-8">
            <span className="label">Ready-to-send request</span>
            <div className="card" style={{ background: "#faf9f6", padding: 14, fontSize: 13.5, lineHeight: 1.55 }}>
              {REQUEST_MESSAGE}
            </div>
          </div>

          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={requestApproval} disabled={!MS_CLIENT_ID}>
              Request admin approval
            </button>
            <button className="btn btn-ghost" onClick={copy}>{copied ? "Copied ✓" : "Copy message"}</button>
          </div>

          <div className="banner banner-info">
            <span className="ico">i</span>
            <span>
              No dead-end — once an admin approves, sign in again and continue. Where your tenant supports it,
              "Request admin approval" sends the request straight to your admin.
            </span>
          </div>

          <div className="row-between" style={{ marginTop: 4 }}>
            <button className="btn-link" onClick={() => { clearConsent(); nav("/"); }}>‹ Back to sign in</button>
            <button className="btn btn-subtle" onClick={async () => { clearConsent(); await signIn(); nav("/"); }}>
              I've been approved — sign in again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
