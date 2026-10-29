import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, StatusBadge, Note } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { useAuth } from "../state/AuthContext";
import type { EngineSnapshot } from "../engine/sendEngine";

export function Sending() {
  const nav = useNavigate();
  const { engine } = useCampaign();
  const { signIn } = useAuth();
  const [snap, setSnap] = useState<EngineSnapshot | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!engine) { nav("/campaign/confirm"); return; }
    const unsub = engine.subscribe(setSnap);
    if (!started.current) { started.current = true; engine.start(); }
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  useEffect(() => {
    if (snap?.status === "done") {
      const t = setTimeout(() => nav("/campaign/summary"), 900);
      return () => clearTimeout(t);
    }
  }, [snap?.status, nav]);

  if (!engine || !snap) return <Shell><div className="page"><p className="muted">Starting…</p></div></Shell>;

  const { counts, sentToday, dailyCap, totalRecipients, status } = snap;
  const paused = status === "paused";
  const authExpired = status === "auth-expired";
  const todayTarget = Math.min(dailyCap, snap.sentThisRun + snap.remainingTotal);
  const progressPct = dailyCap ? Math.min(100, (sentToday / Math.min(dailyCap, snap.todaysAllowance + sentToday || dailyCap)) * 100) : 0;

  const reauth = async () => { await signIn(); engine.start(); };

  return (
    <Shell>
      <div className="page">
        <div className="rowb" style={{ alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 className="h2" style={{ marginBottom: 6 }}>{paused ? "Paused" : status === "done" ? "Send complete" : "Sending…"}</h2>
            <p style={{ fontSize: 14, color: "var(--gray)", margin: 0 }}>
              {paused ? (
                <>Send paused at recipient {snap.pausedAtIndex}. No one is mid-flight.</>
              ) : (
                <>Spaced ~5–50s apart
                  {snap.nextInSec !== null && <> · <b style={{ color: "var(--ink-2)" }}>next in {snap.nextInSec}s</b></>}
                  {snap.pacingWidened && <> · <span style={{ color: "var(--amber)" }}>pacing widened by provider ↓</span></>}
                </>
              )}
            </p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            {paused ? (
              <>
                <button className="btn btn-pri" onClick={() => engine.start()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 3 14 9-14 9z" /></svg>Resume
                </button>
                <button className="btn btn-line btn-danger" onClick={() => { engine.cancel(); nav("/campaign/summary"); }}>Cancel</button>
              </>
            ) : status === "sending" ? (
              <>
                <button className="btn btn-sec" onClick={() => engine.pause()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>Pause
                </button>
                <button className="btn btn-line btn-danger" onClick={() => { engine.cancel(); nav("/campaign/summary"); }}>Cancel</button>
              </>
            ) : null}
          </div>
        </div>

        <div className="stat" style={{ marginBottom: 18 }}>
          <div><div className="k" style={{ color: "var(--green)" }}>{counts.sent}</div><div className="v">Sent</div></div>
          <div><div className="k">{counts.failed}</div><div className="v">Failed</div></div>
          <div><div className="k" style={{ color: "var(--gray)" }}>{counts.queued}</div><div className="v">{paused ? "Remaining today" : "Queued today"}</div></div>
          <div><div className="k" style={{ color: "var(--amber)" }}>{counts.skipped}</div><div className="v">Skipped</div></div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}><div className="k" style={{ fontSize: 24, color: "var(--ink-2)" }}>{sentToday} / {todayTarget}</div><div className="v">today · {totalRecipients} total</div></div>
        </div>

        <div className="prog" style={{ marginBottom: 28 }}><i style={{ width: `${progressPct}%`, background: paused ? "var(--amber)" : "var(--accent)" }} /></div>

        {paused && (
          <div style={{ marginBottom: 20 }}><Note kind="info">Resume any time — progress is saved. Keep this tab open until the send finishes; if it closes, you'll be offered a resume on the next launch.</Note></div>
        )}

        <div className="panel flush">
          <table className="tbl">
            <thead><tr><th>Recipient</th><th>Merged subject</th><th style={{ width: 140 }}>Status</th><th style={{ width: 110 }}>Time</th></tr></thead>
            <tbody>
              {orderRows(snap).slice(0, 120).map((r, idx) => (
                <tr key={r.email + idx}>
                  <td className="em">{r.email}</td>
                  <td>{r.skipReason ? "—" : r.mergedSubject}</td>
                  <td><StatusBadge status={r.skipReason ?? r.status} /></td>
                  <td className="faint">{r.timeLabel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 14 }}>Keep this tab open until the send finishes. Progress is written to IndexedDB, so a crash resumes without double-sending.</p>
      </div>

      {authExpired && (
        <div className="scrim">
          <div className="modal">
            <span className="ico" style={{ background: "var(--red-bg)", color: "var(--red)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
            </span>
            <h2 className="h3" style={{ marginBottom: 10 }}>Sign-in expired</h2>
            <p style={{ fontSize: 14.5, color: "var(--gray)", margin: "0 0 24px", lineHeight: 1.6 }}>
              Your Microsoft access expired, so the send <b style={{ color: "var(--ink)" }}>paused at recipient {snap.sentThisRun + 1}</b>. Nothing was lost. Sign in again and it resumes from where it stopped.
            </p>
            <button className="msbtn" style={{ height: 50 }} onClick={reauth}><span className="msgrid"><i /><i /><i /><i /></span>Sign in again &amp; resume</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function orderRows(snap: EngineSnapshot) {
  const order: Record<string, number> = { sending: 0, queued: 1, failed: 2, sent: 3, skipped: 4 };
  return [...snap.rows].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}
