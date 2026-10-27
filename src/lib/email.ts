// Email address validation + building the final HTML (with unsubscribe footer).

// Pragmatic RFC-5322-ish check. Good enough to catch the obvious garbage
// (missing @, double @, no domain dot) without rejecting valid addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  const e = (raw || "").trim();
  if (!e || e.length > 254) return false;
  if (e.includes("..")) return false;
  if ((e.match(/@/g) || []).length !== 1) return false;
  return EMAIL_RE.test(e);
}

export function normalizeEmail(raw: string): string {
  return (raw || "").trim().toLowerCase();
}

/**
 * Wrap the composed body in a minimal, email-client-safe shell and append the
 * compliance footer with an unsubscribe link (FR#12 — every email carries one).
 * The unsubscribe link is a mailto in v1 (no hosted URL); the suppression list
 * is what actually enforces it on this machine.
 */
export function buildFinalHtml(bodyHtml: string, mailbox: string): string {
  const unsubscribe = `mailto:${mailbox}?subject=Unsubscribe`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f4f1;">
  <div style="max-width:600px;margin:0 auto;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#232b39;">
    <div style="background:#ffffff;border:1px solid #e7e6e1;border-radius:12px;padding:28px;">
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#8b93a1;margin:18px 4px 0;">
      You're receiving this from CipherSchools.
      <a href="${unsubscribe}" style="color:#8b93a1;">Unsubscribe</a>
    </p>
  </div>
</body></html>`;
}
