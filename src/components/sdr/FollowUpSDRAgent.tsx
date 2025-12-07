import React, { useState } from "react";
import { Settings, MessageSquare } from "lucide-react";
import { SDRAgentConfigurator } from "./SDRAgentConfigurator";

interface FollowUpResponse {
  contactId: string;
  subject: string;
  body: string;
  sent: boolean;
  followUpNumber: number;
  debug?: any;
}

export const FollowUpSDRAgent: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const [followUpNumber, setFollowUpNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FollowUpResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleSend = async () => {
    setError(null);
    setResult(null);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/follow-up-sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, followUpNumber })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Follow-up request failed");
      }

      const json = (await res.json()) as FollowUpResponse;
      setResult(json);
    } catch (e: any) {
      console.error("[FollowUpSDRAgent] error:", e);
      setError(e.message || "Failed to send follow-up");
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>📧 Follow-Up SDR</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Follow-Up SDR Settings"
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
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#4a5568" }}>
        Send smart follow-up emails based on previous outreach or silence.
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
          Follow-Up Number
        </label>
        <select
          value={followUpNumber}
          onChange={(e) => setFollowUpNumber(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e0",
            fontSize: 13,
            background: "#f7fafc"
          }}
        >
          <option value={1}>1st Follow-Up</option>
          <option value={2}>2nd Follow-Up</option>
          <option value={3}>3rd Follow-Up</option>
          <option value={4}>4th Follow-Up</option>
          <option value={5}>5th Follow-Up</option>
        </select>
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={loading}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#a0aec0" : "#38a169",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? "default" : "pointer",
          marginBottom: 10
        }}
      >
        {loading ? "Sending Follow-Up..." : "Send Follow-Up"}
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

          <div style={{ marginBottom: 8 }}>
            <strong>Follow-Up #{result.followUpNumber}</strong>
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Subject:</strong> {result.subject}
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Status:</strong> {result.sent ? "✅ Sent" : "❌ Failed"}
          </div>

          <div>
            <strong>Message:</strong>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                marginTop: 4,
                background: "#edf2f7",
                padding: 8,
                borderRadius: 6
              }}
            >
              {result.body}
            </pre>
          </div>
        </div>
      )}

      {showSettings && (
        <SDRAgentConfigurator
          agentId="follow-up-sdr"
          agentName="Follow-Up SDR"
          onSave={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};