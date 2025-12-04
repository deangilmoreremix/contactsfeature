import React, { useState } from "react";

interface VideoRunResponse {
  job_id: string;
  script: string;
  mood: string;
  template: string;
}

export const VideoAgentPanel: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const [template, setTemplate] = useState("explainer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VideoRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setError(null);
    setResult(null);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/video-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, template })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      const data = (await res.json()) as VideoRunResponse;
      setResult(data);
    } catch (e: any) {
      console.error("VideoAgent error:", e);
      setError(e.message || "Something went wrong");
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
        maxWidth: 640
      }}
    >
      <h2 style={{ marginBottom: 8 }}>🎥 Video Agent</h2>
      <p style={{ marginTop: 0, marginBottom: 16, fontSize: 14, color: "#4a5568" }}>
        Generate a personalized video script and queue a video job for this contact.
      </p>

      <div style={{ marginBottom: 12 }}>
        <label
          style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}
        >
          Contact ID
        </label>
        <input
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          placeholder="Enter contact UUID from Supabase"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e0",
            fontSize: 14
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label
          style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}
        >
          Video Template
        </label>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e0",
            fontSize: 14,
            background: "#f7fafc"
          }}
        >
          <option value="explainer">Explainer Video</option>
          <option value="loom-style">Loom-Style Walkthrough</option>
          <option value="followup">Follow-Up Video</option>
          <option value="onboarding">Onboarding / Welcome Video</option>
        </select>
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#a0aec0" : "#38a169",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 14,
          cursor: loading ? "default" : "pointer",
          marginBottom: 12
        }}
      >
        {loading ? "Generating & Queuing Video..." : "Generate & Queue Video"}
      </button>

      {error && (
        <div
          style={{
            marginTop: 8,
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

      {result && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#f7fafc",
            border: "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            ✅ <strong>Job queued:</strong> {result.job_id}
          </div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            🎬 <strong>Template:</strong> {result.template}
          </div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            😎 <strong>Mood:</strong> {result.mood}
          </div>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#718096",
                marginBottom: 4
              }}
            >
              Generated Script
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 13,
                background: "#edf2f7",
                padding: 8,
                borderRadius: 6,
                maxHeight: 200,
                overflow: "auto",
                margin: 0
              }}
            >
              {result.script}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
