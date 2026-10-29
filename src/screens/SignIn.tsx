import { BrandMark, Note } from "../components/common";
import { useAuth } from "../state/AuthContext";

export function SignIn() {
  const { signIn, busy, error, mock } = useAuth();
  return (
    <div className="center">
      <div style={{ width: 440, maxWidth: "100%" }}>
        <div className="authcard">
          <span style={{ display: "block", width: 56, height: 56, margin: "0 auto 26px" }}>
            <BrandMark size={56} />
          </span>
          <div style={{ font: "600 28px/1.1 var(--sans)", letterSpacing: "-.03em", marginBottom: 14 }}>Cipher Mail</div>
          <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--gray)", margin: "0 0 34px" }}>
            Send one personalized email to many recipients, from your own mailbox — paced to land in the inbox.
          </p>
          <button className="msbtn" onClick={signIn} disabled={busy}>
            <span className="msgrid"><i /><i /><i /><i /></span>
            {busy ? (mock ? "Entering demo…" : "Signing in…") : mock ? "Try the demo (no account)" : "Sign in with Microsoft"}
          </button>
          {error && <div style={{ marginTop: 22, textAlign: "left" }}><Note kind="err">{error}</Note></div>}
          <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--gray-2)", margin: "22px 0 0" }}>
            {mock
              ? "Demo mode: no real account is used and no mail is sent. Configure Microsoft to send for real."
              : <>You'll approve a one-time permission to send mail <b style={{ color: "var(--gray)" }}>as yourself</b>. No password is ever typed into the app.</>}
          </p>
        </div>
        {mock && (
          <p style={{ fontSize: 12.5, color: "var(--faint)", textAlign: "center", margin: "22px auto 0", maxWidth: 400, lineHeight: 1.55 }}>
            No Azure app is configured, so sign-in and sending are simulated locally. Add <code className="mono">VITE_MS_CLIENT_ID</code> in <code className="mono">.env</code> to connect a real mailbox.
          </p>
        )}
      </div>
    </div>
  );
}
