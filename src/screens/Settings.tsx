import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Avatar } from "../components/common";
import { useAuth } from "../state/AuthContext";
import { getPrefs, setPrefs } from "../lib/storage";
import { getSuppression } from "../lib/db";
import { DEFAULT_DAILY_CAP, HARD_CEILING, type SuppressionEntry } from "../lib/types";

export function Settings() {
  const nav = useNavigate();
  const { account, signOut, signIn } = useAuth();
  const [cap, setCap] = useState(getPrefs().dailyCap);
  const [list, setList] = useState<SuppressionEntry[]>([]);

  useEffect(() => { getSuppression().then(setList); }, []);

  const updateCap = (v: number) => {
    const clamped = Math.min(Math.max(1, v), HARD_CEILING);
    setCap(clamped);
    setPrefs({ dailyCap: clamped });
  };

  const exportList = () => {
    const csv = "email,reason,date\n" + list.map((s) => `${s.email},${s.reason},${new Date(s.addedAt).toISOString().slice(0, 10)}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "unsubscribe-list.csv";
    a.click();
  };

  return (
    <Shell active="settings">
      <div className="page"><div className="canvas">
        <h1 className="h1" style={{ marginBottom: 32 }}>Settings</h1>

        <div className="wizard even">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Daily cap */}
            <div className="panel">
              <span className="lbl">Daily sending cap</span>
              <p style={{ fontSize: 14, color: "var(--gray)", margin: "0 0 22px", lineHeight: 1.5 }}>Warm-up protects your mailbox reputation. Default {DEFAULT_DAILY_CAP}.</p>
              <div className="row" style={{ alignItems: "baseline", gap: 10, marginBottom: 18 }}>
                <span className="num" style={{ fontSize: 46 }}>{cap}</span>
                <span style={{ color: "var(--gray)", fontSize: 14 }}>emails / day</span>
              </div>
              <input type="range" min={1} max={HARD_CEILING} value={cap} onChange={(e) => updateCap(Number(e.target.value))} style={{ width: "100%" }} />
              <div className="rowb" style={{ fontSize: 12, color: "var(--faint)", marginTop: 12 }}><span>1</span><span>Hard ceiling {HARD_CEILING} — cannot exceed in v1</span></div>
            </div>

            {/* Connected account */}
            <div className="panel">
              <span className="lbl">Connected account</span>
              <div className="row" style={{ gap: 14, marginTop: 14 }}>
                <Avatar initials={account?.initials ?? "?"} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{account?.name}</div>
                  <div className="em" style={{ fontSize: 12.5, color: "var(--gray)" }}>{account?.email}</div>
                </div>
                <span className="badge b-sent">Connected</span>
              </div>
              <div className="row" style={{ gap: 10, marginTop: 20 }}>
                <button className="btn btn-sec btn-sm" onClick={signIn}>Reconnect</button>
                <button className="btn btn-line btn-sm btn-danger" onClick={async () => { await signOut(); nav("/"); }}>Sign out</button>
              </div>
            </div>
          </div>

          {/* Unsubscribe list */}
          <div className="panel flush" style={{ alignSelf: "start" }}>
            <div className="rowb" style={{ padding: "22px 24px", borderBottom: "1px solid var(--hair)" }}>
              <div>
                <span className="lbl" style={{ margin: "0 0 4px" }}>Unsubscribe list</span>
                <span style={{ fontSize: 12.5, color: "var(--gray)" }}>Always suppressed · stored on this machine</span>
              </div>
              <span className="pill">{list.length} addresses</span>
            </div>
            {list.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "var(--gray)", padding: "18px 24px", margin: 0 }}>No suppressed addresses yet. Unsubscribes and hard bounces land here automatically.</p>
            ) : (
              <table className="tbl">
                <tbody>
                  {list.slice(0, 50).map((s) => (
                    <tr key={s.email}>
                      <td className="em">{s.email}</td>
                      <td className="faint" style={{ textAlign: "right" }}>
                        {s.reason === "unsubscribed" ? "unsubscribed" : "hard bounce"} · {new Date(s.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--hair)" }}>
              <button className="btn btn-sec btn-sm" onClick={exportList} disabled={!list.length}>Export list (CSV)</button>
            </div>
          </div>
        </div>
      </div></div>
    </Shell>
  );
}
