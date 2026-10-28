// The sending engine (FR#10, #11). Throttled, idempotent, pausable/resumable,
// cap-aware, with automatic 429 back-off. Everything that must survive a crash
// is written to IndexedDB as it happens, so a close/crash resumes with no
// double-send.
//
// Pacing: ~5–50s random gaps in real mode (a batch of 100 ~ 100 min). In mock
// mode the gaps are compressed so the whole flow is testable in a minute or two
// — the randomness, widening, cap and back-off logic are identical.

import { sendMail } from "../graph/sendMail";
import { isMock } from "../auth/authProvider";
import { buildFinalHtml } from "../lib/email";
import {
  addSuppression,
  bumpSentToday,
  getSentEmails,
  getSentToday,
  putRecipient,
  putSendLog,
} from "../lib/db";
import { HARD_CEILING, type RecipientRecord, type SendLogEntry } from "../lib/types";

const REAL_GAP = { min: 5000, max: 50000 };
const MOCK_GAP = { min: 800, max: 3000 };

export interface PlannedRecipient {
  email: string;
  mergedSubject: string;
  bodyHtml: string; // already merged + escaped for this recipient
  // pre-send skip (invalid/duplicate/unsubscribed) resolved by the caller:
  preSkip?: "invalid" | "duplicate" | "unsubscribed" | null;
}

export interface EnginePlan {
  campaignId: string;
  templateName: string;
  subjectTemplate: string;
  mailbox: string;
  dailyCap: number;
  isHtmlMode: boolean;
  recipients: PlannedRecipient[];
}

export type EngineStatus =
  | "idle"
  | "sending"
  | "paused"
  | "auth-expired"
  | "done"
  | "cancelled";

export interface EngineSnapshot {
  status: EngineStatus;
  rows: RecipientRecord[];
  counts: { sent: number; failed: number; skipped: number; queued: number };
  sentToday: number;
  dailyCap: number;
  totalRecipients: number;
  sendableTotal: number;   // not pre-skipped
  remainingTotal: number;  // sendable not yet sent
  todaysAllowance: number;
  sentThisRun: number;
  nextInSec: number | null;
  pacingWidened: boolean;
  capReached: boolean;
  pausedAtIndex: number | null;
}

type Listener = (s: EngineSnapshot) => void;

export class SendEngine {
  private plan: EnginePlan;
  private rows: RecipientRecord[] = [];
  private listeners = new Set<Listener>();
  private status: EngineStatus = "idle";
  private widenFactor = 1;          // grows on provider strain
  private pacingWidened = false;
  private nextInSec: number | null = null;
  private sentToday = 0;
  private sentThisRun = 0;
  private cancelFlag = false;
  private tickTimer: number | null = null;
  private cursor = 0;               // index into this.rows

  constructor(plan: EnginePlan) {
    this.plan = plan;
    this.rows = plan.recipients.map((r) => ({
      campaignId: plan.campaignId,
      email: r.email,
      mergedSubject: r.mergedSubject,
      status: r.preSkip ? "skipped" : "queued",
      skipReason: r.preSkip ?? null,
    }));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private gap() {
    return isMock() ? MOCK_GAP : REAL_GAP;
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((l) => l(s));
  }

  snapshot(): EngineSnapshot {
    const counts = {
      sent: this.rows.filter((r) => r.status === "sent").length,
      failed: this.rows.filter((r) => r.status === "failed").length,
      skipped: this.rows.filter((r) => r.status === "skipped").length,
      queued: this.rows.filter((r) => r.status === "queued").length,
    };
    const sendable = this.rows.filter((r) => r.skipReason === null);
    const remaining = sendable.filter((r) => r.status !== "sent").length;
    const allowance = Math.min(
      this.plan.dailyCap,
      HARD_CEILING,
      Math.max(0, Math.min(this.plan.dailyCap, HARD_CEILING) - this.sentToday + this.sentThisRun)
    );
    const capReached = this.sentToday >= Math.min(this.plan.dailyCap, HARD_CEILING);
    return {
      status: this.status,
      rows: this.rows,
      counts,
      sentToday: this.sentToday,
      dailyCap: Math.min(this.plan.dailyCap, HARD_CEILING),
      totalRecipients: this.rows.length,
      sendableTotal: sendable.length,
      remainingTotal: remaining,
      todaysAllowance: allowance,
      sentThisRun: this.sentThisRun,
      nextInSec: this.nextInSec,
      pacingWidened: this.pacingWidened,
      capReached,
      pausedAtIndex: this.status === "paused" ? this.cursor + 1 : null,
    };
  }

  /** Begin or resume sending. Safe to call again after pause/auth-expired. */
  async start(): Promise<void> {
    if (this.status === "sending") return;
    this.cancelFlag = false;
    this.status = "sending";

    // Idempotency: reconcile against markers already in IndexedDB.
    const alreadySent = await getSentEmails(this.plan.campaignId);
    for (const r of this.rows) {
      if (alreadySent.has(r.email.toLowerCase()) && r.status !== "sent") {
        r.status = "sent";
      }
    }
    this.sentToday = await getSentToday();
    this.emit();

    await this.loop();
  }

  pause(): void {
    if (this.status === "sending") {
      this.status = "paused";
      this.clearTick();
      this.nextInSec = null;
      this.emit();
    }
  }

  cancel(): void {
    this.cancelFlag = true;
    this.status = "cancelled";
    this.clearTick();
    this.nextInSec = null;
    this.emit();
  }

  private clearTick() {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private nextSendableIndex(from: number): number {
    for (let i = from; i < this.rows.length; i++) {
      if (this.rows[i].status === "queued") return i;
    }
    return -1;
  }

  private async loop(): Promise<void> {
    while (this.status === "sending" && !this.cancelFlag) {
      // Day cap check — stop for the day, hold the rest.
      const capToday = Math.min(this.plan.dailyCap, HARD_CEILING);
      if (this.sentToday >= capToday) {
        await this.finishForDay();
        return;
      }

      const idx = this.nextSendableIndex(0);
      if (idx === -1) {
        await this.finishAll();
        return;
      }
      this.cursor = idx;
      const row = this.rows[idx];

      row.status = "sending";
      this.emit();

      const outcome = await sendMail({
        to: row.email,
        subject: row.mergedSubject,
        html: buildFinalHtml(this.plan.recipients[idx].bodyHtml, this.plan.mailbox, this.plan.isHtmlMode),
      });

      if (this.cancelFlag) {
        row.status = "queued";
        return;
      }

      if (outcome.ok) {
        row.status = "sent";
        row.timeLabel = timeLabel();
        row.sentAt = Date.now();
        await putRecipient(row);
        this.sentToday = await bumpSentToday(1);
        this.sentThisRun++;
        // success relaxes pacing a touch
        this.widenFactor = Math.max(1, this.widenFactor * 0.9);
        this.pacingWidened = this.widenFactor > 1.05;
      } else if ("retryAfterSec" in outcome) {
        // 429 — obey Retry-After exactly, widen pacing, retry same recipient.
        row.status = "queued";
        this.widenFactor = Math.min(6, this.widenFactor * 1.6);
        this.pacingWidened = true;
        this.emit();
        await this.wait(outcome.retryAfterSec * 1000);
        continue;
      } else if ("authExpired" in outcome) {
        row.status = "queued";
        this.status = "auth-expired";
        this.clearTick();
        this.nextInSec = null;
        this.emit();
        return;
      } else if ("hardBounce" in outcome) {
        row.status = "failed";
        row.error = outcome.error;
        row.timeLabel = timeLabel();
        await putRecipient(row);
        await addSuppression(row.email, "hard-bounce");
      } else {
        row.status = "failed";
        row.error = outcome.error;
        row.timeLabel = timeLabel();
        await putRecipient(row);
      }

      this.emit();
      await this.persistLog();

      // If the cap is now reached, stop for the day.
      if (this.sentToday >= capToday) {
        await this.finishForDay();
        return;
      }
      // Any more to send? pace before the next one.
      if (this.nextSendableIndex(0) === -1) {
        await this.finishAll();
        return;
      }
      const { min, max } = this.gap();
      const base = min + Math.random() * (max - min);
      await this.wait(Math.round(base * this.widenFactor));
    }
  }

  /** Wait with a live countdown, respecting pause/cancel. */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let remaining = Math.ceil(ms / 1000);
      this.nextInSec = remaining;
      this.emit();
      this.clearTick();
      this.tickTimer = window.setInterval(() => {
        if (this.status !== "sending" || this.cancelFlag) {
          this.clearTick();
          resolve();
          return;
        }
        remaining -= 1;
        this.nextInSec = Math.max(0, remaining);
        this.emit();
        if (remaining <= 0) {
          this.clearTick();
          this.nextInSec = null;
          resolve();
        }
      }, 1000);
    });
  }

  private async persistLog(): Promise<void> {
    const s = this.snapshot();
    const entry: SendLogEntry = {
      campaignId: this.plan.campaignId,
      templateName: this.plan.templateName,
      subject: this.plan.subjectTemplate,
      mailbox: this.plan.mailbox,
      createdAt: Date.now(),
      sent: s.counts.sent,
      failed: s.counts.failed,
      skipped: s.counts.skipped,
      totalRecipients: s.sendableTotal,
      remaining: s.remainingTotal,
      dailyCap: s.dailyCap,
    };
    await putSendLog(entry);
  }

  private async finishForDay(): Promise<void> {
    this.status = "done";
    this.clearTick();
    this.nextInSec = null;
    await this.persistLog();
    this.emit();
  }

  private async finishAll(): Promise<void> {
    this.status = "done";
    this.clearTick();
    this.nextInSec = null;
    await this.persistLog();
    this.emit();
  }
}

function timeLabel(d = new Date()): string {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}
