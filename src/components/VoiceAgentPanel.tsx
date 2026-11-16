import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SDRAgentConfigurator } from "./sdr/SDRAgentConfigurator";
import { SDRPreferencesService } from "../services/sdrPreferencesService";
import { SDRUserPreferences } from "../types/sdr-preferences";

interface VoiceAgentResponse {
  contactId?: string;
  script?: string;
  audioUrl?: string;
  debug?: any;
}

export const VoiceAgentPanel: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceAgentResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [userPreferences, setUserPreferences] = useState<SDRUserPreferences | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setResult(null);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }
    if (!script.trim()) {
      setError("Please enter the script or talking points.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/voice-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, script })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Voice agent request failed");
      }

      const json = (await res.json()) as VoiceAgentResponse;
      setResult(json);
    } catch (e: any) {
      console.error("[VoiceAgentPanel] error:", e);
      setError(e.message || "Failed to run voice agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        maxWidth: 520,
        flex: "1 1 340px"
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>🎙 Voice Agent</h2>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid #cbd5e0',
            background: '#f7fafc',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
          title="Configure Voice Agent Settings"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#4a5568" }}>
        Convert SDR / AE scripts into voice messages for prospects (e.g., voicemail drops,
        audio follow-ups). Powered by your voice back-end / OpenAI real-time.
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

      <div style={{ marginBottom: 8 }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 4
          }}
        >
          Contact ID
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
          Script / Talking Points
        </label>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={5}
          placeholder="Hi {{name}}, just wanted to quickly walk you through how SmartCRM can..."
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 8,
            border: "1px solid #cbd5e0",
            fontFamily: "system-ui",
            fontSize: 13,
            background: "#f7fafc"
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#a0aec0" : "#2b6cb0",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? "default" : "pointer",
          marginBottom: 10
        }}
      >
        {loading ? "Generating Voice..." : "Generate Voice Message"}
      </button>

      {result && (
        <div
          style={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#f7fafc",
            padding: 8
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#718096",
              marginBottom: 4
            }}
          >
            Result
          </div>

          {result.audioUrl ? (
            <div style={{ marginBottom: 8 }}>
              <audio controls src={result.audioUrl} style={{ width: "100%" }} />
            </div>
          ) : null}

          {result.script && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                margin: 0
              }}
            >
              {result.script}
            </pre>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SDRAgentConfigurator
          agentId="voice-agent"
          agentName="Voice Agent"
          currentConfig={userPreferences || {}}
          onSave={async (config) => {
            // In a real app, you'd get the userId from auth context
            const userId = 'demo-user';
            await SDRPreferencesService.saveUserPreferences(userId, config);
            setUserPreferences(config);
          }}
          onClose={() => setShowSettings(false)}
          onReset={async () => {
            const userId = 'demo-user';
            const defaultConfig = SDRPreferencesService.getDefaultPreferences(userId, 'voice-agent');
            setUserPreferences(defaultConfig);
          }}
        />
      )}
    </div>
  );
};