import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead, ActionBar } from "../components/common";
import { EmailFrame } from "../components/EmailFrame";
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
  const { unknown } = validateTemplateVars(draft.subject, draft.bodyHtml, draft.mapping);
  const blocked = unknown.length > 0;

  const referencedCount = validateTemplateVars(draft.subject, draft.bodyHtml, draft.mapping).referenced.length;

  return (
    <div className="container">
      <ScreenHead eyebrow="FR#7" title="Preview" />

      <div className="row-between" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" disabled={i <= 0} onClick={() => setI((n) => Math.max(0, n - 1))}>‹</button>
          <span className="small muted">Recipient <span className="strong">{Math.min(i + 1, total)}</span> of {total}</span>
          <button className="btn btn-ghost" disabled={i >= total - 1} onClick={() => setI((n) => Math.min(total - 1, n + 1))}>›</button>
        </div>
        {blocked ? (
          <span className="status-pill st-failed"><span className="dot" />Unknown variable</span>
        ) : (
          <span className="status-pill st-sent"><span className="dot" />All {referencedCount} variables resolve</span>
        )}
      </div>

      {blocked && (
        <div className="banner banner-error" style={{ marginBottom: 14 }}>
          <span className="ico">!</span>
          <span>
            Unknown variable {unknown.map((u) => <code key={u} className="mono">{`{{${u}}}`}</code>)}. No CSV column matches.
            Fix it in the editor — this campaign can't be sent until it resolves.
          </span>
        </div>
      )}

      {draft.isHtmlMode ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--hairline)", background: "#faf9f6" }}>
            <div className="tiny muted">From: {account?.name} &lt;{account?.email}&gt; · To: {String(to)}</div>
            <div style={{ fontWeight: 600, marginTop: 4, fontSize: 15 }}>{subjectMerge.text || <span className="muted">(no subject)</span>}</div>
          </div>
          <iframe
            title="HTML email preview"
            // allow-same-origin so the document renders; no allow-scripts, so any
            // scripts in pasted HTML are blocked.
            sandbox="allow-same-origin"
            srcDoc={buildFinalHtml(bodyMerge.text, account?.email ?? "", true)}
            style={{ width: "100%", height: 620, border: 0, background: "#fff" }}
          />
        </div>
      ) : (
        <EmailFrame
          from={`${account?.name ?? "You"} <${account?.email ?? ""}>`}
          to={String(to)}
          subject={subjectMerge.text}
          bodyHtml={bodyMerge.text}
        />
      )}

      <ActionBar
        backLabel="Edit"
        onBack={() => nav("/campaign/compose")}
        primary={
          <button className="btn btn-primary" disabled={blocked} onClick={() => nav("/campaign/test")}>
            Continue to test
          </button>
        }
      />
    </div>
  );
}
