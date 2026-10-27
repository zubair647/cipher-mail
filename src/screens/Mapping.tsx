import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead, StepNav, ActionBar } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { autoMatchColumn } from "../lib/csv";
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
      <div className="container container-narrow">
        <StepNav active={2} />
        <div className="banner banner-warn"><span className="ico">!</span><span>No CSV uploaded yet.</span></div>
        <ActionBar onBack={() => nav("/campaign/upload")} primary={<button className="btn btn-primary" onClick={() => nav("/campaign/upload")}>Go to upload</button>} />
      </div>
    );
  }

  const emailMapped = !!draft.mapping["email"];
  const setCol = (key: string, col: string) => setMapping({ ...draft.mapping, [key]: col || null });

  return (
    <div className="container">
      <StepNav active={2} />
      <ScreenHead
        eyebrow="Step 3 · FR#4"
        title="Map your columns"
        sub={<>Confirm which column is the email and which feeds each variable. Handles messy headers like <code className="mono">First Name</code> vs <code className="mono">name</code>.</>}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#faf9f6", textAlign: "left" }}>
              <Th>Variable</Th><Th>CSV column</Th><Th>Sample</Th>
            </tr>
          </thead>
          <tbody>
            {draft.variables.map((v) => {
              const col = draft.mapping[v.key] ?? "";
              const val = col ? (sample[col] ?? "") : "";
              return (
                <tr key={v.key} style={{ borderTop: "1px solid var(--hairline)" }}>
                  <Td>
                    <code className="mono">{`{{${v.key}}}`}</code>
                    {v.required && <span className="chip chip-req" style={{ marginLeft: 8, fontSize: 11 }}>required</span>}
                  </Td>
                  <Td>
                    <select className="select" value={col} onChange={(e) => setCol(v.key, e.target.value)} style={{ maxWidth: 240 }}>
                      <option value="">{v.required ? "— select a column —" : "— not mapped — uses fallback"}</option>
                      {csv.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </Td>
                  <Td>
                    {col ? <span className="mono muted">{val || <em>blank → fallback</em>}</span> : <span className="muted-2">—</span>}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="banner banner-info" style={{ marginTop: 16 }}>
        <span className="ico">i</span>
        <span>
          Trailing spaces in headers are normalized automatically. Unmapped optional variables use their fallback.
          Nothing sends until the email column is mapped.
        </span>
      </div>

      <ActionBar
        onBack={() => nav("/campaign/upload")}
        primary={
          <button className="btn btn-primary" disabled={!emailMapped} onClick={() => nav("/campaign/compose")}>
            Write the email
          </button>
        }
      />
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => <th style={{ padding: "11px 16px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>{children}</th>;
const Td = ({ children }: { children: React.ReactNode }) => <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>{children}</td>;
