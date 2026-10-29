import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Stepper, Masthead, StepFoot, Note, MailWindow, IconChevronDown } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { autoMatchColumn } from "../lib/csv";
import { mergeText } from "../lib/merge";
import type { ColumnMapping } from "../lib/types";

export function Mapping() {
  const nav = useNavigate();
  const { draft, setMapping } = useCampaign();
  const csv = draft.csv;

  // Auto-match once when we have a CSV and no mapping yet.
  useEffect(() => {
    if (!csv) return;
    const hasAny = Object.values(draft.mapping).some(Boolean);
    if (hasAny) return;
    const next: ColumnMapping = {};
    for (const v of draft.variables) {
      next[v.key] = autoMatchColumn(v.key, csv.headers) ?? (v.key === "email" ? csv.emailColumnGuess : null);
    }
    setMapping(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csv]);

  const sample = useMemo(() => csv?.rows[0] ?? {}, [csv]);

  if (!csv) {
    return (
      <Shell>
        <div className="page">
          <Stepper active={2} />
          <Note kind="warn" style={{ marginBottom: 20 }}>No CSV uploaded yet.</Note>
          <StepFoot onBack={() => nav("/campaign/upload")}>
            <button className="btn btn-pri" onClick={() => nav("/campaign/upload")}>Go to upload</button>
          </StepFoot>
        </div>
      </Shell>
    );
  }

  const emailMapped = !!draft.mapping["email"];
  const setCol = (key: string, col: string) => setMapping({ ...draft.mapping, [key]: col || null });
  const emailCol = draft.mapping["email"];
  const to = emailCol ? (sample[emailCol] ?? "—") : "—";
  const subject = mergeText(draft.subject || "Your {{course}} schedule", sample, draft.mapping, false).text;
  const body = draft.bodyHtml
    ? mergeText(draft.bodyHtml, sample, draft.mapping, true).text
    : mergeText("<p>Hi {{name | there}}, you're invited to this week's <b>{{course}}</b> session…</p>", sample, draft.mapping, true).text;

  return (
    <Shell>
      <div className="page">
        <Stepper active={2} />
        <Masthead
          label="Step 3 · FR#4"
          title="Map your columns"
          sub={<>Confirm which column is the email and which feeds each variable. Handles messy headers like <span className="kbd">First Name</span> vs <span className="kbd">name</span>.</>}
        />
        <div className="wizard even">
          <div className="panel flush">
            <table className="tbl">
              <thead><tr><th>Variable</th><th>CSV column</th><th>Sample</th></tr></thead>
              <tbody>
                {draft.variables.map((v) => {
                  const col = draft.mapping[v.key] ?? "";
                  const val = col ? (sample[col] ?? "") : "";
                  return (
                    <tr key={v.key}>
                      <td>
                        <span className="var">{v.key}</span>
                        {v.required && <span className="pill" style={{ marginLeft: 6 }}>required</span>}
                      </td>
                      <td>
                        <div style={{ position: "relative", maxWidth: 240 }}>
                          <select className="sel" value={col} onChange={(e) => setCol(v.key, e.target.value)} style={{ color: col ? "var(--ink)" : "var(--faint)" }}>
                            <option value="">{v.required ? "— select a column —" : "— not mapped —"}</option>
                            {csv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--gray-2)" }}><IconChevronDown s={14} /></span>
                        </div>
                      </td>
                      <td>{col ? <span className="mono">{val || <em className="faint">blank → fallback</em>}</span> : <span className="faint">uses fallback</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="ctx">
            <div className="cx">
              <span className="lbl">Resulting first recipient</span>
              <MailWindow to={String(to)} subject={subject} bodyHtml={body} footer={false} compact />
            </div>
            <div className="cx soft">
              <Note kind="info" bare>Trailing spaces in headers are normalized automatically. Nothing sends until the <b>email</b> column is mapped; unmapped optional variables use their fallback.</Note>
            </div>
          </div>
        </div>

        <StepFoot onBack={() => nav("/campaign/upload")}>
          <button className="btn btn-pri" disabled={!emailMapped} onClick={() => nav("/campaign/compose")}>Write the email</button>
        </StepFoot>
      </div>
    </Shell>
  );
}
