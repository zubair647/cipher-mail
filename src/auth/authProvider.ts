// Thin wrapper over MSAL with a mock fallback. Handles sign-in, token
// acquisition, admin-consent detection (FR#14), and sign-out.

import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
} from "@azure/msal-browser";
import type { Account } from "../lib/types";
import {
  GRAPH_ME,
  GRAPH_SCOPES,
  MOCK_SEND,
  MS_CLIENT_ID,
  msalConfig,
} from "./msalConfig";

export class AdminConsentRequiredError extends Error {
  constructor() {
    super("admin_consent_required");
    this.name = "AdminConsentRequiredError";
  }
}

let msal: PublicClientApplication | null = null;
let initialized = false;

export function isMock(): boolean {
  return MOCK_SEND;
}

async function ensureMsal(): Promise<PublicClientApplication> {
  if (!MS_CLIENT_ID) throw new Error("No VITE_MS_CLIENT_ID configured.");
  if (!msal) msal = new PublicClientApplication(msalConfig);
  if (!initialized) {
    await msal.initialize();
    await msal.handleRedirectPromise();
    initialized = true;
  }
  return msal;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function toAccount(info: AccountInfo, displayName?: string): Account {
  const name = displayName || info.name || info.username.split("@")[0];
  return { name, email: info.username, initials: initials(name) };
}

// ---- mock account (for local run without a registration) ----
const MOCK_ACCOUNT: Account = {
  name: "Riya A.",
  email: "riya@cipherschools.com",
  initials: "RA",
};

/** Interactive sign-in. Resolves to a profile; throws AdminConsentRequired when blocked. */
export async function signIn(): Promise<Account> {
  if (MOCK_SEND) {
    await delay(500);
    return MOCK_ACCOUNT;
  }
  const app = await ensureMsal();
  try {
    const res = await app.loginPopup({ scopes: GRAPH_SCOPES, prompt: "select_account" });
    app.setActiveAccount(res.account);
    const profile = await fetchProfile(res.accessToken);
    return toAccount(res.account!, profile?.displayName);
  } catch (err) {
    if (isConsentError(err)) throw new AdminConsentRequiredError();
    throw err;
  }
}

export async function tryRestore(): Promise<Account | null> {
  if (MOCK_SEND) return null; // mock: require an explicit click each run
  try {
    const app = await ensureMsal();
    const acct = app.getActiveAccount() || app.getAllAccounts()[0];
    if (!acct) return null;
    app.setActiveAccount(acct);
    return toAccount(acct);
  } catch {
    return null;
  }
}

/** Acquire a Graph access token silently, falling back to popup. */
export async function getToken(): Promise<string> {
  if (MOCK_SEND) return "mock-token";
  const app = await ensureMsal();
  const account = app.getActiveAccount() || app.getAllAccounts()[0];
  if (!account) throw new InteractionRequiredAuthError();
  try {
    const res = await app.acquireTokenSilent({ scopes: GRAPH_SCOPES, account });
    return res.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const res = await app.acquireTokenPopup({ scopes: GRAPH_SCOPES, account });
      return res.accessToken;
    }
    throw err;
  }
}

export async function signOut(): Promise<void> {
  if (MOCK_SEND) return;
  try {
    const app = await ensureMsal();
    const account = app.getActiveAccount();
    await app.logoutPopup({ account: account ?? undefined });
  } catch {
    /* ignore */
  }
}

/** Trigger Microsoft's admin-consent request flow (FR#14) where supported. */
export function adminConsentUrl(): string {
  const base = `https://login.microsoftonline.com/common/adminconsent`;
  const redirect = encodeURIComponent(window.location.origin + "/consent");
  return `${base}?client_id=${MS_CLIENT_ID}&redirect_uri=${redirect}`;
}

async function fetchProfile(token: string): Promise<{ displayName?: string } | null> {
  try {
    const r = await fetch(GRAPH_ME, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function isConsentError(err: unknown): boolean {
  const msg = (err as Error)?.message?.toLowerCase() ?? "";
  return (
    msg.includes("aadsts65001") || // user/admin has not consented
    msg.includes("aadsts90094") || // admin consent required
    msg.includes("consent_required") ||
    msg.includes("admin")
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
