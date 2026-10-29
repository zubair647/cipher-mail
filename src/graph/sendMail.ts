// Microsoft Graph sendMail, plus a mock sender for local runs. Returns a typed
// result so the engine can react to rate-limits (429) and permanent failures.

import { GRAPH_SENDMAIL } from "../auth/msalConfig";
import { getToken, isMock } from "../auth/authProvider";

export type SendOutcome =
  | { ok: true }
  | { ok: false; retryAfterSec: number }                      // 429 — slow down
  | { ok: false; authExpired: true; error?: string }          // 401/403 — re-auth / consent needed
  | { ok: false; hardBounce: true; error: string }            // permanent recipient failure
  | { ok: false; error: string };                             // transient/other failure

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(mail: OutgoingMail): Promise<SendOutcome> {
  if (isMock()) return mockSend(mail);
  return realSend(mail);
}

async function realSend(mail: OutgoingMail): Promise<SendOutcome> {
  let token: string;
  try {
    token = await getToken();
  } catch (e) {
    const m = (e as Error).message?.trim();
    return {
      ok: false,
      authExpired: true,
      error: m ? `Could not get a Microsoft token: ${m}` : "Microsoft needs an interactive sign-in to authorize sending.",
    };
  }

  let res: Response;
  try {
    res = await fetch(GRAPH_SENDMAIL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: mail.subject,
          body: { contentType: "HTML", content: mail.html },
          toRecipients: [{ emailAddress: { address: mail.to } }],
        },
        saveToSentItems: true,
      }),
    });
  } catch (e) {
    return { ok: false, error: `Network error: ${(e as Error).message}` };
  }

  if (res.status === 202 || res.ok) return { ok: true };

  if (res.status === 429) {
    const ra = Number(res.headers.get("Retry-After"));
    return { ok: false, retryAfterSec: Number.isFinite(ra) && ra > 0 ? ra : 30 };
  }

  // Read the Graph error detail once so every failure can report a real reason.
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    detail = body?.error?.message || detail;
  } catch {
    /* ignore */
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, authExpired: true, error: detail };
  }

  // Treat recipient-not-found style errors as hard bounces for suppression.
  const low = detail.toLowerCase();
  if (low.includes("recipient") && (low.includes("not found") || low.includes("invalid"))) {
    return { ok: false, hardBounce: true, error: detail };
  }
  return { ok: false, error: detail };
}

// ---- mock: realistic outcomes so the engine/UI are fully exercisable ----
let mockCount = 0;
async function mockSend(mail: OutgoingMail): Promise<SendOutcome> {
  await delay(250 + Math.random() * 400);
  mockCount++;
  // Occasional transient 429 to prove back-off handling.
  if (mockCount % 23 === 0) return { ok: false, retryAfterSec: 5 };
  // Deterministic hard bounce for obvious junk addresses.
  if (/@domain\.com$|@@|@xyz\.io$/.test(mail.to)) {
    return { ok: false, hardBounce: true, error: "Mock: recipient mailbox not found." };
  }
  // ~4% random transient failure.
  if (Math.random() < 0.04) return { ok: false, error: "Mock: temporary send failure." };
  return { ok: true };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
