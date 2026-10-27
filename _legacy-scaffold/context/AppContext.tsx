// Global app + campaign state. The signed-in account and settings persist;
// the active campaign (variables, CSV in RAM, mapping, template) does not.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Account,
  ColumnMapping,
  ParsedCsv,
  Settings,
  Template,
  Variable,
} from '../lib/types';
import {
  accountStore,
  settingsStore,
  variablesStore,
  templatesStore,
} from '../lib/storage';
import { restoreAccount } from '../lib/auth';

export interface Campaign {
  id: string;
  variables: Variable[];
  csv: ParsedCsv | null;
  mapping: ColumnMapping;
  subject: string;
  bodyHtml: string;
  testSent: boolean;
}

function newCampaign(variables: Variable[]): Campaign {
  return {
    id: `c_${Date.now().toString(36)}`,
    variables,
    csv: null,
    mapping: { emailColumn: null, variableToColumn: {} },
    subject: '',
    bodyHtml: '',
    testSent: false,
  };
}

interface AppState {
  ready: boolean;
  account: Account | null;
  setAccount: (a: Account | null) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  templates: Template[];
  saveTemplate: (t: Template) => void;
  removeTemplate: (id: string) => void;
  campaign: Campaign;
  patchCampaign: (patch: Partial<Campaign>) => void;
  startNewCampaign: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccountState] = useState<Account | null>(null);
  const [settings, setSettingsState] = useState<Settings>(() => settingsStore.get());
  const [templates, setTemplates] = useState<Template[]>(() => templatesStore.get());
  const [campaign, setCampaign] = useState<Campaign>(() => newCampaign(variablesStore.get()));

  useEffect(() => {
    restoreAccount()
      .then((a) => setAccountState(a))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      account,
      setAccount: (a) => {
        accountStore.set(a);
        setAccountState(a);
      },
      settings,
      setSettings: (s) => {
        settingsStore.set(s);
        setSettingsState(s);
      },
      templates,
      saveTemplate: (t) => {
        const next = templatesStore.upsert(t);
        setTemplates([...next]);
      },
      removeTemplate: (id) => {
        const next = templatesStore.remove(id);
        setTemplates([...next]);
      },
      campaign,
      patchCampaign: (patch) => setCampaign((c) => ({ ...c, ...patch })),
      startNewCampaign: () => setCampaign(newCampaign(variablesStore.get())),
    }),
    [ready, account, settings, templates, campaign],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
