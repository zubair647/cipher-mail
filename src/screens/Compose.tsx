import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead, StepNav, ActionBar } from "../components/common";
import { RichTextEditor } from "../components/RichTextEditor";
import { useCampaign } from "../state/CampaignContext";
import { validateTemplateVars } from "../lib/merge";

const STARTER = `<p>Hi {{name | there}},</p><p>You're invited to this week's <strong>{{course}}</strong> live session. We'll cover the core concepts and finish with a live Q&A.</p><p style="text-align:center;margin:18px 0;"><a href="https://cipherschools.com/live" style="display:inline-block;background:#e8912e;color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:9px;">Register now</a></p><p>See you there,<br/>Team CipherSchools</p>`;

export function Compose() {
  const nav = useNavigate();
  const { draft, setCompose } = useCampaign();
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.bodyHtml || STARTER);

  // Persist on change (debounced via effect).
  useEffect(() => { setCompose(subject, body); /* eslint-disable-next-line */ }, [subject, body]);

  const mappedKeys = useMemo(
    () => draft.variables.map((v) => v.key).filter((k) => k !== "email" || true),
    [draft.variables]
  );
  const insertable = draft.variables.filter((v) => v.key !== "email").map((v) => v.key);

  const { unknown } = validateTemplateVars(subject, body, draft.mapping);

  return (
    <div className="container container-wide">
      <StepNav active={3} />
      <ScreenHead eyebrow="Step 4 · FR#5, #6" title="Write the email" />

      <div className="compose-grid">
        <div className="stack-16">
          <div className="stack-8">
            <span className="label">Subject</span>
            <input
              className="input mono"
              placeholder="Your {{course}} schedule"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="stack-8">
            <span className="label">Body</span>
            <RichTextEditor value={body} onChange={setBody} variables={insertable} />
          </div>
        </div>

        <aside className="stack-16">
          <div className="card card-pad stack-12">
            <span className="label">Variable inserter</span>
            <p className="tiny muted">Only lists variables mapped from your CSV — no typos.</p>
            <div className="stack-8">
              {mappedKeys.filter((k) => k !== "email").map((k) => {
                const mapped = !!draft.mapping[k];
                return (
                  <div key={k} className="row-between">
                    <code className="mono" style={{ fontSize: 13 }}>{`{{${k}}}`}</code>
                    <span className={`tiny ${mapped ? "" : "muted"}`} style={{ color: mapped ? "var(--sent)" : undefined }}>
                      {mapped ? "✓ mapped" : "fallback"}
                    </span>
                  </div>
                );
              })}
            </div>
            <hr className="divider" />
            <p className="tiny muted">
              Add a fallback with a pipe: <code className="mono">{"{{name | there}}"}</code>. Cell values are
              auto-escaped so odd characters can't break the layout.
            </p>
          </div>

          {unknown.length > 0 && (
            <div className="banner banner-error">
              <span className="ico">!</span>
              <span>Unknown variable{unknown.length > 1 ? "s" : ""}: {unknown.map((u) => <code key={u} className="mono">{`{{${u}}}`}</code>)}. Fix before preview.</span>
            </div>
          )}
        </aside>
      </div>

      <ActionBar
        onBack={() => nav("/campaign/map")}
        primary={<button className="btn btn-primary" onClick={() => nav("/campaign/preview")}>Preview</button>}
      />
    </div>
  );
}
