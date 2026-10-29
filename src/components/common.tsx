import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

/* ---- brand ------------------------------------------------------------- */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect width="48" height="48" rx="13" fill="#1f2733" />
      <path d="M33.5 14.5a12.5 12.5 0 1 0 0 19" fill="none" stroke="#e8912e" strokeWidth="7" strokeLinecap="round" />
      <path d="M36 18.5a8.6 8.6 0 0 1 0 11" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="brand" style={{ cursor: "default" }}>
      <BrandMark size={size} /> Cipher Mail
    </span>
  );
}

export function Avatar({ initials, size = 30 }: { initials: string; size?: number }) {
  return (
    <span className="av" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
}

/* ---- app shell: translucent top nav + page ----------------------------- */
export function Shell({
  active,
  children,
}: {
  active?: "home" | "templates" | "settings";
  children: ReactNode;
}) {
  const nav = useNavigate();
  const { account, mock } = useAuth();
  return (
    <div className="main">
      <nav className="nav">
        <button className="brand" onClick={() => nav("/")}>
          <BrandMark size={28} /> Cipher Mail
        </button>
        <span className="links">
          <a className={active === "home" ? "on" : ""} onClick={() => nav("/")}>Home</a>
          <a className={active === "templates" ? "on" : ""} onClick={() => nav("/templates")}>Campaigns</a>
          <a className={active === "settings" ? "on" : ""} onClick={() => nav("/settings")}>Settings</a>
        </span>
        <span className="sp" />
        <span className="acct">
          {mock && <span className="pill" style={{ padding: "4px 10px" }}>Demo</span>}
          {account && <span className="email-txt">{account.email}</span>}
          {account && <Avatar initials={account.initials} />}
        </span>
      </nav>
      {children}
    </div>
  );
}

/* ---- segmented wizard stepper ------------------------------------------ */
const STEPS = ["Variables", "Upload", "Map", "Write"];
export function Stepper({ active }: { active: 0 | 1 | 2 | 3 }) {
  return (
    <div className="steps">
      {STEPS.map((label, i) => {
        const cls = i < active ? "done" : i === active ? "now" : "";
        return (
          <span key={label} className={`s ${cls}`}>
            <span className="d">{i < active ? "✓" : i + 1}</span>
            {label}
          </span>
        );
      })}
    </div>
  );
}

/* ---- masthead (step label + title + lead) ------------------------------ */
export function Masthead({
  label,
  title,
  sub,
  right,
}: {
  label?: string;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  if (right) {
    return (
      <div className="masthead rowb" style={{ alignItems: "flex-end" }}>
        <div>
          {label && <span className="lbl">{label}</span>}
          <h2 className="h2" style={{ margin: 0 }}>{title}</h2>
          {sub && <p className="lead" style={{ marginTop: 8 }}>{sub}</p>}
        </div>
        {right}
      </div>
    );
  }
  return (
    <div className="masthead">
      {label && <span className="lbl">{label}</span>}
      <h2 className="h2">{title}</h2>
      {sub && <p className="lead">{sub}</p>}
    </div>
  );
}

/* ---- step footer (back + primary actions) ------------------------------ */
export function StepFoot({
  backLabel = "Back",
  onBack,
  children,
}: {
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div className="stepfoot">
      <button className="btn btn-ghost" onClick={onBack ?? (() => nav(-1))}>‹ {backLabel}</button>
      <div className="row" style={{ gap: 10 }}>{children}</div>
    </div>
  );
}

/* ---- status badge ------------------------------------------------------ */
const BADGE: Record<string, { cls: string; label: string }> = {
  sent: { cls: "b-sent", label: "Sent" },
  failed: { cls: "b-fail", label: "Failed" },
  sending: { cls: "b-send", label: "Sending" },
  queued: { cls: "b-queue", label: "Queued" },
  skipped: { cls: "b-skip", label: "Skipped" },
  unsubscribed: { cls: "b-skip", label: "Unsubscribed" },
  invalid: { cls: "b-skip", label: "Invalid" },
  duplicate: { cls: "b-skip", label: "Duplicate" },
};
export function StatusBadge({ status }: { status: string }) {
  const s = BADGE[status] ?? BADGE.queued;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

/* ---- note (info / ok / warn / err) ------------------------------------- */
export function Note({
  kind,
  children,
  bare,
  style,
}: {
  kind: "info" | "ok" | "warn" | "err";
  children: ReactNode;
  bare?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`note ${kind} ${bare ? "bare" : ""}`} style={style}>
      <NoteIcon kind={kind} />
      <span>{children}</span>
    </div>
  );
}
function NoteIcon({ kind }: { kind: "info" | "ok" | "warn" | "err" }) {
  if (kind === "ok")
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>;
  if (kind === "warn")
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>;
  if (kind === "err")
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent-600)" }}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
}

/* ---- mail preview window ----------------------------------------------- */
export function MailWindow({
  from,
  to,
  subject,
  bodyHtml,
  footer = true,
  shadow,
  compact,
}: {
  from?: string;
  to: string;
  subject: string;
  bodyHtml: string;
  footer?: boolean;
  shadow?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="mailwin" style={{ boxShadow: shadow ? "var(--sh-sm)" : "none" }}>
      <div className="mailhd" style={compact ? { padding: "14px 16px" } : undefined}>
        <span className="meta">{from ? `From: ${from} · ` : ""}To: {to}</span>
        <span className="sub" style={compact ? { fontSize: 15 } : undefined}>
          {subject || <span className="faint">(no subject)</span>}
        </span>
      </div>
      <div
        className="mailbody"
        style={compact ? { padding: "18px 18px", fontSize: 14 } : undefined}
        dangerouslySetInnerHTML={{ __html: bodyHtml || "<p style='color:#aeaeb2'>Nothing written yet.</p>" }}
      />
      {footer && (
        <div className="mailbody" style={{ padding: "0 26px 22px" }}>
          <p className="mail-foot">
            You're receiving this from CipherSchools. <a href="#" onClick={(e) => e.preventDefault()}>Unsubscribe</a>
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- small shared icons ------------------------------------------------ */
export const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
);
export const IconChevronDown = ({ s = 12 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
);
export const IconMail = ({ s = 20 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 7 12 13 2 7" /><rect x="2" y="5" width="20" height="14" rx="2" /></svg>
);
