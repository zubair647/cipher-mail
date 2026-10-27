// Microsoft Graph sendMail wrapper. One mailbox, delegated Mail.Send.
// In mock mode, sending is simulated: a short delay, a rare synthetic failure,
// and a rare synthetic 429 to exercise the back-off path — no network call.

import { config } from './config';
import { getAccessToken } from './auth';

const GRAPH_SEND = 'https://graph.microsoft.com/v1.0/me/sendMail';

export interface SendMailInput {
  to: string;
  subject: string;
  bodyHtml: string;
  /** Standards-compliant one-click unsubscribe header value (a mailto:). */
  listUnsubscribe?: string;
}

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`Rate limited; retry after ${retryAfterSeconds}s`);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Sends one email. Throws RateLimitError on a 429 so the engine can back off. */
export async function sendMail(input: SendMailInput): Promise<void> {
  if (config.isMockMode) return mockSend(input);

  const token = await getAccessToken();
  const message: Record<string, unknown> = {
    subject: input.subject,
    body: { contentType: 'HTML', content: input.bodyHtml },
    toRecipients: [{ emailAddress: { address: input.to } }],
  };
  if (input.listUnsubscribe) {
    message.internetMessageHeaders = [
      { name: 'List-Unsubscribe', value: input.listUnsubscribe },
      { name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
    ];
  }

  const res = await fetch(GRAPH_SEND, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '30');
    throw new RateLimitError(Number.isFinite(retryAfter) ? retryAfter : 30);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Graph sendMail failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

// ── Mock sending ─────────────────────────────────────────────────────────────

let mockSendCount = 0;

async function mockSend(input: SendMailInput): Promise<void> {
  await delay(250 + Math.random() * 400);
  mockSendCount += 1;
  // ~1 in 25 a synthetic 429 to prove the back-off path works.
  if (mockSendCount % 25 === 0) throw new RateLimitError(3);
  // ~1 in 40 a synthetic hard failure so "failed" status is visible.
  if (Math.random() < 0.025) throw new Error(`Mock delivery failed for ${input.to}`);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
