// The app frame. The sidebar is a workspace nav outside a campaign and a
// 7-step wayfinder during one — "Nav = flow" from the design notes.

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Settings as SettingsIcon, Mail } from 'lucide-react';
import { CAMPAIGN_STEPS } from '../lib/config';
import { useApp } from '../context/AppContext';

const STEP_ORDER: string[] = CAMPAIGN_STEPS.map((s) => s.path);

export default function AppShell() {
  const location = useLocation();
  const { account } = useApp();
  const inCampaign = location.pathname.startsWith('/campaign');
  const currentStepIdx = STEP_ORDER.indexOf(location.pathname);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/assets/cipher-mark.png" alt="" style={{ height: 34, width: 'auto' }} />
          Cipher Mail
        </div>

        {inCampaign ? (
          <nav className="steps" aria-label="Campaign steps">
            {CAMPAIGN_STEPS.map((step, i) => {
              const done = currentStepIdx > i;
              return (
                <NavLink
                  key={step.key}
                  to={step.path}
                  className={`step ${done ? 'done' : ''}`}
                >
                  <span className="step-num">{done ? '✓' : i + 1}</span>
                  {step.label}
                </NavLink>
              );
            })}
          </nav>
        ) : (
          <nav className="sidebar-nav" aria-label="Workspace">
            <NavLink to="/home" end>
              <Home size={16} /> Home
            </NavLink>
            <NavLink to="/campaign/variables">
              <Mail size={16} /> New campaign
            </NavLink>
            <NavLink to="/settings">
              <SettingsIcon size={16} /> Settings
            </NavLink>
          </nav>
        )}

        <div className="sidebar-foot text-muted">
          {account ? (
            <>
              <div style={{ fontWeight: 600 }}>{account.name}</div>
              <div>{account.email}</div>
              {account.isMock && <div className="tag tag-accent" style={{ marginTop: 6 }}>Mock mode</div>}
            </>
          ) : null}
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
