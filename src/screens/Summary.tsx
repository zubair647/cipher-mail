import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Note } from "../components/common";
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
      <Shell>
        <div className="page">
          <h2 className="h2">Nothing to summarize</h2>
          <button className="btn btn-pri" style={{ marginTop: 16 }} onClick={() => { resetCampaign(); nav("/"); }}>Back to home</button>
        </div>
      </Shell>
    );
  }

  const done = snap.counts.sent;
  const total = built?.sendableCount ?? snap.sendableTotal;

  return (
    <Shell>
      <div className="page"><div className="canvas">
        <div className="row" style={{ gap: 16, marginBottom: 30 }}>
          <span style={{ width: 54, height: 54, borderRadius: 16, background: capHit ? "var(--amber-bg)" : "var(--green-bg)", color: capHit ? "var(--amber)" : "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <div>
            <h2 className="h2" style={{ margin: 0 }}>{capHit ? "Today's send is done" : "Send complete"}</h2>
            <p style={{ fontSize: 15, color: "var(--gray)", margin: "4px 0 0" }}>Logged locally. {capHit ? "You can run the rest tomorrow." : "Nothing left in the queue."}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard n={snap.counts.sent} label="Sent today" color="var(--green)" />
          <StatCard n={snap.counts.failed} label="Failed" color="var(--red)" />
          <StatCard n={snap.counts.skipped} label="Skipped" color="var(--amber)" />
          <StatCard n={remaining} label="Remaining" color="var(--ink-2)" />
        </div>

        {capHit ? (
          <div style={{ marginBottom: 22 }}><Note kind="warn"><b>{done} of {total} sent — {remaining} remaining.</b> Daily cap reached. Come back tomorrow to send the next batch — re-upload the same CSV and already-sent recipients are skipped.</Note></div>
        ) : (
          <div style={{ marginBottom: 22 }}><Note kind="ok">All {total} sendable recipients processed. Nothing left in the queue.</Note></div>
        )}

        <div className="row" style={{ gap: 12 }}>
          <button className="btn btn-line btn-lg" onClick={download}>Download log (CSV)</button>
          <button className="btn btn-pri btn-lg" onClick={() => { resetCampaign(); nav("/"); }}>{capHit ? "Done — back to home" : "Start a new campaign"}</button>
        </div>
      </div></div>
    </Shell>
  );
}

function StatCard({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="panel" style={{ padding: 24 }}>
      <div className="num" style={{ fontSize: 38, lineHeight: 1, color }}>{n}</div>
      <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 8 }}>{label}</div>
    </div>
  );
}

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
