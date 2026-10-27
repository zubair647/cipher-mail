import type { Configuration } from "@azure/msal-browser";

export const MS_CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID?.trim() || "";
const AUTHORITY_SEG = import.meta.env.VITE_MS_AUTHORITY?.trim() || "common";

// Mock mode: on explicitly, or forced on when there's no client id so the app
// runs end-to-end out of the box.
export const MOCK_SEND =
  import.meta.env.VITE_MOCK_SEND === "true" || MS_CLIENT_ID === "";

// Delegated scope — the app can only ever send AS the signed-in user.
export const GRAPH_SCOPES = ["User.Read", "Mail.Send"];

export const msalConfig: Configuration = {
  auth: {
    clientId: MS_CLIENT_ID || "00000000-0000-0000-0000-000000000000",
    authority: `https://login.microsoftonline.com/${AUTHORITY_SEG}`,
    redirectUri: window.location.origin,
  },
  cache: {
    // Tokens held only as MSAL requires. Never written to our own stores.
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const GRAPH_SENDMAIL = "https://graph.microsoft.com/v1.0/me/sendMail";
export const GRAPH_ME = "https://graph.microsoft.com/v1.0/me";
