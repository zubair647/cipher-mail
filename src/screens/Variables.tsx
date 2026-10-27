import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHead, StepNav, ActionBar } from "../components/common";
import { useCampaign } from "../state/CampaignContext";

export function Variables() {
  const nav = useNavigate();
  const { draft, setVariables } = useCampaign();
  const [custom, setCustom] = useState("");

  const vars = draft.variables;
  const add = () => {
    const key = custom.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!key || vars.find((v) => v.key === key)) return;
    setVariables([...vars, { key, custom: true }]);
    setCustom("");
  };
  const remove = (key: string) => setVariables(vars.filter((v) => v.key !== key));

  const expected = vars.map((v) => v.key).join(", ");

  return (
    <div className="container container-narrow">
      <StepNav active={0} />
      <ScreenHead
        eyebrow="Step 1 · FR#2"
        title="Define your merge variables"
        sub={<>These become the columns your CSV must contain. Use them in the mail as <code className="mono">{"{{name}}"}</code>.</>}
      />

      <div className="card card-pad stack-16">
        <span className="label">Variables in this campaign</span>
        <div className="row wrap" style={{ gap: 8 }}>
          {vars.map((v) =>
            v.required ? (
              <span key={v.key} className="chip chip-req mono">{`{{${v.key}}}`} · required</span>
            ) : (
              <span key={v.key} className="chip mono">
                {`{{${v.key}}}`}
                <span className="chip-x" onClick={() => remove(v.key)} title="Remove">✕</span>
              </span>
            )
          )}
        </div>

        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Add a custom variable, e.g. mentor"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            style={{ maxWidth: 280 }}
          />
          <button className="btn btn-ghost" onClick={add} disabled={!custom.trim()}>+ Add custom</button>
        </div>

        <hr className="divider" />
        <div className="stack-8">
          <span className="label">CSV columns expected</span>
          <code className="mono" style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{expected}</code>
        </div>
      </div>

      <ActionBar
        backLabel="Home"
        onBack={() => nav("/")}
        primary={
          <>
            <button className="btn-link" onClick={() => nav("/campaign/upload")}>Skip</button>
            <button className="btn btn-primary" onClick={() => nav("/campaign/upload")}>Continue to upload</button>
          </>
        }
      />
    </div>
  );
}
