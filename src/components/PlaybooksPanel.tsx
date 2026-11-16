import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SDRAgentConfigurator } from "./sdr/SDRAgentConfigurator";
import { SDRPreferencesService } from "../services/sdrPreferencesService";
import { SDRUserPreferences } from "../types/sdr-preferences";
import { useAIStream } from "../hooks/useAIStream";
import { StreamingOutput } from "./ui/StreamingOutput";
import { asArr, asObj, asStr, joinSections } from "../utils/partialText";

interface PlaybooksResponse {
  dealId?: string;
  contactId?: string;
  top_scripts?: any[];
  objections?: any[];
  followups?: any[];
  summary?: string;
  data_basis?: string;
  win_factors?: string[];
  history?: { won: number; lost: number; open: number };
  raw?: any;
}

export const PlaybooksPanel: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const [dealId, setDealId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const live = useAIStream<PlaybooksResponse>();
  const loading = live.isStreaming;
  const data = live.state.result;
  const error = formError || live.state.error;
  const [showSettings, setShowSettings] = useState(false);
  const [userPreferences, setUserPreferences] = useState<SDRUserPreferences | null>(null);

  // Playbook sections as they are written (partial structured output)
  const streamText = () => {
    const p = asObj(live.state.partial);
    const list = (title: string, items: unknown, fmt: (o: any) => string) => {
      const lines = asArr(items).map((i) => fmt(asObj(i))).filter(Boolean);
      return lines.length ? `${title}\n${lines.map((l) => `- ${l}`).join("\n")}` : "";
    };
    return joinSections([
      asStr(p.summary),
      list("Top scripts", p.top_scripts, (o) => [asStr(o.name), asStr(o.script)].filter(Boolean).join(": ")),
      list("Objections", p.objections, (o) => [asStr(o.objection), asStr(o.response)].filter(Boolean).join(" -> ")),
      list("Follow-ups", p.followups, (o) => [asStr(o.timing), asStr(o.message)].filter(Boolean).join(": ")),
    ]);
  };

  const generatePlaybooks = async () => {
    setFormError(null);
    live.reset();

    if (!contactId && !dealId) {
      setFormError("Enter at least a contact ID or deal ID.");
      return;
    }

    await live.runFunction("/.netlify/functions/playbooks-ai", {
      contactId: contactId || undefined,
      dealId: dealId || undefined
    });
  };

  const renderList = (title: string, items?: any[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div
        style={{
          marginBottom: 12,
          padding: 8,
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: "#ffffff"
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "#718096",
            marginBottom: 4
          }}
        >
          {title}
        </div>
        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {typeof item === "string" ? (
                item
              ) : item && typeof item === "object" && ("script" in item || "response" in item || "message" in item) ? (
                <div>
                  <strong>{item.name || item.objection || [item.timing, item.channel].filter(Boolean).join(" · ")}</strong>
                  <div style={{ whiteSpace: "pre-wrap", color: "#4a5568" }}>{item.script || item.response || item.message}</div>
                  {item.when_to_use && <div style={{ fontSize: 12, color: "#718096" }}>{item.when_to_use}</div>}
                </div>
              ) : (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    margin: 0
                  }}
                >
                  {JSON.stringify(item, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        color: "#1a202c",
        marginTop: 24
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>📘 Playbooks AI</h2>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid #cbd5e0',
            background: '#f7fafc',
            color: '#4a5568',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
          title="Configure Playbooks Settings"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#4a5568" }}>
        Generate AI sales playbooks for this contact / deal – best scripts, objection
        responses, follow-up patterns, and "why deals are won" insights.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 8px",
            borderRadius: 8,
            background: "#fff5f5",
            color: "#c53030",
            fontSize: 12
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 12
        }}
      >
        <div style={{ flex: "0 0 260px" }}>
          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4
              }}
            >
              Contact ID (optional)
            </label>
            <input
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              placeholder="Enter contact UUID"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e0",
                fontSize: 13
              }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                marginBottom: 4
              }}
            >
              Deal ID (optional)
            </label>
            <input
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              placeholder="Enter deal UUID"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e0",
                fontSize: 13
              }}
            />
          </div>

          <button
            type="button"
            onClick={generatePlaybooks}
            disabled={loading}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "none",
              background: loading ? "#a0aec0" : "#2f855a",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 13,
              cursor: loading ? "default" : "pointer"
            }}
          >
            {loading ? "Generating Playbooks..." : "Generate Playbooks"}
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#f7fafc",
            padding: 10,
            maxHeight: 260,
            overflow: "auto"
          }}
        >
          {loading ? (
            <StreamingOutput
              state={live.state}
              onStop={live.stop}
              display={streamText()}
              placeholder="Building your playbook…"
            />
          ) : !data ? (
            <div style={{ fontSize: 13, color: "#a0aec0" }}>
              Run Playbooks AI to see scripts, objections, and follow-up patterns here.
            </div>
          ) : (
            <>
              {data.summary && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: 8,
                    borderRadius: 8,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    color: "#4a5568"
                  }}
                >
                  {data.summary}
                </div>
              )}

              {renderList("Top Scripts", data.top_scripts)}
              {renderList("Top Objections & Responses", data.objections)}
              {renderList("Follow-Up Patterns", data.followups)}
              {renderList("Why Deals Like This Are Won", data.win_factors)}
              {data.data_basis && (
                <div style={{ fontSize: 12, color: "#718096" }}>{data.data_basis}</div>
              )}
            </>
          )}
        </div>
      </div>

      {showSettings && (
        <SDRAgentConfigurator
          agentId="playbooks-ai"
          agentName="Playbooks AI"
          currentConfig={userPreferences || {}}
          onSave={async (config) => {
            const userId = 'demo-user';
            await SDRPreferencesService.saveUserPreferences(userId, config);
            setUserPreferences(config);
          }}
          onClose={() => setShowSettings(false)}
          onReset={async () => {
            const userId = 'demo-user';
            setUserPreferences(SDRPreferencesService.getDefaultPreferences(userId, 'playbooks-ai'));
          }}
        />
      )}
    </div>
  );
};