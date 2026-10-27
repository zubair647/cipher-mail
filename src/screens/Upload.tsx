import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead, StepNav, ActionBar } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { parseCsvFile } from "../lib/csv";
import type { ParsedCsv } from "../lib/types";

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

  return (
    <div className="container container-narrow">
      <StepNav active={1} />
      <ScreenHead
        eyebrow="Step 2 · FR#3"
        title="Upload your recipients"
        sub="A CSV with one row per recipient. Read in memory only — it never touches disk."
      />

      {!csv ? (
        <div
          className="card"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          style={{
            padding: "48px 24px", textAlign: "center", cursor: "pointer",
            borderStyle: "dashed", borderColor: drag ? "var(--orange)" : "var(--hairline)",
            background: drag ? "var(--orange-tint)" : "#fff",
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 8 }}>⬆</div>
          <div className="strong" style={{ fontSize: 15 }}>{parsing ? "Reading…" : "Drop a CSV here, or click to browse"}</div>
          <div className="small muted" style={{ marginTop: 6 }}>One row per recipient · parsed in memory, never saved to disk</div>
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="card card-pad stack-16">
          <div className="row-between">
            <div className="row" style={{ gap: 12 }}>
              <span style={{ fontSize: 22 }}>📄</span>
              <div className="stack-4">
                <span className="strong">{csv.fileName}</span>
                <span className="small muted">{csv.sizeLabel} · {csv.rows.length} rows found</span>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => { setCsv(null); if (inputRef.current) inputRef.current.value = ""; }}>Replace</button>
          </div>

          <ValidationList csv={csv} />
        </div>
      )}

      <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      <ActionBar
        onBack={() => nav("/campaign/variables")}
        primary={
          <button
            className="btn btn-primary"
            disabled={!canContinue}
            title={!hasEmail ? "Map an email column on the next step" : undefined}
            onClick={() => nav("/campaign/map")}
          >
            Map columns
          </button>
        }
      />
    </div>
  );
}

function ValidationList({ csv }: { csv: ParsedCsv }) {
  const noEmail = csv.warnings.find((w) => w.kind === "no-email-column");
  return (
    <div className="stack-8">
      {csv.hadBom && (
        <div className="banner banner-ok"><span className="ico">✓</span><span>UTF-8 BOM stripped automatically.</span></div>
      )}
      {csv.emailColumnGuess && (
        <div className="banner banner-ok"><span className="ico">✓</span><span>Email column detected: <code className="mono">{csv.emailColumnGuess}</code></span></div>
      )}
      {csv.warnings.filter((w) => w.kind !== "no-email-column").map((w, i) => (
        <div key={i} className="banner banner-warn">
          <span className="ico">!</span>
          <span>{w.message}{w.detail ? <> <span className="muted">— {w.detail}</span></> : null}</span>
        </div>
      ))}
      {noEmail && (
        <div className="banner banner-error">
          <span className="ico">!</span>
          <span>
            <span className="strong">{noEmail.message}</span>{" "}
            {noEmail.detail} You can still map one on the next step, or add an email column and re-upload.
          </span>
        </div>
      )}
    </div>
  );
}
