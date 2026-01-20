import React, { useState, useEffect } from "react";
import { Settings, RotateCcw } from "lucide-react";
import { SDRAgentConfigurator } from "./SDRAgentConfigurator";
import { Contact } from "../../types/contact";

interface ReactivationResponse {
  contactId: string;
  subject: string;
  body: string;
  sent: boolean;
  daysSinceLastContact: number;
  debug?: any;
}

interface ReactivationSDRAgentProps {
  contact?: Contact;
}

export const ReactivationSDRAgent: React.FC<ReactivationSDRAgentProps> = ({ contact }) => {
  const [contactId, setContactId] = useState(contact?.id || "");

  useEffect(() => {
    if (contact?.id) {
      setContactId(contact.id);
    }
  }, [contact?.id]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReactivationResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleReactivate = async () => {
    setError(null);
    setResult(null);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/reactivation-sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Reactivation request failed");
      }

      const json = (await res.json()) as ReactivationResponse;
      setResult(json);
    } catch (e: any) {
      console.error("[ReactivationSDRAgent] error:", e);
      setError(e.message || "Failed to send reactivation");
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
        <h2 style={{ margin: 0 }}>🔄 Re-Activation SDR</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Re-Activation SDR Settings"
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
        Reaches out to leads who showed interest before but went quiet.
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

      {contact ? (
        <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 500 }}>
            Target: {contact.firstName || contact.name} {contact.lastName || ''}
          </div>
          <div style={{ fontSize: 11, color: "#15803d" }}>{contact.email}</div>
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
              border: "1px solid #cbd5e0",
              fontSize: 13
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleReactivate}
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
        {loading ? "Sending Reactivation..." : "Send Reactivation"}
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
            <strong>Days Since Last Contact:</strong> {result.daysSinceLastContact}
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
          agentId="reactivation-sdr"
          agentName="Re-Activation SDR"
          onSave={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
