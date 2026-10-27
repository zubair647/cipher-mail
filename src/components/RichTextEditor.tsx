import { useEffect, useRef, useState } from "react";

/**
 * A pragmatic contenteditable editor (bold/italic/underline, lists, link,
 * image, button, logo, variable insert). Produces clean-ish email HTML. No
 * code is ever typed by the user — they format visually (FR#5, Appendix A).
 */
export function RichTextEditor({
  value,
  onChange,
  variables,
  brandColor = "#e8912e",
}: {
  value: string;
  onChange: (html: string) => void;
  variables: string[];
  brandColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showVars, setShowVars] = useState(false);

  // Initialize once; after that the DOM is the source of truth (avoids caret jumps).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current?.innerHTML ?? "");

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const insertHtml = (html: string) => {
    ref.current?.focus();
    document.execCommand("insertHTML", false, html);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)", "https://cipherschools.com/live");
    if (url) exec("createLink", url);
  };

  const addButton = () => {
    const label = window.prompt("Button label", "Register now");
    if (!label) return;
    const url = window.prompt("Button URL (https://…)", "https://cipherschools.com/live");
    if (!url) return;
    insertHtml(
      `<p style="text-align:center;margin:18px 0;"><a href="${escapeAttr(url)}" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:9px;">${escapeText(label)}</a></p>&nbsp;`
    );
  };

  const addImage = () => {
    const url = window.prompt("Image URL (https://…)");
    if (url) insertHtml(`<img src="${escapeAttr(url)}" alt="" style="max-width:100%;border-radius:8px;" />`);
  };

  const addLogo = () => {
    insertHtml(
      `<p style="text-align:center;margin:4px 0 14px;"><img src="${window.location.origin}/brand-logo.jpeg" alt="CipherSchools" width="48" height="48" style="border-radius:10px;" /></p>`
    );
  };

  const insertVar = (key: string) => {
    insertHtml(`{{${key}}} `);
    setShowVars(false);
  };

  return (
    <div className="card" style={{ overflow: "visible" }}>
      <div
        className="row wrap"
        style={{ gap: 4, padding: "8px 10px", borderBottom: "1px solid var(--hairline)", position: "relative" }}
      >
        <ToolBtn label="B" title="Bold" style={{ fontWeight: 800 }} onClick={() => exec("bold")} />
        <ToolBtn label="I" title="Italic" style={{ fontStyle: "italic" }} onClick={() => exec("italic")} />
        <ToolBtn label="U" title="Underline" style={{ textDecoration: "underline" }} onClick={() => exec("underline")} />
        <Sep />
        <ToolBtn label="H" title="Heading" onClick={() => exec("formatBlock", "<h2>")} />
        <ToolBtn label="• List" title="Bullet list" onClick={() => exec("insertUnorderedList")} />
        <ToolBtn label="1. List" title="Numbered list" onClick={() => exec("insertOrderedList")} />
        <ToolBtn label="❝" title="Center" onClick={() => exec("justifyCenter")} />
        <Sep />
        <ToolBtn label="🔗 Link" onClick={addLink} />
        <ToolBtn label="Button" onClick={addButton} />
        <ToolBtn label="🖼 Image" onClick={addImage} />
        <ToolBtn label="Logo" onClick={addLogo} />
        <div className="spacer" />
        <div style={{ position: "relative" }}>
          <button className="btn btn-subtle" style={{ padding: "6px 12px", fontSize: 13 }} onClick={() => setShowVars((s) => !s)}>
            Insert variable ▾
          </button>
          {showVars && (
            <div
              className="card card-pad"
              style={{ position: "absolute", right: 0, top: 38, zIndex: 20, width: 230, padding: 10 }}
            >
              <div className="label" style={{ marginBottom: 8 }}>Mapped variables</div>
              {variables.length === 0 && <div className="small muted">Map a CSV first.</div>}
              <div className="stack-4">
                {variables.map((v) => (
                  <button key={v} className="btn-link mono" style={{ textAlign: "left", fontSize: 13 }} onClick={() => insertVar(v)}>
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              <p className="tiny muted" style={{ marginTop: 8 }}>
                Add a fallback with a pipe: <code>{"{{name | there}}"}</code>
              </p>
            </div>
          )}
        </div>
      </div>
      <div
        ref={ref}
        className="rte-body"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        style={{
          minHeight: 220,
          padding: "16px 18px",
          fontSize: 15,
          lineHeight: 1.6,
          outline: "none",
        }}
      />
    </div>
  );
}

function ToolBtn({
  label, title, onClick, style,
}: { label: string; title?: string; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      title={title ?? label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        border: "1px solid transparent", background: "transparent", cursor: "pointer",
        padding: "6px 9px", borderRadius: 7, fontSize: 13.5, color: "var(--ink-2)", ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f3f0")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}
const Sep = () => <span style={{ width: 1, height: 20, background: "var(--hairline)", margin: "0 4px" }} />;

function escapeAttr(s: string) { return s.replace(/"/g, "&quot;"); }
function escapeText(s: string) { return s.replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
