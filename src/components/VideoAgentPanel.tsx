import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SDRAgentConfigurator } from "./sdr/SDRAgentConfigurator";
import { SDRPreferencesService } from "../services/sdrPreferencesService";
import { SDRUserPreferences } from "../types/sdr-preferences";
import { useAIStream } from "../hooks/useAIStream";
import { StreamingOutput } from "./ui/StreamingOutput";
import { asArr, asObj, asStr, joinSections } from "../utils/partialText";

interface VideoAgentResponse {
  contactId?: string;
  storyboard?: any;
  script?: string;
  videoUrl?: string | null;
  title?: string;
  call_to_action?: string;
  rendering?: { available: boolean; note: string };
  debug?: any;
}

export const VideoAgentPanel: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [goal, setGoal] = useState("demo");
  const [formError, setFormError] = useState<string | null>(null);
  const live = useAIStream<VideoAgentResponse>();
  const loading = live.isStreaming;
  const result = live.state.result;
  const error = formError || live.state.error;
  const [showSettings, setShowSettings] = useState(false);
  const [userPreferences, setUserPreferences] = useState<SDRUserPreferences | null>(null);

  // Script + storyboard as they are written (partial structured output)
  const streamText = () => {
    const p = asObj(live.state.partial);
    const scenes = asArr(p.storyboard).map((x) => {
      const sc = asObj(x);
      return `Scene ${asStr(sc.scene)}${sc.seconds ? ` (${asStr(sc.seconds)}s)` : ""}: ${asStr(sc.visual)}`;
    });
    return joinSections([asStr(p.title), asStr(p.script), scenes.length ? `Storyboard\n${scenes.join("\n")}` : ""]);
  };

  const handleGenerate = async () => {
    setFormError(null);
    live.reset();

    if (!contactId) {
      setFormError("Please enter a contact ID.");
      return;
    }
    if (!productUrl.trim()) {
      setFormError("Please enter the product or landing page URL.");
      return;
    }

    // Streamed script + storyboard. No video file is rendered (no render backend); the result says so.
    await live.runFunction("/.netlify/functions/video-agent", { contactId, productUrl, goal });
  };

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
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>📹 Video Agent</h2>
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
          title="Configure Video Agent Settings"
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#4a5568" }}>
        Auto-generate Loom-style explainer videos and follow-up videos using your product page
        + AI script + Remotion back-end.
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
          Product / Page URL
        </label>
        <input
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          placeholder="https://your-landing-page.com/offer"
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
          Video Goal
        </label>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e0",
            fontSize: 13,
            background: "#f7fafc"
          }}
        >
          <option value="demo">Product Demo</option>
          <option value="followup">Sales Follow-Up</option>
          <option value="overview">High-Level Overview</option>
          <option value="onboarding">Onboarding / Walkthrough</option>
        </select>
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
          background: loading ? "#a0aec0" : "#805ad5",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? "default" : "pointer",
          marginBottom: 10
        }}
      >
        {loading ? "Writing Script..." : "Generate Script & Storyboard"}
      </button>

      {loading && (
        <StreamingOutput
          state={live.state}
          onStop={live.stop}
          display={streamText()}
          placeholder="Writing the script…"
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

          {result.rendering && !result.rendering.available && (
            <div style={{ fontSize: 12, color: "#718096", marginBottom: 6 }}>{result.rendering.note}</div>
          )}

          {result.videoUrl && (
            <div style={{ marginBottom: 8 }}>
              <video
                controls
                src={result.videoUrl}
                style={{ width: "100%", borderRadius: 8 }}
              />
            </div>
          )}

          {result.script && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4
                }}
              >
                Script
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  margin: 0
                }}
              >
                {result.script}
              </pre>
            </>
          )}

          {result.storyboard && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 8,
                  marginBottom: 4
                }}
              >
                Storyboard
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  margin: 0
                }}
              >
                {JSON.stringify(result.storyboard, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SDRAgentConfigurator
          agentId="video-agent"
          agentName="Video Agent"
          currentConfig={userPreferences || {}}
          onSave={async (config) => {
            const userId = 'demo-user';
            await SDRPreferencesService.saveUserPreferences(userId, config);
            setUserPreferences(config);
          }}
          onClose={() => setShowSettings(false)}
          onReset={async () => {
            const userId = 'demo-user';
            const defaultConfig = SDRPreferencesService.getDefaultPreferences(userId, 'video-agent');
            setUserPreferences(defaultConfig);
          }}
        />
      )}
    </div>
  );
};
