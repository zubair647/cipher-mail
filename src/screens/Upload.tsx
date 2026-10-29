import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Stepper, Masthead, StepFoot, Note } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { parseCsvFile } from "../lib/csv";

// A ready-made sample recipients sheet users can copy or download.
const SAMPLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1T7Lg3QvbLKPOxi53OIgaNnxAdvPhAayIB-VXBfn7Ndw/edit?usp=sharing";
const SAMPLE_CSV = "email,name\naditi@example.com,Aditi\nkaran@example.com,Karan\nrohan@example.com,Rohan\n";

export function Upload() {
  const nav = useNavigate();
  const { draft, setCsv } = useCampaign();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [parsing, setParsing] = useState(false);
  const csv = draft.csv;

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) return;
    setParsing(true);
    try {
      const parsed = await parseCsvFile(file);
      setCsv(parsed);
    } finally {
      setParsing(false);
    }
  };

  const hasEmail = csv ? !!csv.emailColumnGuess : false;
  const canContinue = !!csv && csv.rows.length > 0;
  const noEmail = csv?.warnings.find((w) => w.kind === "no-email-column");
  const headers = csv?.headers ?? [];
  const previewRows = csv?.rows.slice(0, 3) ?? [];

  return (
    <Shell>
      <div className="page">
        <Stepper active={1} />
        <Masthead label="Step 2 · FR#3" title="Upload your recipients" sub="A CSV with one row per recipient. Read in memory only — it never touches disk." right={<CsvHelp />} />

        <div className="wizard">
          <div>
            {!csv ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => inputRef.current?.click()}
                style={{ border: `1.5px dashed ${drag ? "var(--accent)" : "var(--line)"}`, background: drag ? "var(--accent-tint)" : "#fff", borderRadius: 16, padding: "56px 24px", textAlign: "center", cursor: "pointer" }}
              >
                <span style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-tint)", color: "var(--accent-600)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 15V3M7 8l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                </span>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{parsing ? "Reading…" : "Drop a CSV here, or click to browse"}</div>
                <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 6 }}>One row per recipient · parsed in memory, never saved to disk</div>
              </div>
            ) : (
              <>
                <div style={{ border: `1.5px solid ${hasEmail ? "var(--accent)" : "var(--red)"}`, background: hasEmail ? "var(--accent-tint)" : "var(--red-bg)", borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
                  <span style={{ width: 46, height: 46, borderRadius: 12, background: "#fff", color: hasEmail ? "var(--accent-600)" : "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{csv.fileName}</div>
                    <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 3 }}>{csv.sizeLabel} · <b style={{ color: hasEmail ? "var(--green)" : "var(--ink)" }}>{csv.rows.length} rows found</b></div>
                  </div>
                  <button className="btn btn-line btn-sm" onClick={() => { setCsv(null); if (inputRef.current) inputRef.current.value = ""; }}>Replace</button>
                </div>
                <span className="lbl">{noEmail ? "Headers we found" : "Parsed preview · first 3 rows"}</span>
                <div className="panel flush">
                  <table className="tbl">
                    <thead><tr>{headers.slice(0, 4).map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>{headers.slice(0, 4).map((h) => <td key={h} className={h === csv.emailColumnGuess ? "em" : ""}>{row[h] ?? ""}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="ctx">
            {csv ? (
              <>
                <div className="cx">
                  <span className="lbl">Validation</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {csv.emailColumnGuess && <Note kind="ok" style={{ padding: "12px 14px" }}>Email column detected{csv.hadBom ? " · UTF-8 BOM stripped" : ""}</Note>}
                    {csv.warnings.filter((w) => w.kind !== "no-email-column").map((w, i) => (
                      <Note key={i} kind="warn" style={{ padding: "12px 14px" }}>{w.message}{w.detail ? <> — {w.detail}</> : null}</Note>
                    ))}
                    {noEmail && <Note kind="err" style={{ padding: "12px 14px" }}><b>No email column found.</b> Add an <span className="kbd">email</span> column and re-upload, or map one on the next step.</Note>}
                  </div>
                </div>
                <div className="cx soft">
                  <Note kind="info" bare>De-duplication happens on upload. Recipient rows live only in memory for this session — nothing is written to disk or a server.</Note>
                </div>
              </>
            ) : (
              <div className="cx soft"><Note kind="info" bare>Your CSV is parsed entirely in the browser. It never touches disk or a server, and is cleared when you close the tab.</Note></div>
            )}
          </div>
        </div>

        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        <StepFoot onBack={() => nav("/campaign/variables")}>
          <button className="btn btn-pri" disabled={!canContinue} title={!hasEmail ? "Map an email column on the next step" : undefined} onClick={() => nav("/campaign/map")}>Map columns</button>
        </StepFoot>
      </div>
    </Shell>
  );
}

/** "i" helper — not sure what a recipients CSV looks like? Open or download a sample. */
function CsvHelp() {
  const [open, setOpen] = useState(false);

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cipher-mail-sample.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="btn btn-sec btn-sm"
        onClick={() => setOpen((o) => !o)}
        title="Not sure what the CSV should look like?"
        style={{ gap: 7 }}
      >
        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--accent-tint)", color: "var(--accent-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, fontStyle: "italic" }}>i</span>
        CSV format help
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 110 }} />
          <div className="popover" style={{ position: "absolute", right: 0, top: 44, width: 300, textAlign: "left" }}>
            <span className="lbl" style={{ marginBottom: 8 }}>New to recipient CSVs?</span>
            <p style={{ fontSize: 13, color: "var(--gray)", margin: "0 0 14px", lineHeight: 1.55 }}>
              A CSV needs an <span className="var">email</span> column, plus a column for each variable (e.g. <span className="var">name</span>). Copy our ready-made sample and fill in your own rows.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a className="btn btn-pri btn-sm btn-block" href={SAMPLE_SHEET_URL} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Open sample sheet ↗</a>
              <button className="btn btn-line btn-sm btn-block" onClick={downloadSample}>Download sample CSV</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
