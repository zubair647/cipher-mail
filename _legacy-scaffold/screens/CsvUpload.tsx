import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, UploadCloud, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseCsv, guessEmailColumn } from '../lib/csv';
import { PageHead, Banner } from '../components/ui';
import type { CsvValidation } from '../lib/types';

export default function CsvUpload() {
  const { campaign, patchCampaign } = useApp();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [validation, setValidation] = useState<CsvValidation | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>(campaign.csv?.fileName ?? '');

  async function handleFile(file: File) {
    setFatal(null);
    const text = await file.text();
    const res = parseCsv(text, file.name);
    if (res.fatal || !res.csv) {
      setFatal(res.fatal ?? 'Could not read this file.');
      setValidation(null);
      return;
    }
    setFileName(file.name);
    setValidation(res.validation);
    // Pre-fill the email-column guess into the mapping.
    patchCampaign({
      csv: res.csv,
      mapping: {
        emailColumn: guessEmailColumn(res.csv.headers),
        variableToColumn: campaign.mapping.variableToColumn,
      },
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  const rowCount = campaign.csv?.rows.length ?? 0;

  return (
    <>
      <PageHead
        kicker="Step 2 — CSV upload"
        title="Upload your recipient list."
        subtitle="Read in memory only — recipient data never touches disk."
      />

      <div
        className={`dropzone ${dragging ? 'drag' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <UploadCloud size={28} style={{ margin: '0 auto var(--space-2)' }} />
        <div style={{ fontWeight: 600 }}>Drop a CSV here, or click to choose</div>
        <p className="text-muted" style={{ marginTop: 4 }}>.csv exported from Excel or Sheets</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {fatal && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Banner variant="warn">We couldn't read this file — {fatal}</Banner>
        </div>
      )}

      {campaign.csv && (
        <div className="stack" style={{ marginTop: 'var(--space-6)' }}>
          <div className="row">
            <FileSpreadsheet size={18} />
            <strong>{fileName}</strong>
            <span className="tag tag-neutral">{rowCount} recipients</span>
          </div>
          {validation?.issues.map((issue, i) => (
            <Banner key={i} variant={issue.level === 'error' ? 'warn' : 'accent'}>
              {issue.message}
            </Banner>
          ))}
        </div>
      )}

      <div className="footer-bar">
        <button className="btn btn-secondary" onClick={() => navigate('/campaign/variables')}>
          <ArrowLeft size={16} /> Back
        </button>
        <button className="btn btn-primary" disabled={!campaign.csv} onClick={() => navigate('/campaign/mapping')}>
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
