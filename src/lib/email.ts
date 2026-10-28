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
 * Build the final email HTML sent to a recipient (FR#12 — every email carries
 * an unsubscribe link). The unsubscribe link is a mailto in v1 (no hosted URL);
 * the local suppression list is what actually enforces it on this machine.
 *
 * Two modes:
 *  - rich (default): wrap the composed body in a minimal, email-safe card shell
 *    and append the compliance footer.
 *  - full HTML: the user pasted a complete HTML email — send it as-is. We only
 *    turn any <unsubscribe>…</unsubscribe> placeholder into a real link, and if
 *    no unsubscribe link is present at all we append a minimal footer.
 */
export function buildFinalHtml(bodyHtml: string, mailbox: string, isHtmlMode = false): string {
  const unsubscribe = `mailto:${mailbox}?subject=Unsubscribe`;

  if (isHtmlMode) {
    let html = bodyHtml;
    // <unsubscribe>Text</unsubscribe>  ->  <a href="mailto:…">Text</a>
    html = html.replace(
      /<unsubscribe>([\s\S]*?)<\/unsubscribe>/gi,
      `<a href="${unsubscribe}" style="color:#9a9a9a;">$1</a>`
    );
    // Guarantee an unsubscribe link exists somewhere (compliance).
    if (!/unsubscribe/i.test(html)) {
      const footer = `<div style="text-align:center;padding:12px;font-size:11px;color:#9a9a9a;font-family:Arial,Helvetica,sans-serif;">You're receiving this from CipherSchools. <a href="${unsubscribe}" style="color:#9a9a9a;">Unsubscribe</a></div>`;
      html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, footer + "</body>") : html + footer;
    }
    return html;
  }

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
