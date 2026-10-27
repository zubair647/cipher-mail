# Cipher Mail — v1

Local-only, spam-safe personalized bulk email from your own CipherSchools
Microsoft mailbox. Upload a CSV, write one rich-text email with `{{merge}}`
fields, preview, test, and send — paced so it lands in the inbox. No server, no
database; recipient data lives in memory only.

Built to the **PRD — Cipher Mail v1** (see `_legacy-scaffold/` note below).

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173, or the next free port).

### Demo mode (default, no setup)
With no Azure app configured, the app runs in **mock mode**: sign-in and sending
are simulated locally so you can exercise the whole flow — CSV validation, merge,
preview, the throttled queue with 429 back-off, pause/resume, idempotent resume,
and suppression. Mock send gaps are compressed (~1–3s) so a batch finishes in a
minute instead of ~100.

### Connect a real mailbox
1. Register a **standalone, multi-tenant** app in Azure (its own identity — not
   CipherSchools' Outlook). Add the delegated Graph scope **`Mail.Send`** (and
   `User.Read`). Set the SPA redirect URI to your dev origin
   (e.g. `http://localhost:5173`).
2. Copy `.env.example` to `.env` and set `VITE_MS_CLIENT_ID` to the app's client ID.
   Leave `VITE_MOCK_SEND` blank to send for real.
3. `npm run dev` and sign in. First sign-in shows Microsoft's one-time consent.
   If your tenant blocks self-consent, the app shows the **admin-approval helper**
   (FR#14) with a ready-to-send request.

## What's implemented (by PRD requirement)

| FR | Where |
| --- | --- |
| 1 Microsoft sign-in (delegated Mail.Send) | `src/auth/`, `SignIn.tsx` |
| 2 Variables manager | `screens/Variables.tsx` |
| 3 CSV upload & parse (in-memory, BOM, dupes, blanks) | `lib/csv.ts`, `Upload.tsx` |
| 4 Column mapping (messy-header tolerant) | `lib/csv.ts`, `Mapping.tsx` |
| 5 Rich-text editor + merge, escaping, unknown-var block | `components/RichTextEditor.tsx`, `lib/merge.ts`, `Compose.tsx` |
| 6 Subject with variables | `Compose.tsx` |
| 7 Live preview, step through recipients | `Preview.tsx` |
| 8 Mandatory test send (gates real send) | `TestSend.tsx` |
| 9 Confirmation screen (counts, skips, cap) | `Confirm.tsx`, `lib/plan.ts` |
| 10 Throttled engine (5–50s, cap, 200 ceiling, 429 back-off) | `engine/sendEngine.ts` |
| 11 Live status, pause/resume, idempotent resume | `Sending.tsx`, `engine/`, `lib/db.ts` |
| 12 Unsubscribe + suppression list | `lib/db.ts`, `email.ts`, `Settings.tsx` |
| 13 Reusable templates | `lib/storage.ts`, `Home.tsx` |
| 14 Admin-approval helper | `ConsentHelper.tsx`, `auth/authProvider.ts` |

**Edge-case states built:** admin-consent wall, home empty state, CSV missing-email
error, preview unknown-variable (send blocked), paused send, resume prompt,
sign-in-expired mid-send, overflow "run tomorrow" summary.

## Data & storage
- **In memory (RAM) only:** uploaded CSV + all recipient data — cleared when the tab closes.
- **localStorage:** account profile, prefs (daily cap), saved templates, last variables.
- **IndexedDB:** per-recipient sent/failed markers (idempotent resume), send log,
  suppression list, daily-send counter. No OAuth tokens or recipient lists are stored.

## Design
Palette, type (Fraunces / Spline Sans / JetBrains Mono) and shape tokens are
implemented literally from the handoff in `src/styles/theme.css`. Logo at
`public/brand-logo.jpeg`.

## Note: `_legacy-scaffold/`
This folder held an earlier, incomplete scaffold (a different architecture) when
this implementation was built. Those files were moved into `_legacy-scaffold/`
(not deleted) so the project builds cleanly. Delete it once you've confirmed you
don't need anything from it.

## Out of v1 scope (not built, per PRD)
Open/click tracking · multi-step sequences · Gmail sending · automatic multi-day
resume · file attachments · multi-user/shared lists.
