// Turn a campaign draft + recipients into a concrete send plan: resolve the
// email column, validate/dedupe, apply the suppression list, and pre-merge each
// recipient's subject + body. Produces the skip breakdown the Confirm screen shows.

import { getSuppressionSet } from "./db";
import { isValidEmail, normalizeEmail } from "./email";
import { mergeText } from "./merge";
import type { CampaignDraft } from "./types";
import type { EnginePlan, PlannedRecipient } from "../engine/sendEngine";

export interface SkipBreakdown {
  invalid: number;
  duplicate: number;
  unsubscribed: number;
  total: number;
}

export interface BuiltPlan {
  plan: EnginePlan;
  skips: SkipBreakdown;
  sendableCount: number;
}

export async function buildPlan(
  draft: CampaignDraft,
  campaignId: string,
  mailbox: string,
  dailyCap: number
): Promise<BuiltPlan> {
  const emailCol = draft.mapping["email"];
  if (!emailCol || !draft.csv) {
    throw new Error("Email column is not mapped.");
  }
  const suppressed = await getSuppressionSet();
  const seen = new Set<string>();
  const recipients: PlannedRecipient[] = [];
  const skips: SkipBreakdown = { invalid: 0, duplicate: 0, unsubscribed: 0, total: 0 };

  for (const row of draft.csv.rows) {
    const rawEmail = (row[emailCol] || "").trim();
    const norm = normalizeEmail(rawEmail);
    const body = mergeText(draft.bodyHtml, row, draft.mapping, true).text;
    const subject = mergeText(draft.subject, row, draft.mapping, false).text;

    let preSkip: PlannedRecipient["preSkip"] = null;
    if (!isValidEmail(rawEmail)) {
      preSkip = "invalid";
      skips.invalid++;
    } else if (seen.has(norm)) {
      preSkip = "duplicate";
      skips.duplicate++;
    } else if (suppressed.has(norm)) {
      preSkip = "unsubscribed";
      skips.unsubscribed++;
    }
    if (norm) seen.add(norm);

    recipients.push({ email: rawEmail || "(no email)", mergedSubject: subject, bodyHtml: body, preSkip });
  }

  skips.total = skips.invalid + skips.duplicate + skips.unsubscribed;
  const sendableCount = recipients.filter((r) => !r.preSkip).length;

  return {
    plan: {
      campaignId,
      templateName: draft.templateName || "Untitled campaign",
      subjectTemplate: draft.subject,
      mailbox,
      dailyCap,
      isHtmlMode: draft.isHtmlMode,
      recipients,
    },
    skips,
    sendableCount,
  };
}
