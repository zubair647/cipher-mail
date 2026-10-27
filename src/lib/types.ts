// ---- Shared domain types ----

export type VariableKey = string; // e.g. "name", "batch", "course"

export interface CampaignVariable {
  key: VariableKey;       // the token used in {{key}}
  required?: boolean;     // email is required
  custom?: boolean;       // user-added
}

/** A parsed CSV held entirely in memory (never written to disk). */
export interface ParsedCsv {
  fileName: string;
  sizeLabel: string;
  headers: string[];
  rows: Record<string, string>[]; // header -> cell value
  totalRowsInFile: number;        // before de-dupe
  warnings: CsvWarning[];
  hadBom: boolean;
  emailColumnGuess: string | null;
}

export interface CsvWarning {
  kind:
    | "duplicates-removed"
    | "blank-cells"
    | "no-email-column"
    | "empty-file"
    | "extra-columns"
    | "trailing-space-header";
  message: string;
  detail?: string;
}

/** variableKey -> CSV header name (or null = not mapped, use fallback). */
export type ColumnMapping = Record<VariableKey, string | null>;

export interface Template {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: VariableKey[];
  updatedAt: number;
  usedAtLabel?: string;
}

export interface CampaignDraft {
  variables: CampaignVariable[];
  csv: ParsedCsv | null;
  mapping: ColumnMapping;
  subject: string;
  bodyHtml: string;
  testSentAt: number | null;
  templateName: string;
}

export type RecipientStatus = "queued" | "sending" | "sent" | "failed" | "skipped";

export type SkipReason = "invalid" | "duplicate" | "unsubscribed" | null;

export interface RecipientRecord {
  campaignId: string;
  email: string;
  mergedSubject: string;
  status: RecipientStatus;
  skipReason: SkipReason;
  error?: string;
  timeLabel?: string;   // HH:MM:SS
  sentAt?: number;
}

export interface SuppressionEntry {
  email: string;
  reason: "unsubscribed" | "hard-bounce";
  addedAt: number;
}

export interface SendLogEntry {
  campaignId: string;
  templateName: string;
  subject: string;
  mailbox: string;
  createdAt: number;
  sent: number;
  failed: number;
  skipped: number;
  totalRecipients: number;
  remaining: number;
  dailyCap: number;
}

export interface Account {
  name: string;
  email: string;
  initials: string;
}

export interface Prefs {
  dailyCap: number; // default 50, ceiling 200
}

export const HARD_CEILING = 200;
export const DEFAULT_DAILY_CAP = 50;
