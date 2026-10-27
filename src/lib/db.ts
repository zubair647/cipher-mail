// IndexedDB (via idb): larger structured data that must survive a crash —
// per-recipient sent/failed markers, the send log, the suppression list, and a
// daily-send counter for the cap. Recipient personal data is NOT stored here;
// only the fact that an address was already reached for a campaign.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  RecipientRecord,
  SendLogEntry,
  SuppressionEntry,
} from "./types";
import { normalizeEmail } from "./email";

interface CipherDB extends DBSchema {
  recipients: {
    key: string; // `${campaignId}::${email}`
    value: RecipientRecord & { id: string };
    indexes: { "by-campaign": string };
  };
  suppression: {
    key: string; // normalized email
    value: SuppressionEntry;
  };
  sendlog: {
    key: string; // campaignId
    value: SendLogEntry;
  };
  counters: {
    key: string; // `sent::YYYY-MM-DD`
    value: { id: string; count: number };
  };
}

let _db: Promise<IDBPDatabase<CipherDB>> | null = null;

function db() {
  if (!_db) {
    _db = openDB<CipherDB>("cipher-mail", 1, {
      upgrade(d) {
        const r = d.createObjectStore("recipients", { keyPath: "id" });
        r.createIndex("by-campaign", "campaignId");
        d.createObjectStore("suppression", { keyPath: "email" });
        d.createObjectStore("sendlog", { keyPath: "campaignId" });
        d.createObjectStore("counters", { keyPath: "id" });
      },
    });
  }
  return _db;
}

const rid = (campaignId: string, email: string) =>
  `${campaignId}::${normalizeEmail(email)}`;

// ---- recipient markers (idempotent resume) ----
export async function getRecipient(
  campaignId: string,
  email: string
): Promise<RecipientRecord | undefined> {
  return (await db()).get("recipients", rid(campaignId, email));
}

export async function putRecipient(rec: RecipientRecord): Promise<void> {
  await (await db()).put("recipients", { ...rec, id: rid(rec.campaignId, rec.email) });
}

export async function getCampaignRecipients(
  campaignId: string
): Promise<RecipientRecord[]> {
  return (await db()).getAllFromIndex("recipients", "by-campaign", campaignId);
}

/** Set of emails already sent for a campaign — the idempotency guard. */
export async function getSentEmails(campaignId: string): Promise<Set<string>> {
  const recs = await getCampaignRecipients(campaignId);
  return new Set(recs.filter((r) => r.status === "sent").map((r) => normalizeEmail(r.email)));
}

// ---- suppression list ----
export async function getSuppression(): Promise<SuppressionEntry[]> {
  return (await (await db()).getAll("suppression")).sort((a, b) => b.addedAt - a.addedAt);
}
export async function getSuppressionSet(): Promise<Set<string>> {
  return new Set((await (await db()).getAll("suppression")).map((s) => s.email));
}
export async function addSuppression(
  email: string,
  reason: SuppressionEntry["reason"]
): Promise<void> {
  await (await db()).put("suppression", {
    email: normalizeEmail(email),
    reason,
    addedAt: Date.now(),
  });
}

// ---- send log ----
export async function putSendLog(entry: SendLogEntry): Promise<void> {
  await (await db()).put("sendlog", entry);
}
export async function getSendLog(campaignId: string): Promise<SendLogEntry | undefined> {
  return (await db()).get("sendlog", campaignId);
}
export async function getAllSendLogs(): Promise<SendLogEntry[]> {
  return (await (await db()).getAll("sendlog")).sort((a, b) => b.createdAt - a.createdAt);
}

// ---- daily counter (enforces the cap across sessions on the same day) ----
export function todayKey(d = new Date()): string {
  return `sent::${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
export async function getSentToday(): Promise<number> {
  const c = await (await db()).get("counters", todayKey());
  return c?.count ?? 0;
}
export async function bumpSentToday(by = 1): Promise<number> {
  const d = await db();
  const key = todayKey();
  const cur = (await d.get("counters", key))?.count ?? 0;
  const next = cur + by;
  await d.put("counters", { id: key, count: next });
  return next;
}
