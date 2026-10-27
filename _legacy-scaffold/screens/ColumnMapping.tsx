import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHead, Banner } from '../components/ui';

export default function ColumnMappingScreen() {
  const { campaign, patchCampaign } = useApp();
  const navigate = useNavigate();
  const csv = campaign.csv;

  if (!csv) {
    return (
      <>
        <PageHead kicker="Step 3 — Column mapping" title="No CSV yet." />
        <button className="btn btn-primary" onClick={() => navigate('/campaign/upload')}>
          Upload a CSV
        </button>
      </>
    );
  }

  const { mapping } = campaign;

  function setEmailColumn(col: string) {
    patchCampaign({ mapping: { ...mapping, emailColumn: col || null } });
  }

  function setVarColumn(key: string, col: string) {
    const next = { ...mapping.variableToColumn };
    if (col) next[key] = col;
    else delete next[key];
    patchCampaign({ mapping: { ...mapping, variableToColumn: next } });
  }

  const canContinue = Boolean(mapping.emailColumn);

  return (
    <>
      <PageHead
        kicker="Step 3 — Column mapping"
        title="Match CSV columns to variables."
        subtitle={`Detected headers: ${csv.headers.join(', ')}`}
      />

      <div className="stack">
        <div className="field">
          <label>Email address (required)</label>
          <select
            className="input"
            value={mapping.emailColumn ?? ''}
            onChange={(e) => setEmailColumn(e.target.value)}
          >
            <option value="">— choose the email column —</option>
            {csv.headers.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        {campaign.variables.map((v) => (
          <div className="field" key={v.key}>
            <label>
              <span className="chip" style={{ marginRight: 8 }}>{`{{${v.key}}}`}</span>
              {v.label}
            </label>
            <select
              className="input"
              value={mapping.variableToColumn[v.key] ?? ''}
              onChange={(e) => setVarColumn(v.key, e.target.value)}
            >
              <option value="">— not personalized —</option>
              {csv.headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!canContinue && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Banner variant="warn">Map the email column before continuing — nothing sends without it.</Banner>
        </div>
      )}

      <div className="footer-bar">
        <button className="btn btn-secondary" onClick={() => navigate('/campaign/upload')}>
          <ArrowLeft size={16} /> Back
        </button>
        <button className="btn btn-primary" disabled={!canContinue} onClick={() => navigate('/campaign/compose')}>
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
