import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, Stepper, Masthead, StepFoot, Note } from "../components/common";
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

  return (
    <Shell>
      <div className="page">
        <Stepper active={0} />
        <Masthead
          label="Step 1 · FR#2"
          title="Define your merge variables"
          sub={<>These become the columns your CSV must contain. Use them in the mail as <span className="var">{"{{name}}"}</span>.</>}
        />
        <div className="wizard">
          <div className="panel">
            <span className="lbl">Variables in this campaign</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
              {vars.map((v) =>
                v.required ? (
                  <span key={v.key} className="chip">{`{{${v.key}}}`}<span className="req">required</span></span>
                ) : (
                  <span key={v.key} className="chip">{`{{${v.key}}}`}<span className="x" onClick={() => remove(v.key)} title="Remove">✕</span></span>
                )
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                className="input"
                placeholder="Add a custom variable, e.g. mentor"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-sec" onClick={add} disabled={!custom.trim()}>+ Add custom</button>
            </div>
          </div>

          <div className="ctx">
            <div className="cx soft">
              <span className="lbl">CSV columns expected</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {vars.map((v) => (
                  <div key={v.key} style={{ fontFamily: "var(--mono)", fontSize: 13.5, color: "var(--ink)", background: "#fff", border: "1px solid var(--line-2)", borderRadius: 9, padding: "11px 13px" }}>
                    {v.key}{v.required && <span style={{ color: "var(--gray-2)", fontWeight: 400 }}> · required</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="cx">
              <Note kind="info" bare>
                <b>email</b> is always required and can't be removed. Optional variables that a recipient's row leaves blank fall back to a default or a pipe fallback like <span className="var">{"{{name | there}}"}</span>.
              </Note>
            </div>
          </div>
        </div>

        <StepFoot backLabel="Home" onBack={() => nav("/")}>
          <button className="btn btn-ghost" onClick={() => nav("/campaign/upload")}>Skip</button>
          <button className="btn btn-pri" onClick={() => nav("/campaign/upload")}>Continue to upload</button>
        </StepFoot>
      </div>
    </Shell>
  );
}
