// localStorage: small, persistent working data (account, prefs, templates,
// last-used variables). No tokens, no recipient data — ever.

import {
  DEFAULT_DAILY_CAP,
  HARD_CEILING,
  type Account,
  type Prefs,
  type Template,
  type VariableKey,
} from "./types";

const K = {
  account: "cm.account",
  prefs: "cm.prefs",
  templates: "cm.templates",
  variables: "cm.lastVariables",
  activeCampaign: "cm.activeCampaignId",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore for this prototype */
  }
}

// ---- account (non-sensitive profile only; never the token) ----
export const getAccount = () => read<Account | null>(K.account, null);
export const setAccount = (a: Account | null) =>
  a ? write(K.account, a) : localStorage.removeItem(K.account);

// ---- prefs ----
export function getPrefs(): Prefs {
  const p = read<Prefs>(K.prefs, { dailyCap: DEFAULT_DAILY_CAP });
  return { dailyCap: Math.min(Math.max(1, p.dailyCap || DEFAULT_DAILY_CAP), HARD_CEILING) };
}
export function setPrefs(p: Prefs): void {
  write(K.prefs, { dailyCap: Math.min(Math.max(1, p.dailyCap), HARD_CEILING) });
}

// ---- templates ----
export const getTemplates = () =>
  read<Template[]>(K.templates, []).sort((a, b) => b.updatedAt - a.updatedAt);

export function saveTemplate(t: Template): void {
  const all = getTemplates().filter((x) => x.id !== t.id);
  all.unshift(t);
  write(K.templates, all);
}
export function deleteTemplate(id: string): void {
  write(K.templates, getTemplates().filter((t) => t.id !== id));
}

// ---- last-used variable set (convenience) ----
export const getLastVariables = () => read<VariableKey[]>(K.variables, []);
export const setLastVariables = (v: VariableKey[]) => write(K.variables, v);

// ---- which campaign is active (for resume) ----
export const getActiveCampaignId = () => read<string | null>(K.activeCampaign, null);
export const setActiveCampaignId = (id: string | null) =>
  id ? write(K.activeCampaign, id) : localStorage.removeItem(K.activeCampaign);
