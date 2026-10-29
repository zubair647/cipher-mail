import { useEffect, useRef, useState } from "react";
import { IconChevronDown } from "./common";

/**
 * A pragmatic contenteditable editor (bold/italic/underline, alignment, lists,
 * link, image, button, logo, variable insert). Produces clean-ish email HTML.
 * Clicking an existing link/button opens an editor to rename it, change its URL,
 * or delete it. No code is ever typed by the user (FR#5).
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
    if (editor.isButton && editor.el.parentElement?.tagName === "P") {
      editor.el.parentElement.remove();
    } else {
      editor.el.remove();
    }
    setEditor(null);
    emit();
  };

  return (
    <div style={{ position: "relative" }}>
      <div className="tbar">
        <Tb title="Bold" onClick={() => exec("bold")}><b style={{ fontWeight: 800 }}>B</b></Tb>
        <Tb title="Italic" onClick={() => exec("italic")}><b style={{ fontStyle: "italic", fontWeight: 600 }}>I</b></Tb>
        <Tb title="Underline" onClick={() => exec("underline")}><b style={{ textDecoration: "underline", fontWeight: 600 }}>U</b></Tb>
        <span className="div" />
        <Tb title="Align left" onClick={() => exec("justifyLeft")}><AlignIcon dir="left" /></Tb>
        <Tb title="Align center" onClick={() => exec("justifyCenter")}><AlignIcon dir="center" /></Tb>
        <Tb title="Align right" onClick={() => exec("justifyRight")}><AlignIcon dir="right" /></Tb>
        <span className="div" />
        <Tb title="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
        </Tb>
        <Tb title="Link" onClick={addLink}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
        </Tb>
        <Tb title="Image" onClick={addImage}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
        </Tb>
        <Tb title="Button" onClick={addButton}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="8" rx="4" /></svg>
        </Tb>
        <Tb title="Logo" onClick={addLogo}>Logo</Tb>
        <span className="sp" />
        <div className="dropwell">
          <button className="tb ins" onClick={() => setShowVars((s) => !s)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            Insert variable
            <IconChevronDown s={12} />
          </button>
          {showVars && (
            <div className="dropmenu" style={{ right: 0, top: 42 }}>
              {variables.length === 0 && <div style={{ padding: "8px 11px", fontSize: 13, color: "var(--gray-2)" }}>Map a CSV first.</div>}
              {variables.map((v) => (
                <button key={v} onClick={() => insertVar(v)}>{`{{${v}}}`}</button>
              ))}
              <p style={{ fontSize: 11.5, color: "var(--gray-2)", margin: "8px 11px 2px", lineHeight: 1.5 }}>
                Fallback with a pipe: <span className="mono">{"{{name | there}}"}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        ref={ref}
        className="edit"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onClick={onEditorClick}
      />

      <p style={{ fontSize: 12, color: "var(--gray-2)", margin: "10px 2px 0", lineHeight: 1.5 }}>
        Use the align buttons to center a button — don't use spaces, or it shifts in the email. Click any link or button to rename it, change its URL, or delete it.
      </p>

      {editor && (
        <>
          <div onClick={() => setEditor(null)} style={{ position: "fixed", inset: 0, zIndex: 110 }} />
          <div className="popover" style={{ top: editor.top, left: editor.left }}>
            <div className="rowb" style={{ marginBottom: 12 }}>
              <span className="lbl" style={{ margin: 0 }}>{editor.isButton ? "Edit button" : "Edit link"}</span>
              <button className="linkbtn" style={{ color: "var(--gray-2)" }} onClick={() => setEditor(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "var(--gray-2)", display: "block", marginBottom: 5 }}>{editor.isButton ? "Button label" : "Link text"}</span>
              <input className="input" style={{ height: 42 }} value={editor.text} onChange={(e) => setEditor({ ...editor, text: e.target.value })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "var(--gray-2)", display: "block", marginBottom: 5 }}>URL</span>
              <input className="input mono" style={{ height: 42, fontSize: 12.5 }} value={editor.url} onChange={(e) => setEditor({ ...editor, url: e.target.value })} />
            </div>
            <div className="rowb">
              <button className="btn btn-line btn-sm" style={{ color: "var(--red)" }} onClick={removeAnchor}>Delete</button>
              <button className="btn btn-pri btn-sm" onClick={saveAnchor}>Save</button>
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

function Tb({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="tb" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

function AlignIcon({ dir }: { dir: "left" | "center" | "right" }) {
  const rows = [14, 8, 14, 8];
  const xFor = (w: number, long: boolean) => {
    if (long) return 1;
    if (dir === "left") return 1;
    if (dir === "right") return 15 - w;
    return (16 - w) / 2;
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

function escapeAttr(s: string) { return s.replace(/"/g, "&quot;"); }
function escapeText(s: string) { return s.replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
