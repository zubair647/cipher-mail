/** Renders merged email HTML inside the recipient-facing card shell + footer. */
export function EmailFrame({
  from,
  to,
  subject,
  bodyHtml,
}: {
  from: string;
  to: string;
  subject: string;
  bodyHtml: string;
}) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--hairline)", background: "#faf9f6" }}>
        <div className="tiny muted">From: {from} · To: {to}</div>
        <div style={{ fontWeight: 600, marginTop: 4, fontSize: 15 }}>{subject || <span className="muted">(no subject)</span>}</div>
      </div>
      <div style={{ background: "var(--ground)", padding: 20 }}>
        <div
          style={{
            background: "#fff", border: "1px solid var(--hairline)", borderRadius: 12,
            padding: 24, fontSize: 15, lineHeight: 1.6, color: "var(--ink)",
          }}
          dangerouslySetInnerHTML={{ __html: bodyHtml || "<p style='color:#8b93a1'>Nothing written yet.</p>" }}
        />
        <p className="tiny" style={{ color: "var(--muted-2)", margin: "14px 4px 0" }}>
          You're receiving this from CipherSchools. <a href="#" onClick={(e) => e.preventDefault()} style={{ color: "var(--muted-2)" }}>Unsubscribe</a>
        </p>
      </div>
    </div>
  );
}
