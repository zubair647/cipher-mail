import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead } from "../components/common";
import { useCampaign } from "../state/CampaignContext";

export function Summary() {
  const nav = useNavigate();
  const { engine, built, resetCampaign } = useCampaign();
  const snap = engine?.snapshot();

  const remaining = snap?.remainingTotal ?? 0;
  const capHit = (snap?.capReached ?? false) && remaining > 0;

  const csvLog = useMemo(() => {
    if (!snap) return "";
    const header = "email,merged_subject,status,time\n";
    const body = snap.rows
      .map((r) => [r.email, csvField(r.mergedSubject), r.skipReason ?? r.status, r.timeLabel ?? ""].join(","))
      .join("\n");
    return header + body;
  }, [snap]);

  const download = () => {
    const blob = new Blob([csvLog], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cipher-mail-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!snap) {
    return (
      <div className="container container-narrow">
        <ScreenHead title="Nothing to summarize" />
        <button className="btn btn-primary" onClick={() => { resetCampaign(); nav("/"); }}>Back to home</button>
      </div>
    );
  }

  const done = snap.counts.sent;
  const total = built?.sendableCount ?? snap.sendableTotal;

  return (
    <div className="container container-narrow">
      <ScreenHead
        eyebrow="FR#11"
        title={capHit ? "Today's send is done" : "Send complete"}
        sub="Logged locally. You can download the log or run the rest tomorrow."
      />

      <div className="row wrap" style={{ gap: 12, marginBottom: 20 }}>
        <Stat n={snap.counts.sent} label="Sent" cls="st-sent" />
        <Stat n={snap.counts.failed} label="Failed" cls="st-failed" />
        <Stat n={snap.counts.skipped} label="Skipped" cls="st-skipped" />
      </div>

      {capHit ? (
        <div className="banner banner-warn" style={{ marginBottom: 20 }}>
          <span className="ico">!</span>
          <span>
            <span className="strong">{done} of {total}</span> sent — {remaining} remaining. Daily cap reached.
            Come back tomorrow to send the next batch — re-upload the same CSV and already-sent recipients are skipped.
          </span>
        </div>
      ) : (
        <div className="banner banner-ok" style={{ marginBottom: 20 }}>
          <span className="ico">✓</span>
          <span>All {total} sendable recipients processed. Nothing left in the queue.</span>
        </div>
      )}

      <div className="row" style={{ gap: 10 }}>
        <button className="btn btn-ghost" onClick={download}>Download log (CSV)</button>
        <button className="btn btn-primary" onClick={() => { resetCampaign(); nav("/"); }}>
          {capHit ? "Done — back to home" : "Start a new campaign"}
        </button>
      </div>
    </div>
  );
}

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className="card card-pad" style={{ flex: "1 1 120px", minWidth: 120 }}>
      <div className="num" style={{ fontSize: 28 }}>{n}</div>
      <div className={`status-pill ${cls}`} style={{ marginTop: 6 }}><span className="dot" />{label}</div>
    </div>
  );
}
