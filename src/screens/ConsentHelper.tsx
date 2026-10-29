import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Note } from "../components/common";
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
    <div className="center">
      <div className="authcard" style={{ width: 520, textAlign: "left", padding: 46 }}>
        <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--amber-bg)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
        </span>
        <div style={{ font: "600 22px/1.2 var(--sans)", letterSpacing: "-.02em", marginBottom: 12 }}>One-time admin approval needed</div>
        <p style={{ fontSize: 15, color: "var(--gray)", margin: "0 0 26px", lineHeight: 1.6 }}>
          Your organization requires an admin to approve Cipher Mail once before it can send mail as you. This is a tenant policy — not something the app controls.
        </p>

        <span className="lbl">Ready-to-send request</span>
        <div style={{ border: "1px solid var(--line-2)", borderRadius: 14, padding: 18, fontSize: 14, color: "var(--gray)", background: "var(--bg-2)", lineHeight: 1.65, marginBottom: 26 }}>
          {REQUEST_MESSAGE}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button className="btn btn-pri" style={{ flex: 1, justifyContent: "center" }} onClick={requestApproval} disabled={!MS_CLIENT_ID}>
            Request admin approval
          </button>
          <button className="btn btn-sec" onClick={copy}>{copied ? "Copied ✓" : "Copy message"}</button>
        </div>

        <Note kind="info">
          No dead-end — once an admin approves, sign in again and continue. Where your tenant supports it, "Request admin approval" sends the request straight to your admin.
        </Note>

        <div className="rowb" style={{ marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={() => { clearConsent(); nav("/"); }}>‹ Back to sign in</button>
          <button className="btn btn-sec" onClick={async () => { clearConsent(); await signIn(); nav("/"); }}>
            I've been approved — sign in again
          </button>
        </div>
      </div>
    </div>
  );
}
