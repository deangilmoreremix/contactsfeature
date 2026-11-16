import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SDRAgentConfigurator } from "./sdr/SDRAgentConfigurator";
import { useAIStream } from "../hooks/useAIStream";
import { StreamingOutput } from "./ui/StreamingOutput";
import { asObj, asStr, joinSections } from "../utils/partialText";

interface MoodResponse {
  contactId: string;
  mood: string;
  reason?: string;
  rationale?: string;
  sample_message?: string;
  contact: any;
  deal: any;
}

export const MoodPanel: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const live = useAIStream<MoodResponse>();
  const loading = live.isStreaming;
  const data = live.state.result;
  const [formError, setFormError] = useState<string | null>(null);
  const error = formError || live.state.error;
  const [showSettings, setShowSettings] = useState(false);

  const fetchMood = async () => {
    setFormError(null);
    live.reset();

    if (!contactId) {
      setFormError("Please enter a contact ID.");
      return;
    }

    // The mood itself is rule based; the rationale and a sample opener in that tone are written live.
    await live.runFunction("/.netlify/functions/mood-preview", { contactId });
  };

  const streamText = () => {
    const p = asObj(live.state.partial);
    return joinSections([asStr(p.rationale), p.sample_message ? `Sample opener:\n${asStr(p.sample_message)}` : ""]);
  };

  const moodLabel = (mood?: string) => {
    switch (mood) {
      case "aggressive":
        return "🔥 Aggressive";
      case "friendly":
        return "🙂 Friendly";
      case "calm":
        return "🧊 Calm";
      case "precision":
        return "🎯 Precision";
      case "insight":
        return "🧠 Insight";
      case "urgent":
        return "⚡ Urgent";
      default:
        return mood || "unknown";
    }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>🎭 Mood Engine</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Mood Settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            color: '#6b7280',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          <Settings size={12} />
          Settings
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 16, fontSize: 14, color: "#4a5568" }}>
        See which mood the AI will use for messaging this contact based on risk and context.
      </p>

      <div style={{ marginBottom: 12, maxWidth: 360 }}>
        <label
          style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}
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
            fontSize: 14
          }}
        />
      </div>

      <button
        type="button"
        onClick={fetchMood}
        disabled={loading}
        style={{
          padding: "9px 14px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#a0aec0" : "#dd6b20",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? "default" : "pointer",
          marginBottom: 12
        }}
      >
        {loading ? "Computing Mood..." : "Preview Mood"}
      </button>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 8,
            background: "#fff5f5",
            color: "#c53030",
            fontSize: 13
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <StreamingOutput
          state={live.state}
          onStop={live.stop}
          display={streamText()}
          placeholder="Working out the tone…"
          className="mb-3"
        />
      )}

      {data && (
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
              padding: 10,
              borderRadius: 8,
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
              Current Mood
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {moodLabel(data.mood)}
            </div>
            {data.reason && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#4a5568" }}>{data.reason}</p>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              padding: 8,
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
              Deal Context
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                margin: 0
              }}
            >
              {JSON.stringify({ contact: data.contact, deal: data.deal }, null, 2)}
            </pre>
            {(data.rationale || data.sample_message) && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    color: "#718096",
                    margin: "10px 0 4px"
                  }}
                >
                  Tone preview
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: "#4a5568" }}>{data.rationale}</p>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0 }}>{data.sample_message}</pre>
              </>
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <SDRAgentConfigurator
          agentId="mood"
          agentName="Mood Engine"
          onSave={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
