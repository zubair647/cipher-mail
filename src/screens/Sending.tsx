import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusPill } from "../components/common";
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

  // Auto-advance to summary when finished.
  useEffect(() => {
    if (snap?.status === "done") {
      const t = setTimeout(() => nav("/campaign/summary"), 900);
      return () => clearTimeout(t);
    }
  }, [snap?.status, nav]);

  if (!engine || !snap) return <div className="container"><p className="muted">Starting…</p></div>;

  const { counts, sentToday, dailyCap, totalRecipients, status } = snap;
  const paused = status === "paused";
  const authExpired = status === "auth-expired";
  const progressPct = dailyCap ? Math.min(100, (sentToday / Math.min(dailyCap, snap.todaysAllowance + sentToday || dailyCap)) * 100) : 0;
  const todayTarget = Math.min(dailyCap, snap.sentThisRun + snap.remainingTotal);

  const reauth = async () => { await signIn(); engine.start(); };

  return (
    <div className="container container-wide">
      <div className="row-between" style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 26 }}>
          {authExpired ? "Sign-in expired" : paused ? "Paused" : status === "done" ? "Send complete" : "Sending…"}
        </h1>
        <div className="row" style={{ gap: 10 }}>
          {authExpired ? (
            <button className="btn btn-primary" onClick={reauth}>Sign in again & resume</button>
          ) : paused ? (
            <>
              <button className="btn btn-primary" onClick={() => engine.start()}>Resume</button>
              <button className="btn btn-danger" onClick={() => { engine.cancel(); nav("/campaign/summary"); }}>Cancel</button>
            </>
          ) : status === "sending" ? (
            <>
              <button className="btn btn-ghost" onClick={() => engine.pause()}>Pause</button>
              <button className="btn btn-danger" onClick={() => { engine.cancel(); nav("/campaign/summary"); }}>Cancel</button>
            </>
          ) : null}
        </div>
      </div>

      <p className="small muted" style={{ marginBottom: 20 }}>
        {authExpired ? (
          <>Your Microsoft access expired, so the send paused at recipient {snap.sentThisRun + 1}. Nothing was lost — sign in again and it resumes from where it stopped.</>
        ) : paused ? (
          <>Send paused at recipient {snap.pausedAtIndex}. No one is mid-flight. Resume any time — progress is saved.</>
        ) : (
          <>
            Spaced ~5–50s apart
            {snap.nextInSec !== null && <> · next in <span className="mono">{snap.nextInSec}s</span></>}
            {snap.pacingWidened && <> · <span style={{ color: "var(--skipped)" }}>pacing widened by provider ↓</span></>}
          </>
        )}
      </p>

      <div className="row wrap" style={{ gap: 12, marginBottom: 16 }}>
        <Stat n={counts.sent} label="Sent" cls="st-sent" />
        <Stat n={counts.failed} label="Failed" cls="st-failed" />
        <Stat n={counts.queued} label="Queued" cls="st-queued" />
        <Stat n={counts.skipped} label="Skipped" cls="st-skipped" />
      </div>

      <div className="card card-pad stack-8" style={{ marginBottom: 20 }}>
        <div className="row-between small">
          <span className="muted">{sentToday} / {todayTarget} today</span>
          <span className="muted">{totalRecipients} total in this CSV</span>
        </div>
        <div style={{ height: 8, background: "#eceae5", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--orange)", transition: "width .4s ease" }} />
        </div>
      </div>

      {authExpired && (
        <div className="banner banner-warn" style={{ marginBottom: 16 }}>
          <span className="ico">!</span>
          <span>Same pattern covers laptop sleep or a closed tab — you'll be offered a resume on next launch.</span>
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "#faf9f6", textAlign: "left" }}>
              <Th>Recipient</Th><Th>Merged subject</Th><Th>Status</Th><Th>Time</Th>
            </tr>
          </thead>
          <tbody>
            {orderRows(snap).slice(0, 120).map((r, i) => (
              <tr key={r.email + i} style={{ borderTop: "1px solid var(--hairline)" }}>
                <Td><span className="mono">{r.email}</span></Td>
                <Td><span className="muted">{r.skipReason ? "—" : r.mergedSubject}</span></Td>
                <Td><StatusPill status={r.skipReason ?? r.status} /></Td>
                <Td><span className="mono muted-2">{r.timeLabel ?? "—"}</span></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tiny muted" style={{ marginTop: 14 }}>Keep this tab open until the send finishes. Progress is written to IndexedDB, so a crash resumes without double-sending.</p>
    </div>
  );
}

// Show active rows first: sending, then queued, then sent/failed/skipped.
function orderRows(snap: EngineSnapshot) {
  const order: Record<string, number> = { sending: 0, queued: 1, failed: 2, sent: 3, skipped: 4 };
  return [...snap.rows].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className="card card-pad" style={{ flex: "1 1 120px", minWidth: 120 }}>
      <div className={`num`} style={{ fontSize: 26 }}>{n}</div>
      <div className={`status-pill ${cls}`} style={{ marginTop: 6 }}><span className="dot" />{label}</div>
    </div>
  );
}
const Th = ({ children }: { children: React.ReactNode }) => <th style={{ padding: "10px 16px", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>{children}</th>;
const Td = ({ children }: { children: React.ReactNode }) => <td style={{ padding: "9px 16px", verticalAlign: "middle" }}>{children}</td>;
