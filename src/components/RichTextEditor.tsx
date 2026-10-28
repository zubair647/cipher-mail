import { useEffect, useRef, useState } from "react";

/**
 * A pragmatic contenteditable editor (bold/italic/underline, headings, lists,
 * alignment, link, image, button, logo, variable insert). Produces clean-ish
 * email HTML. Clicking an existing link or button opens an editor to rename it,
 * change its URL, or delete it. No code is ever typed by the user (FR#5).
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
  const [editor, setEditor] = useState<AnchorEdit | null>(null);

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
      `<p style="text-align:center;margin:18px 0;"><a href="${escapeAttr(url)}" data-cm-button="1" style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:9px;">${escapeText(label)}</a></p><p><br/></p>`
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

  // Click on a link/button -> open the edit popover instead of navigating.
  const onEditorClick = (e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest("a");
    if (anchor && ref.current?.contains(anchor)) {
      e.preventDefault();
      const rect = anchor.getBoundingClientRect();
      setEditor({
        el: anchor as HTMLAnchorElement,
        text: anchor.textContent ?? "",
        url: anchor.getAttribute("href") ?? "",
        isButton: anchor.getAttribute("data-cm-button") === "1",
        top: rect.bottom + 6,
        left: Math.min(rect.left, window.innerWidth - 320),
      });
    }
  };

  const saveAnchor = () => {
    if (!editor) return;
    editor.el.textContent = editor.text || editor.url;
    editor.el.setAttribute("href", editor.url);
    setEditor(null);
    emit();
  };
  const removeAnchor = () => {
    if (!editor) return;
    // Remove the button's wrapping paragraph too, so no empty centered line is left.
    if (editor.isButton && editor.el.parentElement?.tagName === "P") {
      editor.el.parentElement.remove();
    } else {
      editor.el.remove();
    }
    setEditor(null);
    emit();
  };

  return (
    <div className="card" style={{ overflow: "visible", position: "relative" }}>
      <div
        className="row wrap"
        style={{ gap: 4, padding: "10px 12px", borderBottom: "1px solid var(--hairline)", position: "relative" }}
      >
        <ToolBtn label="B" title="Bold" style={{ fontWeight: 800 }} onClick={() => exec("bold")} />
        <ToolBtn label="I" title="Italic" style={{ fontStyle: "italic" }} onClick={() => exec("italic")} />
        <ToolBtn label="U" title="Underline" style={{ textDecoration: "underline" }} onClick={() => exec("underline")} />
        <Sep />
        <ToolBtn label="H" title="Heading" onClick={() => exec("formatBlock", "<h2>")} />
        <ToolBtn label="• List" title="Bullet list" onClick={() => exec("insertUnorderedList")} />
        <ToolBtn label="1. List" title="Numbered list" onClick={() => exec("insertOrderedList")} />
        <Sep />
        <ToolBtn title="Align left" onClick={() => exec("justifyLeft")}><AlignIcon dir="left" /></ToolBtn>
        <ToolBtn title="Align center" onClick={() => exec("justifyCenter")}><AlignIcon dir="center" /></ToolBtn>
        <ToolBtn title="Align right" onClick={() => exec("justifyRight")}><AlignIcon dir="right" /></ToolBtn>
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
              style={{ position: "absolute", right: 0, top: 40, zIndex: 20, width: 230, padding: 12 }}
            >
              <div className="label" style={{ marginBottom: 8 }}>Mapped variables</div>
              {variables.length === 0 && <div className="small muted">Map a CSV first.</div>}
              <div className="stack-8">
                {variables.map((v) => (
                  <button key={v} className="btn-link mono" style={{ textAlign: "left", fontSize: 13 }} onClick={() => insertVar(v)}>
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              <p className="tiny muted" style={{ marginTop: 10 }}>
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
        onClick={onEditorClick}
        style={{ minHeight: 260, padding: "20px 22px", fontSize: 15, lineHeight: 1.65, outline: "none" }}
      />

      <p className="tiny muted" style={{ padding: "0 22px 14px" }}>
        Tip: use the align buttons to center a button — don't use spaces, or it shifts in the email. Click any link
        or button to rename it, change its URL, or delete it.
      </p>

      {editor && (
        <>
          <div onClick={() => setEditor(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            className="card card-pad stack-12"
            style={{ position: "fixed", top: editor.top, left: editor.left, zIndex: 50, width: 300, padding: 16 }}
          >
            <div className="row-between">
              <span className="label">{editor.isButton ? "Edit button" : "Edit link"}</span>
              <button className="chip-x" onClick={() => setEditor(null)}>✕</button>
            </div>
            <div className="stack-4">
              <span className="tiny muted">{editor.isButton ? "Button label" : "Link text"}</span>
              <input className="input" value={editor.text} onChange={(e) => setEditor({ ...editor, text: e.target.value })} />
            </div>
            <div className="stack-4">
              <span className="tiny muted">URL</span>
              <input className="input mono" style={{ fontSize: 12.5 }} value={editor.url} onChange={(e) => setEditor({ ...editor, url: e.target.value })} />
            </div>
            <div className="row-between">
              <button className="btn btn-danger" onClick={removeAnchor}>Delete</button>
              <button className="btn btn-primary" onClick={saveAnchor}>Save</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface AnchorEdit {
  el: HTMLAnchorElement;
  text: string;
  url: string;
  isButton: boolean;
  top: number;
  left: number;
}

function ToolBtn({
  label, title, onClick, style, children,
}: { label?: string; title?: string; onClick: () => void; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <button
      title={title ?? label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        border: "1px solid transparent", background: "transparent", cursor: "pointer",
        padding: "6px 9px", borderRadius: 7, fontSize: 13.5, color: "var(--ink-2)",
        display: "inline-flex", alignItems: "center", gap: 5, ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f3f0")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children ?? label}
    </button>
  );
}

function AlignIcon({ dir }: { dir: "left" | "center" | "right" }) {
  // Row widths: full line, then a shorter line whose x-offset shows the alignment.
  const rows = [14, 8, 14, 8]; // alternating long/short
  const xFor = (w: number, long: boolean) => {
    if (long) return 1;
    if (dir === "left") return 1;
    if (dir === "right") return 15 - w;
    return (16 - w) / 2; // center
  };
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden>
      {rows.map((w, i) => {
        const long = i % 2 === 0;
        return <rect key={i} x={xFor(w, long)} y={1 + i * 3.2} width={w} height="1.6" rx="0.8" fill="currentColor" />;
      })}
    </svg>
  );
}

const Sep = () => <span style={{ width: 1, height: 20, background: "var(--hairline)", margin: "0 4px" }} />;

function escapeAttr(s: string) { return s.replace(/"/g, "&quot;"); }
function escapeText(s: string) { return s.replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
