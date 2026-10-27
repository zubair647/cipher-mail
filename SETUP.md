# Cipher Mail — setup guide

This is the one-time provisioning to take the app from **mock mode** (simulated
sign-in and sending, which it runs in out of the box) to **live** (real sign-in,
real sending from your CipherSchools Microsoft mailbox).

Everything here is free. You need **two values** from a Microsoft Entra ID app
registration, plus a one-time admin approval. Estimated time: ~15 minutes.

---

## 1. Run the app locally (works today, no setup)

```bash
npm install
npm run dev
```

Open http://localhost:5173. Until you add the two values below, the app runs in
**mock mode**: sign-in gives you a demo account and "sending" is simulated (with a
simulated slow-down and the odd simulated failure so you can see every state).
**No email leaves your machine in mock mode.**

---

## 2. Register the app in Microsoft Entra ID (to go live)

You need an account in the CipherSchools Microsoft (Entra) tenant.

1. Go to **https://entra.microsoft.com** and sign in.
2. **Identity → Applications → App registrations → New registration.**
   - **Name:** `Cipher Mail`
   - **Supported account types:** *Accounts in this organizational directory only (Single tenant)*
   - **Redirect URI:** platform **Single-page application (SPA)**, value `http://localhost:5173`
   - Click **Register.**
3. On the app's **Overview** page, copy these two values:
   - **Application (client) ID**
   - **Directory (tenant) ID**
4. **API permissions → Add a permission → Microsoft Graph → Delegated permissions**
   - Add **`Mail.Send`** and **`User.Read`**.
   - Click **Grant admin consent for CipherSchools.** *(This button needs an M365
     admin. If that isn't you, this is the one step to hand to whoever has admin
     rights — it's a single click.)*

> **Why delegated, not application permissions?** Delegated `Mail.Send` means the
> app can only ever send **as the signed-in person**, from their own mailbox —
> never as anyone else. The app never sees a password or a client secret.

---

## 3. Plug the two values in

Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_MS_CLIENT_ID=<Application (client) ID>
VITE_MS_TENANT_ID=<Directory (tenant) ID>
VITE_MS_REDIRECT_URI=http://localhost:5173
```

Restart `npm run dev`. The "Mock mode" tag disappears and **Sign in with Microsoft**
now opens the real Microsoft login. You're live.

---

## 4. Before the first real send — confirm the limits

Ask your M365 admin for the mailbox's **per-minute** and **per-day** send limits,
and make sure the app's **daily cap** (Settings → default 50, hard ceiling 200)
and pacing (5–50s between sends) sit safely under them.

---

## 5. Brand assets (optional polish)

The app ships styled with the Modernist system (Archivo, CipherSchools red
`#ec3013`). To match the real brand exactly, drop in:

- the CipherSchools **logo** (SVG for the UI, PNG for embedding in emails),
- the exact **brand hex** colours and **font**, if different.

Tell me the values and I'll wire them into the tokens and the email template.

---

## A note on unsubscribe (no-server design)

Because v1 has no server, there's no public endpoint for a *clicked* web
unsubscribe link to report back to. Every email therefore carries a **`mailto:`
unsubscribe** (and a matching `List-Unsubscribe` header): the recipient's
unsubscribe lands as a reply in your mailbox, and you add them to the local
suppression list in **Settings → Unsubscribe list** (one field, paste the
address). They're then never emailed again from this machine. A clickable web
unsubscribe is a v3 item — it needs the hosted version.
