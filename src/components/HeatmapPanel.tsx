import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SDRAgentConfigurator } from "./sdr/SDRAgentConfigurator";
import { SDRPreferencesService } from "../services/sdrPreferencesService";
import { SDRUserPreferences } from "../types/sdr-preferences";
import { useAIStream } from "../hooks/useAIStream";
import { StreamingOutput } from "./ui/StreamingOutput";
import { asArr, asObj, asStr, joinSections } from "../utils/partialText";

interface HeatmapDeal {
  deal_id: string;
  title: string | null;
  stage: string | null;
  value: number | null;
  contact_name: string | null;
  risk_score: number;
  reason: string;
  next_action: string;
  assessed?: boolean;
  factors?: any;
  baseline_score?: number;
}

interface HeatmapResponse {
  mode?: "single" | "portfolio";
  dealId?: string;
  risk_score?: number;
  reason?: string;
  next_action?: string;
  factors?: any;
  baseline_score?: number;
  summary?: string | null;
  deals?: HeatmapDeal[];
  message?: string;
}

export const HeatmapPanel: React.FC = () => {
  const [dealId, setDealId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const live = useAIStream<HeatmapResponse>();
  const loading = live.isStreaming;
  const result = live.state.result;
  const error = formError || live.state.error;
  const [showSettings, setShowSettings] = useState(false);
  const [userPreferences, setUserPreferences] = useState<SDRUserPreferences | null>(null);

  // The AI's reasoning as it is written: one deal (score, reason, next action) or the portfolio (summary + deals)
  const streamText = () => {
    const p = asObj(live.state.partial);
    const deals = asArr(p.deals).map((d) => {
      const o = asObj(d);
      return `${asStr(o.deal_id).slice(0, 8)} · risk ${asStr(o.risk_score)}${o.reason ? ` · ${asStr(o.reason)}` : ""}${o.next_action ? ` -> ${asStr(o.next_action)}` : ""}`;
    });
    return joinSections([
      p.risk_score != null && `Risk score: ${asStr(p.risk_score)}/100`,
      asStr(p.reason),
      p.next_action ? `Next action: ${asStr(p.next_action)}` : "",
      asStr(p.summary),
      deals.length ? deals.join("\n") : "",
    ]);
  };

  const computeRisk = async () => {
    setFormError(null);
    live.reset();

    // With a deal ID: that deal. Without: every open deal of yours, riskiest first.
    await live.runFunction("/.netlify/functions/deal-heatmap", dealId.trim() ? { dealId: dealId.trim() } : {});
  };

  const riskColor = (score?: number) => {
    if (score == null) return "#a0aec0";
    if (score < 30) return "#38a169"; // green
    if (score < 60) return "#dd6b20"; // orange
    return "#e53e3e"; // red
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
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>🔥 Deal Heatmap & Risk Engine</h2>
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
          title="Configure Heatmap Settings"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#4a5568" }}>
        Compute AI-based risk for any deal using reply frequency, sentiment, stage duration,
        objections, and more.
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

      <div style={{ maxWidth: 360, marginBottom: 10 }}>
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
          placeholder="Leave blank to assess all open deals"
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
        onClick={computeRisk}
        disabled={loading}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#a0aec0" : "#e53e3e",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? "default" : "pointer",
          marginBottom: 12
        }}
      >
        {loading ? "Analyzing..." : dealId.trim() ? "Compute Deal Risk" : "Assess Open Deals"}
      </button>

      {loading && (
        <StreamingOutput
          state={live.state}
          onStop={live.stop}
          display={streamText()}
          placeholder="Reading your deals…"
          className="mb-3"
        />
      )}

      {result && !loading && result.mode === "portfolio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.summary && <p style={{ margin: 0, fontSize: 13, color: "#4a5568" }}>{result.summary}</p>}
          {(result.deals || []).length === 0 && (
            <div style={{ fontSize: 13, color: "#718096" }}>{result.message || "No open deals to assess."}</div>
          )}
          {(result.deals || []).map((d) => (
            <div
              key={d.deal_id}
              style={{ display: "flex", gap: 10, padding: 10, borderRadius: 10, border: "1px solid #e2e8f0", background: "#f7fafc" }}
            >
              <div style={{ width: 20, height: 20, marginTop: 2, flex: "0 0 20px", borderRadius: "999px", background: riskColor(d.risk_score) }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {d.title || d.deal_id.slice(0, 8)} · {d.risk_score}/100
                </div>
                <div style={{ fontSize: 12, color: "#718096" }}>
                  {[d.contact_name, d.stage, d.value != null ? `$${d.value.toLocaleString()}` : null].filter(Boolean).join(" · ")}
                </div>
                {d.reason && <div style={{ fontSize: 12, color: "#4a5568", marginTop: 4 }}>{d.reason}</div>}
                {d.next_action && <div style={{ fontSize: 12, marginTop: 2 }}>Next: {d.next_action}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {result && !loading && result.mode !== "portfolio" && (
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap"
          }}
        >
          <div
            style={{
              flex: "0 0 220px",
              borderRadius: 10,
              padding: 12,
              border: "1px solid #e2e8f0",
              background: "#f7fafc"
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
              Risk Score
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "999px",
                  background: riskColor(result.risk_score)
                }}
              />
              <span style={{ fontSize: 18, fontWeight: 700 }}>
                {result.risk_score ?? "—"}/100
              </span>
            </div>
            {result.reason && (
              <p
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  fontSize: 12,
                  color: "#4a5568"
                }}
              >
                {result.reason}
              </p>
            )}
            {result.next_action && (
              <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12 }}>Next: {result.next_action}</p>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 10,
              padding: 10,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              maxHeight: 220,
              overflow: "auto"
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
              Factors
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                margin: 0
              }}
            >
              {JSON.stringify(result.factors || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SDRAgentConfigurator
          agentId="deal-heatmap"
          agentName="Deal Heatmap"
          currentConfig={userPreferences || {}}
          onSave={async (config) => {
            const userId = 'demo-user';
            await SDRPreferencesService.saveUserPreferences(userId, config);
            setUserPreferences(config);
          }}
          onClose={() => setShowSettings(false)}
          onReset={async () => {
            const userId = 'demo-user';
            const defaultConfig = SDRPreferencesService.getDefaultPreferences(userId, 'deal-heatmap');
            setUserPreferences(defaultConfig);
          }}
        />
      )}
    </div>
  );
};
