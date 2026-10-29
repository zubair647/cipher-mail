import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Stepper, Masthead, Note } from "../components/common";
import { RichTextEditor } from "../components/RichTextEditor";
import { MailWindow } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { useAuth } from "../state/AuthContext";
import { mergeText, validateTemplateVars } from "../lib/merge";
import { buildFinalHtml } from "../lib/email";

const STARTER = `<p>Hi {{name | there}},</p><p>You're invited to this week's <strong>{{course}}</strong> live session. We'll cover the core concepts and finish with a live Q&A.</p><p style="text-align:center;margin:18px 0;"><a href="https://cipherschools.com/live" data-cm-button="1" style="display:inline-block;background:#e8912e;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:9px;">Register now</a></p><p>See you there,<br/>Team CipherSchools</p>`;

export function Compose() {
  const nav = useNavigate();
  const { account } = useAuth();
  const { draft, setCompose, setHtmlMode } = useCampaign();
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.bodyHtml || (draft.isHtmlMode ? "" : STARTER));
  const [i, setI] = useState(0);
  const htmlMode = draft.isHtmlMode;

  // Persist on change.
  useEffect(() => { setCompose(subject, body); /* eslint-disable-next-line */ }, [subject, body]);

  const insertable = draft.variables.filter((v) => v.key !== "email").map((v) => v.key);
  const rows = draft.csv?.rows ?? [];
  const total = rows.length;
  const row = rows[Math.min(i, Math.max(0, total - 1))] ?? {};
  const emailCol = draft.mapping["email"];
  const to = emailCol ? (row[emailCol] ?? "recipient@example.com") : "recipient@example.com";

  const subjMerge = mergeText(subject, row, draft.mapping, false);
  const bodyMerge = mergeText(body, row, draft.mapping, true);
  const { unknown } = validateTemplateVars(subject, body, draft.mapping);
  const from = account?.name ?? "You";

  return (
    <Shell>
      <div className="page">
        <Stepper active={3} />
        <Masthead label="Step 4 · FR#5, #6" title="Write the email" />

        <div className="wizard" style={{ gridTemplateColumns: "1.35fr 1fr", gap: 44 }}>
          <div>
            {/* subtle mode toggle — rich editor vs paste HTML */}
            <div className="row" style={{ gap: 6, marginBottom: 20 }}>
              <ModeBtn on={!htmlMode} onClick={() => setHtmlMode(false)}>Rich editor</ModeBtn>
              <ModeBtn on={htmlMode} onClick={() => setHtmlMode(true)}>Paste HTML</ModeBtn>
            </div>

            <div className="field">
              <span className="lbl">Subject</span>
              <input className="input" placeholder="Your {{course}} schedule" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <span className="lbl">Body</span>
            {htmlMode ? (
              <textarea
                className="input mono"
                spellCheck={false}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="<!doctype html> … paste your full HTML email here"
                style={{ minHeight: 360, fontSize: 12.5, lineHeight: 1.55 }}
              />
            ) : (
              <RichTextEditor value={body} onChange={setBody} variables={insertable} />
            )}

            <p style={{ fontSize: 12.5, color: "var(--gray-2)", margin: "18px 0 0", lineHeight: 1.55 }}>
              {htmlMode ? (
                <>Your HTML is sent <b>exactly as pasted</b>. Personalize with <span className="var">{"{{name}}"}</span>; wrap an unsubscribe link in <span className="kbd">{"<unsubscribe>…</unsubscribe>"}</span> and we turn it into a working link.</>
              ) : (
                <>The <b>Insert variable</b> dropdown lists only CSV-mapped fields. Add a fallback with a pipe: <span className="var">{"{{name | there}}"}</span>. Cell values are auto-escaped.</>
              )}
            </p>
          </div>

          <div className="ctx">
            <div className="rowb" style={{ marginBottom: 14 }}>
              <span className="lbl" style={{ margin: 0 }}>Live preview</span>
              <div className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--gray)" }}>
                <button className="btn btn-sec btn-sm" style={{ padding: "6px 10px" }} disabled={i <= 0} onClick={() => setI((n) => Math.max(0, n - 1))}>‹</button>
                {total ? `${Math.min(i + 1, total)} of ${total}` : "sample"}
                <button className="btn btn-sec btn-sm" style={{ padding: "6px 10px" }} disabled={i >= total - 1} onClick={() => setI((n) => Math.min(total - 1, n + 1))}>›</button>
              </div>
            </div>

            {htmlMode ? (
              <div className="mailwin" style={{ boxShadow: "var(--sh-sm)" }}>
                <div className="mailhd"><span className="meta">From: {from} · To: {String(to)}</span><span className="sub" style={{ fontSize: 15 }}>{subjMerge.text || <span className="faint">(no subject)</span>}</span></div>
                <iframe title="HTML preview" sandbox="allow-same-origin" srcDoc={buildFinalHtml(bodyMerge.text, account?.email ?? "", true)} style={{ width: "100%", height: 380, border: 0, background: "#fff" }} />
              </div>
            ) : (
              <MailWindow from={from} to={String(to)} subject={subjMerge.text} bodyHtml={bodyMerge.text} footer={false} shadow compact />
            )}

            {unknown.length > 0 ? (
              <div style={{ marginTop: 14 }}><Note kind="err">Unknown variable {unknown.map((u) => <span key={u} className="var">{`{{${u}}}`}</span>)}. No CSV column matches — fix before sending.</Note></div>
            ) : (
              <div style={{ marginTop: 14 }}><Note kind="ok">All variables resolve. Updates as you type.</Note></div>
            )}

            <button className="btn btn-pri btn-block" style={{ marginTop: 14 }} onClick={() => nav("/campaign/preview")}>Continue to preview</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function ModeBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`btn btn-sm ${on ? "btn-dark" : "btn-sec"}`} onClick={onClick} style={{ fontSize: 13 }}>
      {children}
    </button>
  );
}
