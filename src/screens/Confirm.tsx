import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Masthead, StepFoot, Note, MailWindow } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { useAuth } from "../state/AuthContext";
import { getPrefs } from "../lib/storage";
import { getSentToday } from "../lib/db";
import { mergeText } from "../lib/merge";
import type { BuiltPlan } from "../lib/plan";
import { HARD_CEILING } from "../lib/types";

export function Confirm() {
  const nav = useNavigate();
  const { account } = useAuth();
  const { draft, buildEngine } = useCampaign();
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
      <Shell>
        <div className="page">
          <Note kind="err" style={{ marginBottom: 20 }}>{err}</Note>
          <StepFoot onBack={() => nav("/campaign/test")}><span /></StepFoot>
        </div>
      </Shell>
    );
  }
  if (!built) return <Shell><div className="page"><p className="muted">Preparing…</p></div></Shell>;

  const cap = Math.min(prefs.dailyCap, HARD_CEILING);
  const remainingAllowance = Math.max(0, cap - sentToday);
  const todayCount = Math.min(built.sendableCount, remainingAllowance);

  const row = draft.csv?.rows[0] ?? {};
  const emailCol = draft.mapping["email"];
  const to = emailCol ? (row[emailCol] ?? "—") : "—";
  const subject = mergeText(draft.subject, row, draft.mapping, false).text;
  const body = mergeText(draft.bodyHtml, row, draft.mapping, true).text;

  const skipBits = [
    built.skips.invalid && `${built.skips.invalid} invalid`,
    built.skips.duplicate && `${built.skips.duplicate} duplicate`,
    built.skips.unsubscribed && `${built.skips.unsubscribed} unsubscribed`,
  ].filter(Boolean);

  return (
    <Shell>
      <div className="page">
        <Masthead label="FR#9" title="Ready to send" sub="Review the summary. The send starts only when you confirm." />

        <div className="wizard">
          <div>
            <div className="panel flush" style={{ marginBottom: 18 }}>
              <SummaryRow label="Sending to" value={<b style={{ fontSize: 16 }}>{built.sendableCount} recipients</b>} />
              {built.skips.total > 0 && (
                <SummaryRow label="Skipped" value={<span style={{ fontSize: 13, color: "var(--ink-2)", display: "flex", gap: 7, alignItems: "center" }}>{built.skips.total} · {skipBits.map((b, i) => <span key={i} className="badge b-skip">{b}</span>)}</span>} />
              )}
              <SummaryRow label="From mailbox" value={<span className="em" style={{ fontSize: 13 }}>{account?.email}</span>} />
              <SummaryRow label="Daily cap" value={<span style={{ fontSize: 14 }}><b>{cap}/day</b> <span className="faint">· ceiling {HARD_CEILING}</span></span>} last />
            </div>

            <Note kind="warn">At {cap}/day, <b>{todayCount} of {built.sendableCount}</b> send today, spaced out; the rest wait for tomorrow. Keep this tab open until it finishes.</Note>

            <button className="btn btn-pri btn-lg btn-block" style={{ marginTop: 18 }} disabled={built.sendableCount === 0} onClick={() => nav("/campaign/sending")}>
              Send {todayCount} now, spaced out
            </button>
          </div>

          <div className="ctx">
            <span className="lbl">Final preview · recipient 1</span>
            <MailWindow to={String(to)} subject={subject} bodyHtml={body} footer={false} shadow compact />
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className="rowb" style={{ padding: "18px 24px", borderBottom: last ? "none" : "1px solid var(--hair)" }}>
      <span style={{ color: "var(--gray)", fontSize: 14 }}>{label}</span>
      <div className="row" style={{ gap: 8 }}>{value}</div>
    </div>
  );
}
