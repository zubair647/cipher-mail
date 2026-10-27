import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar, Avatar } from "../components/common";
import { useAuth } from "../state/AuthContext";
import { getPrefs, setPrefs } from "../lib/storage";
import { getSuppression } from "../lib/db";
import { DEFAULT_DAILY_CAP, HARD_CEILING, type SuppressionEntry } from "../lib/types";

export function Settings() {
  const nav = useNavigate();
  const { account, signOut, signIn } = useAuth();
  const [cap, setCap] = useState(getPrefs().dailyCap);
  const [list, setList] = useState<SuppressionEntry[]>([]);

  useEffect(() => { getSuppression().then(setList); }, []);

  const updateCap = (v: number) => {
    const clamped = Math.min(Math.max(1, v), HARD_CEILING);
    setCap(clamped);
    setPrefs({ dailyCap: clamped });
  };

  const exportList = () => {
    const csv = "email,reason,date\n" + list.map((s) => `${s.email},${s.reason},${new Date(s.addedAt).toISOString().slice(0, 10)}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "unsubscribe-list.csv";
    a.click();
  };

  return (
    <div className="page">
      <TopBar title="Settings" />
      <div className="container container-narrow">
        <button className="btn-link" onClick={() => nav("/")} style={{ marginBottom: 20 }}>‹ Home</button>

        {/* Daily cap */}
        <div className="card card-pad stack-12" style={{ marginBottom: 20 }}>
          <div className="stack-4">
            <h3>Daily sending cap</h3>
            <p className="small muted">Warm-up protects your mailbox reputation. Default {DEFAULT_DAILY_CAP}.</p>
          </div>
          <div className="row" style={{ gap: 16 }}>
            <input type="range" min={1} max={HARD_CEILING} value={cap} onChange={(e) => updateCap(Number(e.target.value))} style={{ flex: 1, accentColor: "var(--orange)" }} />
            <span className="num" style={{ fontSize: 22, minWidth: 90, textAlign: "right" }}>{cap} <span className="small muted">/ day</span></span>
          </div>
          <div className="banner banner-info"><span className="ico">i</span><span>Hard ceiling <span className="strong">{HARD_CEILING}</span> — cannot be exceeded in v1, even by editing the cap.</span></div>
        </div>

        {/* Connected account */}
        <div className="card card-pad stack-12" style={{ marginBottom: 20 }}>
          <h3>Connected account</h3>
          <div className="row-between">
            <div className="row" style={{ gap: 12 }}>
              <Avatar initials={account?.initials ?? "?"} />
              <div className="stack-4">
                <span className="strong">{account?.name}</span>
                <span className="small muted mono">{account?.email}</span>
              </div>
            </div>
            <span className="status-pill st-sent"><span className="dot" />Connected</span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost" onClick={signIn}>Reconnect</button>
            <button className="btn btn-danger" onClick={async () => { await signOut(); nav("/"); }}>Sign out</button>
          </div>
        </div>

        {/* Unsubscribe list */}
        <div className="card card-pad stack-12">
          <div className="row-between">
            <div className="stack-4">
              <h3>Unsubscribe list</h3>
              <p className="small muted">Always suppressed · stored on this machine</p>
            </div>
            <span className="chip chip-ghost">{list.length} addresses</span>
          </div>
          {list.length === 0 ? (
            <p className="small muted">No suppressed addresses yet. Unsubscribes and hard bounces land here automatically.</p>
          ) : (
            <div className="stack-8">
              {list.slice(0, 50).map((s) => (
                <div key={s.email} className="row-between" style={{ borderBottom: "1px solid var(--hairline)", paddingBottom: 8 }}>
                  <span className="mono small">{s.email}</span>
                  <span className="tiny muted-2">
                    {s.reason === "unsubscribed" ? "unsubscribed" : "hard bounce"} · {new Date(s.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div><button className="btn btn-ghost" onClick={exportList} disabled={!list.length}>Export list (CSV)</button></div>
        </div>
      </div>
    </div>
  );
}
