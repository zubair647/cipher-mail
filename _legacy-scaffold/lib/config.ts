// Runtime configuration read from Vite env. When the Microsoft client/tenant
// are absent, the app runs in MOCK mode (simulated sign-in + sending).

const clientId = (import.meta.env.VITE_MS_CLIENT_ID ?? '').trim();
const tenantId = (import.meta.env.VITE_MS_TENANT_ID ?? '').trim();
const redirectUri = (import.meta.env.VITE_MS_REDIRECT_URI ?? window.location.origin).trim();

export const config = {
  clientId,
  tenantId,
  redirectUri,
  /** True until a real Entra app registration is wired in via .env.local. */
  isMockMode: clientId === '' || tenantId === '',
  graphScopes: ['User.Read', 'Mail.Send'],
} as const;

// Sending guardrails from the PRD.
export const DEFAULT_DAILY_CAP = 50;
export const HARD_CEILING = 200;
export const DEFAULT_MIN_GAP_SECONDS = 5;
export const DEFAULT_MAX_GAP_SECONDS = 50;

export const CAMPAIGN_STEPS = [
  { key: 'variables', label: 'Variables', path: '/campaign/variables' },
  { key: 'upload', label: 'CSV upload', path: '/campaign/upload' },
  { key: 'mapping', label: 'Column mapping', path: '/campaign/mapping' },
  { key: 'compose', label: 'Compose', path: '/campaign/compose' },
  { key: 'preview', label: 'Preview', path: '/campaign/preview' },
  { key: 'test', label: 'Test send', path: '/campaign/test' },
  { key: 'confirm', label: 'Confirm & send', path: '/campaign/confirm' },
] as const;
