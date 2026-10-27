import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Account } from "../lib/types";
import {
  AdminConsentRequiredError,
  signIn as doSignIn,
  signOut as doSignOut,
  tryRestore,
} from "../auth/authProvider";
import { MOCK_SEND } from "../auth/msalConfig";
import { getAccount, setAccount } from "../lib/storage";

interface AuthState {
  account: Account | null;
  ready: boolean;
  busy: boolean;
  error: string | null;
  consentRequired: boolean;
  mock: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearConsent: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAcct] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentRequired, setConsentRequired] = useState(false);

  useEffect(() => {
    (async () => {
      const cached = getAccount();
      const restored = await tryRestore();
      setAcct(restored ?? cached);
      setReady(true);
    })();
  }, []);

  async function signIn() {
    setBusy(true);
    setError(null);
    setConsentRequired(false);
    try {
      const acct = await doSignIn();
      setAcct(acct);
      setAccount(acct);
    } catch (e) {
      if (e instanceof AdminConsentRequiredError) {
        setConsentRequired(true);
      } else {
        setError((e as Error).message || "Sign-in failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await doSignOut();
    setAcct(null);
    setAccount(null);
  }

  return (
    <Ctx.Provider
      value={{
        account,
        ready,
        busy,
        error,
        consentRequired,
        mock: MOCK_SEND,
        signIn,
        signOut,
        clearConsent: () => setConsentRequired(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
