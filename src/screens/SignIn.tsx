import { Wordmark } from "../components/common";
import { useAuth } from "../state/AuthContext";

export function SignIn() {
  const { signIn, busy, error, mock } = useAuth();
  return (
    <div className="center-screen">
      <div className="stack-24" style={{ width: 420, maxWidth: "100%" }}>
        <div className="row" style={{ justifyContent: "center" }}>
          <Wordmark size={44} />
        </div>
        <div className="card card-pad-lg stack-20" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 26 }}>Send one personal email to many — safely</h1>
          <p className="muted" style={{ fontSize: 15 }}>
            Send a personalized email to many recipients, from your own mailbox — paced so it lands in the inbox.
          </p>
          <button className="btn btn-microsoft btn-lg btn-block" onClick={signIn} disabled={busy}>
            <MsIcon /> {busy ? "Signing in…" : "Sign in with Microsoft"}
          </button>
          {error && <div className="banner banner-error"><span className="ico">!</span><span>{error}</span></div>}
          <p className="tiny muted">
            You'll approve a one-time permission to send mail as yourself. No password is ever typed into the app.
          </p>
        </div>
        {mock && (
          <div className="banner banner-info" style={{ fontSize: 12.5 }}>
            <span className="ico">i</span>
            <span>
              Demo mode — no Azure app is configured, so sign-in and sending are simulated locally. Add
              <code> VITE_MS_CLIENT_ID</code> in <code>.env</code> to connect a real mailbox. See the README.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="0" y="0" width="7" height="7" fill="#F25022" />
      <rect x="9" y="0" width="7" height="7" fill="#7FBA00" />
      <rect x="0" y="9" width="7" height="7" fill="#00A4EF" />
      <rect x="9" y="9" width="7" height="7" fill="#FFB900" />
    </svg>
  );
}
