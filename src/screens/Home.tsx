import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, IconPlus, IconMail } from "../components/common";
import { useAuth } from "../state/AuthContext";
import { useCampaign } from "../state/CampaignContext";
import { getTemplates, deleteTemplate } from "../lib/storage";
import { getAllSendLogs } from "../lib/db";
import type { SendLogEntry, Template } from "../lib/types";

const RESUME_DISMISS_KEY = "cm.resumeDismissed";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function Home() {
  const nav = useNavigate();
  const { account } = useAuth();
  const { resetCampaign, loadTemplate, resumeCampaign } = useCampaign();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [resumeLog, setResumeLog] = useState<SendLogEntry | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(getTemplates());
    setDismissedId(localStorage.getItem(RESUME_DISMISS_KEY));
    getAllSendLogs().then((logs) => {
      const unfinished = logs.find((l) => l.remaining > 0);
      setResumeLog(unfinished ?? null);
    });
  }, []);

  // "Start a new campaign" — straight into a fresh flow, no second prompt.
  const startNew = () => { resetCampaign(); nav("/campaign/variables"); };
  const openTemplate = (t: Template) => { resetCampaign(); loadTemplate(t); nav("/campaign/variables"); };
  const remove = (id: string) => { deleteTemplate(id); setTemplates(getTemplates()); };

  // Dismiss hides the banner and remembers this unfinished campaign so it stays
  // hidden across reloads. Saved progress is retained; a genuinely new unfinished
  // send (different campaignId) will re-offer.
  const dismiss = () => {
    if (!resumeLog) return;
    localStorage.setItem(RESUME_DISMISS_KEY, resumeLog.campaignId);
    setDismissedId(resumeLog.campaignId);
  };

  const resume = () => {
    if (!resumeLog) return;
    resumeCampaign(resumeLog.campaignId, resumeLog.subject, resumeLog.templateName);
    nav("/campaign/upload");
  };

  const first = account?.name.split(" ")[0] ?? "there";
  const showResume = resumeLog && dismissedId !== resumeLog.campaignId;

  return (
    <Shell active="home">
      <div className="page"><div className="canvas">
        {showResume && (
          <div className="panel" style={{ padding: "26px 28px", marginBottom: 40, position: "relative", borderColor: "var(--accent-tint-2)", background: "linear-gradient(180deg,#fffaf3,#fff)" }}>
            <button
              onClick={dismiss}
              title="Dismiss"
              aria-label="Dismiss"
              style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", background: "var(--fill)", color: "var(--gray)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 15, border: "none", lineHeight: 1 }}
            >✕</button>
            <div className="row" style={{ gap: 12, marginBottom: 10 }}>
              <span className="pill" style={{ background: "var(--accent-tint)", color: "var(--accent-700)" }}>Unfinished send</span>
            </div>
            <div className="h3" style={{ marginBottom: 6 }}>Resume your last campaign?</div>
            <p style={{ fontSize: 14.5, color: "var(--gray)", margin: "0 0 20px", maxWidth: 640, lineHeight: 1.6 }}>
              An unfinished send stopped with <b style={{ color: "var(--ink)" }}>{resumeLog.remaining} of {resumeLog.totalRecipients} remaining</b>. Re-upload the same CSV to continue — already-sent recipients are skipped automatically, so no one is emailed twice.
            </p>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-pri" onClick={resume}>Resume this campaign</button>
              <button className="btn btn-line" onClick={startNew}>Start a new campaign</button>
              <button className="btn btn-ghost" onClick={dismiss}>Dismiss</button>
            </div>
          </div>
        )}

        <div className="rowb" style={{ alignItems: "flex-end", marginBottom: 34 }}>
          <div>
            <h1 className="h1">{greeting()}, {first}</h1>
            <p style={{ fontSize: 16, color: "var(--gray)", margin: 0 }}>Start a new campaign or reuse a saved one.</p>
          </div>
          <button className="btn btn-pri btn-lg" onClick={startNew}><IconPlus />New campaign</button>
        </div>

        {templates.length === 0 ? (
          <div style={{ padding: "56px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <span style={{ width: 76, height: 76, borderRadius: 22, background: "var(--accent-tint)", color: "var(--accent-600)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}><IconMail s={34} /></span>
            <h2 className="h2">No campaigns yet</h2>
            <p style={{ fontSize: 16, color: "var(--gray)", maxWidth: 420, margin: "0 0 32px", lineHeight: 1.55 }}>
              Start your first campaign — define variables, upload a CSV, write the mail, and send. After it sends, save it as a campaign to reuse next time.
            </p>
            <button className="btn btn-pri btn-lg" onClick={startNew}><IconPlus />New campaign</button>
          </div>
        ) : (
          <>
            <div className="rowb" style={{ alignItems: "baseline", marginBottom: 18 }}>
              <span className="lbl" style={{ margin: 0 }}>Saved campaigns</span>
              <span style={{ fontSize: 13, color: "var(--gray-2)" }}>{templates.length} saved</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {templates.map((t) => (
                <div key={t.id} className="tcard" onClick={() => openTemplate(t)}>
                  <span className="ico"><IconMail s={20} /></span>
                  <h4>{t.name}</h4>
                  <p className="mono" style={{ fontSize: 13 }}>{t.subject || "—"}</p>
                  <span className="ft">
                    <span>{t.variables.filter((v) => v !== "email").length} variables · {relative(t.updatedAt)}</span>
                    <button className="linkbtn" style={{ color: "var(--gray-2)", fontWeight: 500, fontFamily: "var(--sans)" }} onClick={(e) => { e.stopPropagation(); remove(t.id); }}>Delete</button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 36, lineHeight: 1.6, maxWidth: 640 }}>
          Saved campaigns (subject + body + variables) are stored in your browser. Recipient data never is — you re-upload a CSV each time you send.
        </p>
      </div></div>
    </Shell>
  );
}

function relative(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} wks ago`;
  return `${Math.floor(days / 30)} mo ago`;
}
