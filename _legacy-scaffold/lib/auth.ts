// Microsoft sign-in via MSAL (delegated, PKCE, no password/secret in the app).
// When the Entra app registration isn't configured yet, falls back to a MOCK
// account so the whole app can be built and demoed without a real mailbox.

import {
  PublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
} from '@azure/msal-browser';
import { config } from './config';
import type { Account } from './types';
import { accountStore } from './storage';

let msal: PublicClientApplication | null = null;

async function getMsal(): Promise<PublicClientApplication> {
  if (msal) return msal;
  msal = new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: config.redirectUri,
    },
    cache: { cacheLocation: 'sessionStorage' }, // tokens never touch localStorage
  });
  await msal.initialize();
  return msal;
}

function toAccount(info: AccountInfo): Account {
  return {
    name: info.name ?? info.username,
    email: info.username,
    isMock: false,
  };
}

/** Sign in interactively. In mock mode this returns a simulated account. */
export async function signIn(): Promise<Account> {
  if (config.isMockMode) {
    const mock: Account = {
      name: 'Priya (demo)',
      email: 'priya@cipherschools.com',
      isMock: true,
    };
    accountStore.set(mock);
    return mock;
  }
  const client = await getMsal();
  const result = await client.loginPopup({ scopes: [...config.graphScopes] });
  client.setActiveAccount(result.account);
  const account = toAccount(result.account);
  accountStore.set(account);
  return account;
}

export async function signOut(): Promise<void> {
  accountStore.set(null);
  if (config.isMockMode) return;
  const client = await getMsal();
  const active = client.getActiveAccount();
  if (active) await client.logoutPopup({ account: active });
}

/** Restore a previously signed-in account on app start, if any. */
export async function restoreAccount(): Promise<Account | null> {
  const stored = accountStore.get();
  if (config.isMockMode) return stored;
  const client = await getMsal();
  const accounts = client.getAllAccounts();
  if (!accounts.length) return null;
  client.setActiveAccount(accounts[0]);
  return toAccount(accounts[0]);
}

/**
 * Acquire a Graph access token silently, falling back to interactive if the
 * session has expired or consent is needed. Throws in mock mode (callers in
 * mock mode never reach the real Graph path).
 */
export async function getAccessToken(): Promise<string> {
  if (config.isMockMode) throw new Error('No token in mock mode');
  const client = await getMsal();
  const account = client.getActiveAccount() ?? client.getAllAccounts()[0];
  if (!account) throw new Error('Not signed in');
  try {
    const res = await client.acquireTokenSilent({ scopes: [...config.graphScopes], account });
    return res.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const res = await client.acquireTokenPopup({ scopes: [...config.graphScopes], account });
      return res.accessToken;
    }
    throw err;
  }
}
