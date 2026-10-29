import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell, IconPlus, IconMail } from "../components/common";
import { useCampaign } from "../state/CampaignContext";
import { getTemplates, deleteTemplate } from "../lib/storage";
import type { Template } from "../lib/types";

export function Templates() {
  const nav = useNavigate();
  const { resetCampaign, loadTemplate } = useCampaign();
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => { setTemplates(getTemplates()); }, []);

  const startNew = () => { resetCampaign(); nav("/campaign/variables"); };
  const openTemplate = (t: Template) => { resetCampaign(); loadTemplate(t); nav("/campaign/variables"); };
  const remove = (id: string) => { deleteTemplate(id); setTemplates(getTemplates()); };

  return (
    <Shell active="templates">
      <div className="page"><div className="canvas">
        <div className="rowb" style={{ alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>Saved campaigns</h1>
            <p style={{ fontSize: 16, color: "var(--gray)", margin: 0 }}>Reusable subject + body + variables, saved on this machine. Upload a new CSV to send again.</p>
          </div>
          <button className="btn btn-pri btn-lg" onClick={startNew}><IconPlus />New campaign</button>
        </div>

        {templates.length === 0 ? (
          <div style={{ padding: "56px 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <span style={{ width: 76, height: 76, borderRadius: 22, background: "var(--accent-tint)", color: "var(--accent-600)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}><IconMail s={34} /></span>
            <h2 className="h2">No saved campaigns yet</h2>
            <p style={{ fontSize: 16, color: "var(--gray)", maxWidth: 420, margin: "0 0 32px", lineHeight: 1.55 }}>
              After you send a campaign, save it from the summary screen to reuse it here. Start a campaign to create your first one.
            </p>
            <button className="btn btn-pri btn-lg" onClick={startNew}><IconPlus />New campaign</button>
          </div>
        ) : (
          <>
            <span className="lbl" style={{ marginBottom: 18 }}>{templates.length} saved</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {templates.map((t) => (
                <div key={t.id} className="tcard" onClick={() => openTemplate(t)}>
                  <span className="ico"><IconMail s={20} /></span>
                  <h4>{t.name}</h4>
                  <p className="mono" style={{ fontSize: 13 }}>{t.subject || "—"}</p>
                  <span className="ft">
                    <span>{t.variables.filter((v) => v !== "email").length} variables</span>
                    <button className="linkbtn" style={{ color: "var(--gray-2)", fontWeight: 500, fontFamily: "var(--sans)" }} onClick={(e) => { e.stopPropagation(); remove(t.id); }}>Delete</button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div></div>
    </Shell>
  );
}
