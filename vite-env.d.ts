/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Azure AD app (client) ID for the standalone Cipher Mail registration. */
  readonly VITE_MS_CLIENT_ID?: string;
  /** Authority: "common" (multi-tenant, default) or a specific tenant id. */
  readonly VITE_MS_AUTHORITY?: string;
  /** "true" to simulate sending without hitting Microsoft Graph (default on when no client id). */
  readonly VITE_MOCK_SEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
