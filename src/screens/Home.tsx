import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/common";
import { useAuth } from "../state/AuthContext";
import { useCampaign } from "../state/CampaignContext";
import { getTemplates, deleteTemplate } from "../lib/storage";
import { getAllSendLogs } from "../lib/db";
import type { SendLogEntry, Template } from "../lib/types";

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

  useEffect(() => {
    setTemplates(getTemplates());
    getAllSendLogs().then((logs) => {
      const unfinished = logs.find((l) => l.remaining > 0);
      setResumeLog(unfinished ?? null);
    });
  }, []);

  const startNew = () => { resetCampaign(); nav("/campaign/variables"); };
  const openTemplate = (t: Template) => { resetCampaign(); loadTemplate(t); nav("/campaign/variables"); };
  const remove = (id: string) => { deleteTemplate(id); setTemplates(getTemplates()); };

  const resume = () => {
    if (!resumeLog) return;
    resumeCampaign(resumeLog.campaignId, resumeLog.subject, resumeLog.templateName);
    nav("/campaign/upload");
  };

  const first = account?.name.split(" ")[0] ?? "there";

  return (
    <div className="page">
      <TopBar title="Home" />
      <div className="container">
        {resumeLog && (
          <div className="card card-pad stack-12" style={{ borderColor: "#f1dcb8", marginBottom: 24 }}>
            <div className="row-between">
              <h3>Resume your last campaign?</h3>
              <span className="chip-ghost chip">unfinished</span>
            </div>
            <p className="muted small">
              An unfinished send stopped with <span className="strong">{resumeLog.remaining}</span> of{" "}
              {resumeLog.totalRecipients} remaining. Re-upload the same CSV to continue — already-sent recipients are
              skipped automatically, so no one is emailed twice.
            </p>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-primary" onClick={resume}>Resume this campaign</button>
              <button className="btn btn-ghost" onClick={startNew}>Start a new campaign</button>
            </div>
          </div>
        )}

        <div className="stack-8" style={{ marginBottom: 28 }}>
          <h1>{greeting()}, {first}</h1>
          <p className="muted" style={{ fontSize: 15 }}>Start a new campaign or reuse a saved template.</p>
        </div>

        <button className="btn btn-primary btn-lg" onClick={startNew} style={{ marginBottom: 32 }}>
          + New campaign
        </button>

        <div className="row-between" style={{ marginBottom: 14 }}>
          <h3>Saved templates</h3>
          <span className="small muted">{templates.length} saved</span>
        </div>

        {templates.length === 0 ? (
          <div className="card card-pad-lg stack-12" style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 20 }}>No campaigns yet</h2>
            <p className="muted" style={{ maxWidth: 420, margin: "0 auto" }}>
              Start your first campaign — define variables, upload a CSV, write the mail, and send.
              We'll save the template for next time.
            </p>
            <div><button className="btn btn-primary" onClick={startNew}>+ New campaign</button></div>
          </div>
        ) : (
          <div className="stack-12">
            {templates.map((t) => (
              <div key={t.id} className="card card-pad row-between" style={{ cursor: "pointer" }} onClick={() => openTemplate(t)}>
                <div className="stack-4">
                  <span className="strong" style={{ fontSize: 15 }}>{t.name}</span>
                  <span className="small muted">
                    Subject: <span className="mono">{t.subject || "—"}</span>
                  </span>
                  <span className="tiny muted-2">
                    {t.variables.filter((v) => v !== "email").length} variables · updated {relative(t.updatedAt)}
                  </span>
                </div>
                <div className="row" style={{ gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-ghost" onClick={() => openTemplate(t)}>Use</button>
                  <button className="btn-link" style={{ color: "var(--muted-2)" }} onClick={() => remove(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ marginTop: 32 }}>
          <button className="btn-link" onClick={() => nav("/settings")}>Settings</button>
        </div>
        <p className="tiny muted-2" style={{ marginTop: 18 }}>
          Templates (subject + body + variables) are stored in your browser. Recipient data never is — you re-upload a CSV each campaign.
        </p>
      </div>
    </div>
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
