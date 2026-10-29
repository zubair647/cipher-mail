import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, StepFoot, Note, MailWindow } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { useAuth } from "../state/AuthContext";
import { mergeText, validateTemplateVars } from "../lib/merge";
import { buildFinalHtml } from "../lib/email";

export function Preview() {
  const nav = useNavigate();
  const { account } = useAuth();
  const { draft } = useCampaign();
  const [i, setI] = useState(0);

  const rows = draft.csv?.rows ?? [];
  const total = rows.length;
  const row = rows[i] ?? {};
  const emailCol = draft.mapping["email"];
  const to = emailCol ? (row[emailCol] ?? "—") : "—";

  const subjectMerge = mergeText(draft.subject, row, draft.mapping, false);
  const bodyMerge = mergeText(draft.bodyHtml, row, draft.mapping, true);
  const { unknown, referenced } = validateTemplateVars(draft.subject, draft.bodyHtml, draft.mapping);
  const blocked = unknown.length > 0;
  const from = account?.name ?? "You";

  return (
    <Shell>
      <div className="page">
        <div className="masthead rowb" style={{ alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <h2 className="h2" style={{ margin: 0 }}>Preview every recipient</h2>
            <p className="lead" style={{ marginTop: 8 }}>Walk the list before sending. Unknown variables are flagged here.</p>
          </div>
          {blocked
            ? <Note kind="err" style={{ padding: "10px 14px" }}>Unknown variable</Note>
            : <Note kind="ok" style={{ padding: "10px 14px" }}>{total} of {total} resolve</Note>}
        </div>

        {blocked && (
          <div style={{ marginBottom: 24 }}>
            <Note kind="err"><b>Unknown variable {unknown.map((u) => <span key={u} className="kbd">{`{{${u}}}`}</span>)}.</b> No CSV column matches. Fix it in the editor — this campaign can't be sent until it resolves.</Note>
          </div>
        )}

        <div className="wizard" style={{ gridTemplateColumns: "320px 1fr", gap: 36 }}>
          <div className="ctx">
            <span className="lbl">Recipients · {total}</span>
            <div className="panel flush reclist">
              {rows.slice(0, 500).map((r, idx) => (
                <div key={idx} className={`r ${idx === i ? "on" : ""}`} onClick={() => setI(idx)}>
                  <span className="em">{emailCol ? (r[emailCol] ?? "—") : "—"}</span>
                  <span className={`badge dot-only ${blocked ? "b-fail" : "b-sent"}`} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="rowb" style={{ marginBottom: 14 }}>
              <span className="lbl" style={{ margin: 0 }}>Recipient {Math.min(i + 1, total || 1)} of {total} · {String(to)}</span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-sec btn-sm" disabled={i <= 0} onClick={() => setI((n) => Math.max(0, n - 1))}>‹ Prev</button>
                <button className="btn btn-sec btn-sm" disabled={i >= total - 1} onClick={() => setI((n) => Math.min(total - 1, n + 1))}>Next ›</button>
              </div>
            </div>

            {draft.isHtmlMode ? (
              <div className="mailwin">
                <div className="mailhd"><span className="meta">From: {from} · To: {String(to)}</span><span className="sub">{subjectMerge.text || <span className="faint">(no subject)</span>}</span></div>
                <iframe title="HTML email preview" sandbox="allow-same-origin" srcDoc={buildFinalHtml(bodyMerge.text, account?.email ?? "", true)} style={{ width: "100%", height: 520, border: 0, background: "#fff" }} />
              </div>
            ) : (
              <MailWindow from={from} to={String(to)} subject={subjectMerge.text} bodyHtml={bodyMerge.text} />
            )}

            <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 12 }}>{referenced.length} variables referenced · all cell values are HTML-escaped before sending.</p>
          </div>
        </div>

        <StepFoot backLabel="Edit" onBack={() => nav("/campaign/compose")}>
          <button className="btn btn-pri" disabled={blocked} onClick={() => nav("/campaign/test")}>Continue to test</button>
        </StepFoot>
      </div>
    </Shell>
  );
}
