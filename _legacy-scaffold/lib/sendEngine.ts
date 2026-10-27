// The throttled sending engine. Sends one recipient at a time with a random
// 5–50s gap, respects the daily cap and 200/day hard ceiling, backs off on a
// 429 Retry-After, marks each recipient sent the instant it goes out
// (idempotent — resume never double-sends), and can be paused/cancelled.

import type {
  Account,
  ColumnMapping,
  CsvRow,
  RecipientState,
  Settings,
  Variable,
} from './types';
import { isValidEmail } from './csv';
import { buildEmail } from './email';
import { sendMail, RateLimitError } from './graph';
import { sentMarkers, suppression } from './storage';

export interface CampaignInput {
  campaignId: string;
  account: Account;
  subject: string;
  bodyHtml: string;
  variables: Variable[];
  mapping: ColumnMapping;
  rows: CsvRow[];
  settings: Settings;
}

export interface EngineSnapshot {
  recipients: RecipientState[];
  phase: 'idle' | 'running' | 'paused' | 'done' | 'capped';
  sent: number;
  failed: number;
  skipped: number;
  remaining: number;
  /** Seconds until the next send (for the live countdown). */
  nextInSeconds: number;
  /** When backing off on a 429, how many seconds left. */
  backoffSeconds: number;
}

type Listener = (snap: EngineSnapshot) => void;

const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class SendEngine {
  private recipients: RecipientState[] = [];
  private phase: EngineSnapshot['phase'] = 'idle';
  private listeners = new Set<Listener>();
  private cancelled = false;
  private nextInSeconds = 0;
  private backoffSeconds = 0;
  private input: CampaignInput;

  constructor(input: CampaignInput) {
    this.input = input;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }

  snapshot(): EngineSnapshot {
    const sent = this.recipients.filter((r) => r.status === 'sent').length;
    const failed = this.recipients.filter((r) => r.status === 'failed').length;
    const skipped = this.recipients.filter((r) => r.status === 'skipped').length;
    const remaining = this.recipients.filter(
      (r) => r.status === 'queued' || r.status === 'sending',
    ).length;
    return {
      recipients: this.recipients,
      phase: this.phase,
      sent,
      failed,
      skipped,
      remaining,
      nextInSeconds: this.nextInSeconds,
      backoffSeconds: this.backoffSeconds,
    };
  }

  /**
   * Build the recipient queue: validate addresses, drop suppressed/already-sent
   * recipients (resume safety), and cap to the day's allowance.
   */
  async prepare(): Promise<EngineSnapshot> {
    const { mapping, rows, campaignId, settings } = this.input;
    const emailCol = mapping.emailColumn;
    const suppressed = await suppression.asSet();
    const alreadySent = await sentMarkers.forCampaign(campaignId);

    const cap = Math.min(settings.dailyCap, settings.hardCeiling);
    const seen = new Set<string>();
    const prepared: RecipientState[] = [];

    for (const row of rows) {
      const email = emailCol ? (row[emailCol] ?? '').trim() : '';
      const lower = email.toLowerCase();
      const id = `r:${lower}`;

      let status: RecipientState['status'] = 'queued';
      let skipReason: RecipientState['skipReason'];

      if (!isValidEmail(email)) {
        status = 'skipped';
        skipReason = 'invalid-email';
      } else if (seen.has(lower)) {
        status = 'skipped';
        skipReason = 'duplicate';
      } else if (suppressed.has(lower)) {
        status = 'skipped';
        skipReason = 'unsubscribed';
      } else if (alreadySent.has(lower)) {
        // Resume: this person already got this campaign — mark sent, don't re-send.
        status = 'sent';
      }
      seen.add(lower);
      prepared.push({ id, email, status, skipReason });
    }

    // Enforce the daily cap over the still-queued recipients.
    const sentToday = prepared.filter((r) => r.status === 'sent').length;
    let budget = Math.max(0, cap - sentToday);
    for (const r of prepared) {
      if (r.status !== 'queued') continue;
      if (budget > 0) {
        budget -= 1;
      } else {
        r.status = 'skipped';
        r.skipReason = undefined; // held for tomorrow, not a hard skip
      }
    }

    this.recipients = prepared;
    this.phase = 'idle';
    this.emit();
    return this.snapshot();
  }

  pause() {
    if (this.phase === 'running') {
      this.phase = 'paused';
      this.emit();
    }
  }

  resume() {
    if (this.phase === 'paused') void this.run();
  }

  cancel() {
    this.cancelled = true;
    this.phase = 'paused';
    this.emit();
  }

  /** Index the engine will treat as "to send": queued recipients only. */
  private nextQueuedIndex(): number {
    return this.recipients.findIndex((r) => r.status === 'queued');
  }

  async run(): Promise<void> {
    this.cancelled = false;
    this.phase = 'running';
    this.emit();

    while (!this.cancelled) {
      const idx = this.nextQueuedIndex();
      if (idx === -1) break;
      if (this.phase !== 'running') return; // paused mid-loop

      const recipient = this.recipients[idx];
      recipient.status = 'sending';
      this.emit();

      try {
        await this.sendOne(recipient);
        recipient.status = 'sent';
        recipient.sentAt = Date.now();
        await sentMarkers.mark(this.input.campaignId, recipient.email);
      } catch (err) {
        if (err instanceof RateLimitError) {
          // Back off exactly as long as Microsoft asked, then retry this one.
          recipient.status = 'queued';
          await this.countdownBackoff(err.retryAfterSeconds);
          continue;
        }
        recipient.status = 'failed';
        recipient.error = err instanceof Error ? err.message : String(err);
      }
      this.emit();

      if (this.nextQueuedIndex() === -1) break;
      await this.countdownGap();
      if (this.cancelled || this.phase !== 'running') return;
    }

    if (!this.cancelled) {
      const capped = this.recipients.some(
        (r) => r.status === 'skipped' && r.skipReason === undefined,
      );
      this.phase = capped ? 'capped' : 'done';
      this.emit();
    }
  }

  private async sendOne(recipient: RecipientState) {
    const row = this.rowFor(recipient);
    const ctx = {
      row,
      variableToColumn: this.input.mapping.variableToColumn,
      variables: this.input.variables,
    };
    const email = buildEmail(
      this.input.subject,
      this.input.bodyHtml,
      this.input.account.email,
      ctx,
    );
    await sendMail({
      to: recipient.email,
      subject: email.subject,
      bodyHtml: email.bodyHtml,
      listUnsubscribe: email.listUnsubscribe,
    });
  }

  private rowFor(recipient: RecipientState): CsvRow {
    const emailCol = this.input.mapping.emailColumn;
    if (!emailCol) return {};
    return (
      this.input.rows.find(
        (r) => (r[emailCol] ?? '').trim().toLowerCase() === recipient.email.toLowerCase(),
      ) ?? {}
    );
  }

  private async countdownGap() {
    const { minGapSeconds, maxGapSeconds } = this.input.settings;
    let secs = randInt(minGapSeconds, maxGapSeconds + 1);
    while (secs > 0 && !this.cancelled && this.phase === 'running') {
      this.nextInSeconds = secs;
      this.emit();
      await sleep(1000);
      secs -= 1;
    }
    this.nextInSeconds = 0;
  }

  private async countdownBackoff(seconds: number) {
    let secs = seconds;
    while (secs > 0 && !this.cancelled) {
      this.backoffSeconds = secs;
      this.emit();
      await sleep(1000);
      secs -= 1;
    }
    this.backoffSeconds = 0;
    this.emit();
  }
}
