import React, { useState, useEffect } from "react";
import { Settings, Shield } from "lucide-react";
import { SDRAgentConfigurator } from "./SDRAgentConfigurator";
import { Contact } from "../../types/contact";
import { useSDRPreferences } from "../../hooks/useSDRPreferences";

interface ObjectionResponse {
  contactId: string;
  objection: string;
  response: string;
  sent: boolean;
  confidence: number;
  debug?: any;
}

interface ObjectionHandlerSDRAgentProps {
  contact?: Contact;
}

export const ObjectionHandlerSDRAgent: React.FC<ObjectionHandlerSDRAgentProps> = ({ contact }) => {
  const [contactId, setContactId] = useState(contact?.id || "");
  const [objection, setObjection] = useState("");
  const { preferences, apiPreferences, savePreferences, resetPreferences } = useSDRPreferences('objection-handler-sdr');

  useEffect(() => {
    if (contact?.id) {
      setContactId(contact.id);
    }
  }, [contact?.id]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ObjectionResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleRespond = async () => {
    setError(null);
    setResult(null);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }
    if (!objection.trim()) {
      setError("Please enter the objection.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/objection-handler-sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, objection, preferences: apiPreferences })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Objection handler request failed");
      }

      const json = (await res.json()) as ObjectionResponse;
      setResult(json);
    } catch (e: any) {
      console.error("[ObjectionHandlerSDRAgent] error:", e);
      setError(e.message || "Failed to handle objection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: "1px solid var(--sdr-e2e8f0)",
        background: "var(--sdr-surface)",
        maxWidth: 520,
        flex: "1 1 340px"
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>🛡️ Objection-Handling SDR</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Objection Handler SDR Settings"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: 'center',
            gap: 8,
            padding: "0 16px", height: 40, whiteSpace: "nowrap",
            borderRadius: 8,
            border: '1px solid var(--sdr-d1d5db)',
            background: 'var(--sdr-surface)',
            color: 'var(--sdr-6b7280)',
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sdr-f9fafb)';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--sdr-surface)';
            e.currentTarget.style.borderColor = 'var(--sdr-d1d5db)';
          }}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "var(--sdr-4a5568)" }}>
        Respond to objections like "too expensive", "not now", or "we're good with what we have."
      </p>

      {error && (
        <div
          style={{
            marginBottom: 10,
            padding: "6px 8px",
            borderRadius: 8,
            background: "var(--sdr-fff5f5)",
            color: "var(--sdr-c53030)",
            fontSize: 12
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {contact ? (
        <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "var(--sdr-f0fdf4)", border: "1px solid var(--sdr-bbf7d0)" }}>
          <div style={{ fontSize: 12, color: "var(--sdr-166534)", fontWeight: 500 }}>
            Target: {contact.firstName || contact.name} {contact.lastName || ''}
          </div>
          <div style={{ fontSize: 11, color: contact.email ? "var(--sdr-15803d)" : "var(--sdr-dc2626)" }}>
            {contact.email || "No email on file"}
          </div>
        </div>
      ) : (
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
              border: "1px solid var(--sdr-cbd5e0)",
              fontSize: 13
            }}
          />
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
          Objection
        </label>
        <textarea
          value={objection}
          onChange={(e) => setObjection(e.target.value)}
          rows={3}
          placeholder="Enter the objection from the prospect..."
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--sdr-cbd5e0)",
            fontFamily: "system-ui",
            fontSize: 13,
            background: "var(--sdr-f7fafc)"
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleRespond}
        disabled={loading}
        style={{
          width: "100%",
          padding: "0 16px", height: 40, whiteSpace: "nowrap",
          borderRadius: 8,
          border: "none",
          background: loading ? "#a0aec0" : "#dd6b20",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 14,
          cursor: loading ? "default" : "pointer",
          marginBottom: 10
        }}
      >
        {loading ? "Handling Objection..." : "Handle Objection"}
      </button>

      {result && (
        <div
          style={{
            borderRadius: 8,
            border: "1px solid var(--sdr-e2e8f0)",
            background: "var(--sdr-f7fafc)",
            padding: 8
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "var(--sdr-718096)",
              marginBottom: 4
            }}
          >
            Result
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Confidence:</strong> {Math.round(result.confidence * 100)}%
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Original Objection:</strong> {result.objection}
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Status:</strong> {result.sent ? "✅ Response Sent" : "❌ Failed"}
          </div>

          <div>
            <strong>Response:</strong>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                marginTop: 4,
                background: "var(--sdr-edf2f7)",
                padding: 8,
                borderRadius: 6
              }}
            >
              {result.response}
            </pre>
          </div>
        </div>
      )}

      {showSettings && (
        <SDRAgentConfigurator
          agentId="objection-handler-sdr"
          agentName="Objection-Handling SDR"
          currentConfig={preferences}
          onSave={async (config) => {
            await savePreferences(config);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
          onReset={resetPreferences}
        />
      )}
    </div>
  );
};