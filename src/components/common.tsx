import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <img src="/brand-logo.jpeg" alt="CipherSchools" width={size} height={size} style={{ display: "block" }} />
    </span>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <div className="row" style={{ gap: 10 }}>
      <Logo size={size} />
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: size * 0.56, color: "var(--ink)" }}>
        Cipher Mail
      </span>
    </div>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <span
      style={{
        width: 30, height: 30, borderRadius: 8, background: "var(--ink)", color: "#fff",
        display: "inline-grid", placeItems: "center", fontSize: 12.5, fontWeight: 700,
      }}
    >
      {initials}
    </span>
  );
}

/** Top bar used on Home and Settings. */
export function TopBar({ title }: { title: string }) {
  const { account, mock } = useAuth();
  return (
    <div
      className="row-between"
      style={{ padding: "18px 40px", borderBottom: "1px solid var(--hairline)", background: "#fff" }}
    >
      <div className="row" style={{ gap: 12 }}>
        <Logo size={28} />
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16 }}>{title}</span>
        {mock && <span className="chip chip-ghost tiny" style={{ padding: "2px 9px" }}>Demo mode</span>}
      </div>
      {account && (
        <div className="row" style={{ gap: 10 }}>
          <span className="small muted">{account.email}</span>
          <Avatar initials={account.initials} />
        </div>
      )}
    </div>
  );
}

const STEPS = ["Variables", "Upload", "Map", "Write"];

/** The 1·2·3·4 wizard header used on the setup screens. */
export function StepNav({ active }: { active: 0 | 1 | 2 | 3 }) {
  return (
    <div className="row" style={{ gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
      {STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={label} className="row" style={{ gap: 8 }}>
            <span
              className="row"
              style={{
                gap: 7,
                padding: "5px 11px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                background: current ? "var(--orange-tint)" : "transparent",
                color: current ? "var(--orange-pressed)" : done ? "var(--sent)" : "var(--muted-2)",
              }}
            >
              <span
                style={{
                  width: 18, height: 18, borderRadius: "50%", display: "inline-grid", placeItems: "center",
                  fontSize: 11, color: "#fff",
                  background: current ? "var(--orange)" : done ? "var(--sent)" : "var(--muted-2)",
                }}
              >
                {done ? "✓" : i + 1}
              </span>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="muted-2" style={{ fontSize: 12 }}>›</span>}
          </div>
        );
      })}
    </div>
  );
}

export function ScreenHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: ReactNode }) {
  return (
    <div className="screen-head stack-8">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {sub && <p className="muted" style={{ fontSize: 15, maxWidth: 560 }}>{sub}</p>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    sent: { cls: "st-sent", label: "Sent" },
    failed: { cls: "st-failed", label: "Failed" },
    skipped: { cls: "st-skipped", label: "Skipped" },
    sending: { cls: "st-sending", label: "Sending now" },
    queued: { cls: "st-queued", label: "Queued" },
    unsubscribed: { cls: "st-skipped", label: "Unsubscribed" },
    invalid: { cls: "st-skipped", label: "Invalid" },
    duplicate: { cls: "st-skipped", label: "Duplicate" },
  };
  const s = map[status] ?? map.queued;
  return (
    <span className={`status-pill ${s.cls}`}>
      <span className="dot" />
      {s.label}
    </span>
  );
}

/** Sticky footer with a back link + one primary action (calm, one primary/screen). */
export function ActionBar({
  backLabel = "Back",
  onBack,
  primary,
}: {
  backLabel?: string;
  onBack?: () => void;
  primary: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div className="row-between" style={{ marginTop: 28 }}>
      {onBack ? (
        <button className="btn-link" onClick={onBack}>‹ {backLabel}</button>
      ) : (
        <button className="btn-link" onClick={() => nav(-1)}>‹ {backLabel}</button>
      )}
      <div className="row" style={{ gap: 10 }}>{primary}</div>
    </div>
  );
}
