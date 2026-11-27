import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SDRAgentConfigurator } from "./sdr/SDRAgentConfigurator";
import { SDRPreferencesService } from "../services/sdrPreferencesService";
import { SDRUserPreferences } from "../types/sdr-preferences";
import { useAIStream } from "../hooks/useAIStream";
import { StreamingOutput } from "./ui/StreamingOutput";
import { asObj, asStr } from "../utils/partialText";

interface VoiceAgentResponse {
  contactId?: string;
  script?: string;
  audioUrl?: string;
  audioBase64?: string;
  audioMime?: string;
  audioError?: string;
  debug?: any;
}

export const VoiceAgentPanel: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const [script, setScript] = useState("");
  const [withAudio, setWithAudio] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const live = useAIStream<VoiceAgentResponse>();
  const loading = live.isStreaming;
  const result = live.state.result;
  const error = formError || live.state.error;
  const [showSettings, setShowSettings] = useState(false);
  const [userPreferences, setUserPreferences] = useState<SDRUserPreferences | null>(null);

  const handleGenerate = async () => {
    setFormError(null);
    live.reset();

    if (!contactId) {
      setFormError("Please enter a contact ID.");
      return;
    }
    if (!script.trim()) {
      setFormError("Please enter the script or talking points.");
      return;
    }

    // The voice script streams in; with "Also create audio" it is read aloud (text-to-speech) once it passed moderation.
    await live.runFunction("/.netlify/functions/voice-agent", { contactId, script, tts: withAudio });
  };

  const audioSrc = result?.audioBase64 ? `data:${result.audioMime || "audio/mpeg"};base64,${result.audioBase64}` : result?.audioUrl;

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        color: "#1a202c",
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
            color: '#4a5568',
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

      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 8 }}>
        <input type="checkbox" checked={withAudio} onChange={(e) => setWithAudio(e.target.checked)} />
        Also create audio (text-to-speech)
      </label>

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
        {loading ? "Writing Voice Script..." : "Generate Voice Message"}
      </button>

      {loading && (
        <StreamingOutput
          state={live.state}
          onStop={live.stop}
          display={asStr(asObj(live.state.partial).script)}
          placeholder="Writing the voice script…"
          className="mb-2"
        />
      )}

      {result && !loading && (
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

          {audioSrc ? (
            <div style={{ marginBottom: 8 }}>
              <audio controls src={audioSrc} style={{ width: "100%" }} />
            </div>
          ) : null}
          {result.audioError && (
            <div style={{ fontSize: 12, color: "#c53030", marginBottom: 6 }}>{result.audioError}</div>
          )}

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