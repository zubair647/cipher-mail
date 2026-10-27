// Small shared UI pieces built on the Modernist classes.

import type { ReactNode } from 'react';
import type { RecipientStatus, SkipReason } from '../lib/types';

export function PageHead({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="page-head">
      {kicker && <div className="kicker">{kicker}</div>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

const STATUS_LABEL: Record<RecipientStatus, string> = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
  skipped: 'Skipped',
};

export function StatusPill({
  status,
  skipReason,
}: {
  status: RecipientStatus;
  skipReason?: SkipReason;
}) {
  const label =
    status === 'skipped' && skipReason
      ? skipLabel(skipReason)
      : status === 'skipped'
        ? 'Held'
        : STATUS_LABEL[status];
  return <span className={`pill pill-${status}`}>{label}</span>;
}

function skipLabel(reason: SkipReason): string {
  switch (reason) {
    case 'invalid-email':
      return 'Invalid';
    case 'duplicate':
      return 'Duplicate';
    case 'unsubscribed':
      return 'Unsubscribed';
    case 'bounced':
      return 'Bounced';
  }
}

export function Banner({
  children,
  variant = 'accent',
}: {
  children: ReactNode;
  variant?: 'accent' | 'warn';
}) {
  return <div className={`banner ${variant === 'warn' ? 'banner-warn' : ''}`}>{children}</div>;
}

export function Dialog({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions: ReactNode;
}) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog elev-lg" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}
