import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  CampaignDraft,
  CampaignVariable,
  ColumnMapping,
  ParsedCsv,
  Template,
} from "../lib/types";
import { SendEngine } from "../engine/sendEngine";
import { buildPlan, type BuiltPlan } from "../lib/plan";
import {
  getLastVariables,
  saveTemplate,
  setActiveCampaignId,
  setLastVariables,
} from "../lib/storage";

function defaultVariables(): CampaignVariable[] {
  const last = getLastVariables();
  const base: CampaignVariable[] = [{ key: "email", required: true }];
  const extras = last.length ? last : ["name", "batch", "course"];
  for (const k of extras) {
    if (k !== "email" && !base.find((v) => v.key === k)) base.push({ key: k, custom: !["name", "batch", "course"].includes(k) });
  }
  return base;
}

function emptyDraft(): CampaignDraft {
  return {
    variables: defaultVariables(),
    csv: null,
    mapping: { email: null },
    subject: "",
    bodyHtml: "",
    isHtmlMode: false,
    testSentAt: null,
    templateName: "",
  };
}

interface CampaignState {
  draft: CampaignDraft;
  campaignId: string;
  engine: SendEngine | null;
  built: BuiltPlan | null;
  setVariables: (v: CampaignVariable[]) => void;
  setCsv: (csv: ParsedCsv | null) => void;
  setMapping: (m: ColumnMapping) => void;
  setCompose: (subject: string, bodyHtml: string) => void;
  setHtmlMode: (on: boolean) => void;
  markTestSent: () => void;
  setTemplateName: (n: string) => void;
  loadTemplate: (t: Template) => void;
  saveCurrentTemplate: (name: string) => void;
  buildEngine: (mailbox: string, dailyCap: number) => Promise<BuiltPlan>;
  resetCampaign: () => void;
  resumeCampaign: (id: string, subject: string, templateName: string) => void;
}

const Ctx = createContext<CampaignState | null>(null);

function newId() {
  return `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [campaignId, setCampaignId] = useState<string>(newId);
  const [engine, setEngine] = useState<SendEngine | null>(null);
  const [built, setBuilt] = useState<BuiltPlan | null>(null);

  const api = useMemo<CampaignState>(
    () => ({
      draft,
      campaignId,
      engine,
      built,
      setVariables: (variables) => {
        setLastVariables(variables.filter((v) => !v.required).map((v) => v.key));
        setDraft((d) => ({ ...d, variables }));
      },
      setCsv: (csv) => setDraft((d) => ({ ...d, csv, testSentAt: null })),
      setMapping: (mapping) => setDraft((d) => ({ ...d, mapping })),
      setCompose: (subject, bodyHtml) =>
        setDraft((d) => ({ ...d, subject, bodyHtml, testSentAt: null })),
      setHtmlMode: (on) => setDraft((d) => ({ ...d, isHtmlMode: on, testSentAt: null })),
      markTestSent: () => setDraft((d) => ({ ...d, testSentAt: Date.now() })),
      setTemplateName: (templateName) => setDraft((d) => ({ ...d, templateName })),
      loadTemplate: (t) =>
        setDraft((d) => ({
          ...d,
          subject: t.subject,
          bodyHtml: t.bodyHtml,
          isHtmlMode: t.isHtmlMode ?? false,
          templateName: t.name,
          variables: [
            { key: "email", required: true },
            ...t.variables
              .filter((k) => k !== "email")
              .map((k) => ({ key: k, custom: !["name", "batch", "course"].includes(k) })),
          ],
          testSentAt: null,
        })),
      saveCurrentTemplate: (name) => {
        const t: Template = {
          id: newId(),
          name,
          subject: draft.subject,
          bodyHtml: draft.bodyHtml,
          isHtmlMode: draft.isHtmlMode,
          variables: draft.variables.map((v) => v.key),
          updatedAt: Date.now(),
        };
        saveTemplate(t);
        setDraft((d) => ({ ...d, templateName: name }));
      },
      buildEngine: async (mailbox, dailyCap) => {
        const b = await buildPlan(draft, campaignId, mailbox, dailyCap);
        setBuilt(b);
        setEngine(new SendEngine(b.plan));
        setActiveCampaignId(campaignId);
        return b;
      },
      resetCampaign: () => {
        setDraft(emptyDraft());
        setCampaignId(newId());
        setEngine(null);
        setBuilt(null);
        setActiveCampaignId(null);
      },
      resumeCampaign: (id, subject, templateName) => {
        // Keep the SAME campaign id so sent-markers reconcile (no double-send).
        setCampaignId(id);
        setEngine(null);
        setBuilt(null);
        setDraft((d) => ({ ...emptyDraft(), subject, templateName, variables: d.variables }));
        setActiveCampaignId(id);
      },
    }),
    [draft, campaignId, engine, built]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCampaign(): CampaignState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCampaign must be used within CampaignProvider");
  return v;
}
