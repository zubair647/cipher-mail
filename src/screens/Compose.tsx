import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead, StepNav, ActionBar } from "../components/common";
import { RichTextEditor } from "../components/RichTextEditor";
import { useCampaign } from "../state/CampaignContext";
import { validateTemplateVars } from "../lib/merge";

const STARTER = `<p>Hi {{name | there}},</p><p>You're invited to this week's <strong>{{course}}</strong> live session. We'll cover the core concepts and finish with a live Q&A.</p><p style="text-align:center;margin:18px 0;"><a href="https://cipherschools.com/live" data-cm-button="1" style="display:inline-block;background:#e8912e;color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:9px;">Register now</a></p><p>See you there,<br/>Team CipherSchools</p>`;

export function Compose() {
  const nav = useNavigate();
  const { draft, setCompose, setHtmlMode } = useCampaign();
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.bodyHtml || (draft.isHtmlMode ? "" : STARTER));
  const htmlMode = draft.isHtmlMode;

  // Persist on change.
  useEffect(() => { setCompose(subject, body); /* eslint-disable-next-line */ }, [subject, body]);

  const insertable = draft.variables.filter((v) => v.key !== "email").map((v) => v.key);
  const mappedKeys = draft.variables.map((v) => v.key);
  const { unknown } = validateTemplateVars(subject, body, draft.mapping);

  return (
    <div className="container container-wide">
      <StepNav active={3} />
      <ScreenHead eyebrow="Step 4 · FR#5, #6" title="Write the email" />

      {/* Rich / HTML mode toggle */}
      <div className="row" style={{ gap: 8, marginBottom: 20 }}>
        <ModeBtn active={!htmlMode} onClick={() => setHtmlMode(false)}>Rich editor</ModeBtn>
        <ModeBtn active={htmlMode} onClick={() => setHtmlMode(true)}>Paste HTML</ModeBtn>
      </div>

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
            {htmlMode ? (
              <textarea
                className="textarea mono"
                spellCheck={false}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="<!doctype html> … paste your full HTML email here"
                style={{ minHeight: 420, fontSize: 12.5, lineHeight: 1.55, resize: "vertical" }}
              />
            ) : (
              <RichTextEditor value={body} onChange={setBody} variables={insertable} />
            )}
          </div>
        </div>

        <aside className="stack-16">
          {htmlMode ? (
            <div className="card card-pad stack-12">
              <span className="label">Paste HTML mode</span>
              <p className="tiny muted">
                Your HTML is sent <strong>exactly as pasted</strong> — banners, tables, styles and all.
              </p>
              <ul className="tiny muted" style={{ margin: 0, paddingLeft: 16, lineHeight: 1.7 }}>
                <li>Personalize with <code className="mono">{"{{name}}"}</code> anywhere in the HTML (replace <code>[First&nbsp;name]</code>).</li>
                <li>Use <code className="mono">{"<unsubscribe>Unsubscribe here</unsubscribe>"}</code> and we turn it into a working link.</li>
                <li>If you add no unsubscribe link, we append a small compliant one.</li>
                <li>Preview renders it in a real email frame; always do a test send.</li>
              </ul>
            </div>
          ) : (
            <div className="card card-pad stack-12">
              <span className="label">Variable inserter</span>
              <p className="tiny muted">Only lists variables mapped from your CSV — no typos.</p>
              <div className="stack-8">
                {mappedKeys.filter((k) => k !== "email").map((k) => {
                  const mapped = !!draft.mapping[k];
                  return (
                    <div key={k} className="row-between">
                      <code className="mono" style={{ fontSize: 13 }}>{`{{${k}}}`}</code>
                      <span className="tiny" style={{ color: mapped ? "var(--sent)" : "var(--muted)" }}>
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
          )}

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

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="btn"
      style={{
        background: active ? "var(--ink)" : "#fff",
        color: active ? "#fff" : "var(--ink-2)",
        borderColor: active ? "var(--ink)" : "var(--hairline)",
        fontSize: 13.5,
      }}
    >
      {children}
    </button>
  );
}
