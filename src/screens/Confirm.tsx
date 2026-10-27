import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead, ActionBar } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { useAuth } from "../state/AuthContext";
import { getPrefs } from "../lib/storage";
import { getSentToday } from "../lib/db";
import type { BuiltPlan } from "../lib/plan";
import { HARD_CEILING } from "../lib/types";

export function Confirm() {
  const nav = useNavigate();
  const { account } = useAuth();
  const { buildEngine } = useCampaign();
  const [built, setBuilt] = useState<BuiltPlan | null>(null);
  const [sentToday, setSentToday] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const prefs = getPrefs();

  useEffect(() => {
    (async () => {
      try {
        const b = await buildEngine(account?.email ?? "", prefs.dailyCap);
        setBuilt(b);
        setSentToday(await getSentToday());
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (err) {
    return (
      <div className="container container-narrow">
        <div className="banner banner-error"><span className="ico">!</span><span>{err}</span></div>
        <ActionBar onBack={() => nav("/campaign/test")} primary={<span />} />
      </div>
    );
  }
  if (!built) return <div className="container container-narrow"><p className="muted">Preparing…</p></div>;

  const cap = Math.min(prefs.dailyCap, HARD_CEILING);
  const remainingAllowance = Math.max(0, cap - sentToday);
  const todayCount = Math.min(built.sendableCount, remainingAllowance);

  return (
    <div className="container container-narrow">
      <ScreenHead eyebrow="FR#9" title="Ready to send" sub="Review the summary. The send starts only when you confirm." />

      <div className="card card-pad stack-16">
        <Row label="Sending to" value={<span className="num" style={{ fontSize: 20 }}>{built.sendableCount}</span>} suffix="recipients" />
        {built.skips.total > 0 && (
          <Row
            label="Skipped"
            value={<span className="num" style={{ fontSize: 20 }}>{built.skips.total}</span>}
            suffix={
              <span className="small muted">
                {[
                  built.skips.invalid && `${built.skips.invalid} invalid`,
                  built.skips.duplicate && `${built.skips.duplicate} duplicate`,
                  built.skips.unsubscribed && `${built.skips.unsubscribed} unsubscribed`,
                ].filter(Boolean).join(" · ")}
              </span>
            }
          />
        )}
        <hr className="divider" />
        <Row label="From mailbox" value={<span className="mono">{account?.email}</span>} />
        <Row label="Daily cap" value={<span className="mono">{cap}/day</span>} suffix={<span className="small muted">ceiling {HARD_CEILING}</span>} />
      </div>

      <div className="banner banner-info" style={{ marginTop: 16 }}>
        <span className="ico">i</span>
        <span>
          At {cap}/day, <span className="strong">{todayCount} of {built.sendableCount}</span> send today, spaced out over
          time; the rest wait for tomorrow. Keep this tab open until it finishes.
        </span>
      </div>

      <ActionBar
        backLabel="Back"
        onBack={() => nav("/campaign/test")}
        primary={
          <button className="btn btn-primary btn-lg" disabled={built.sendableCount === 0} onClick={() => nav("/campaign/sending")}>
            Send {todayCount} now, spaced out
          </button>
        }
      />
    </div>
  );
}

function Row({ label, value, suffix }: { label: string; value: React.ReactNode; suffix?: React.ReactNode }) {
  return (
    <div className="row-between">
      <span className="muted">{label}</span>
      <div className="row" style={{ gap: 8 }}>{value}{suffix && <span className="muted small">{suffix}</span>}</div>
    </div>
  );
}
