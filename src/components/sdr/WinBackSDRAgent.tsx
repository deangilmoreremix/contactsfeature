import React, { useState, useEffect } from "react";
import { Settings, Trophy } from "lucide-react";
import { SDRAgentConfigurator } from "./SDRAgentConfigurator";
import { Contact } from "../../types/contact";

interface WinBackResponse {
  contactId: string;
  subject: string;
  body: string;
  sent: boolean;
  churnReason: string;
  winBackOffer: string;
  debug?: any;
}

interface WinBackSDRAgentProps {
  contact?: Contact;
}

export const WinBackSDRAgent: React.FC<WinBackSDRAgentProps> = ({ contact }) => {
  const [contactId, setContactId] = useState(contact?.id || "");

  useEffect(() => {
    if (contact?.id) {
      setContactId(contact.id);
    }
  }, [contact?.id]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WinBackResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleWinBack = async () => {
    setError(null);
    setResult(null);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/win-back-sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Win-back request failed");
      }

      const json = (await res.json()) as WinBackResponse;
      setResult(json);
    } catch (e: any) {
      console.error("[WinBackSDRAgent] error:", e);
      setError(e.message || "Failed to send win-back");
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
        <h2 style={{ margin: 0 }}>🏆 Win-Back SDR</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Win-Back SDR Settings"
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
        Tries to bring back churned customers or lost deals with tailored win-back offers.
      </p>

      {/* AI Indicator */}
      <div style={{
        marginBottom: 12,
        padding: "8px 12px",
        borderRadius: 8,
        background: "#eff6ff",
        border: "1px solid #bfdbfe"
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            padding: "2px 6px",
            borderRadius: 4,
            background: "#2563eb",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 600
          }}>GPT-5.2 THINKING</span>
          <span style={{ fontSize: 12, color: "#1e40af", fontWeight: 500 }}>AI-Powered Win-Back SDR</span>
        </div>
        <p style={{ fontSize: 11, color: "#3730a3", margin: 0 }}>
          Intelligent win-back campaigns based on churn analysis and customer history.
        </p>
      </div>

      {/* Thinking Display */}
      {loading && (
        <div style={{
          marginBottom: 12,
          padding: "8px 12px",
          borderRadius: 8,
          background: "#fef3c7",
          border: "1px solid #f59e0b"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: "#f59e0b",
              animation: "pulse 2s infinite"
            }}></div>
            <span style={{ fontSize: 12, color: "#92400e", fontWeight: 500 }}>AI Processing Win-Back Campaign</span>
          </div>
          <p style={{ fontSize: 11, color: "#78350f", margin: 0 }}>
            GPT-5.2 is analyzing churn reasons and crafting personalized win-back offers...
          </p>
        </div>
      )}

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
        onClick={handleWinBack}
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
        {loading ? "Sending Win-Back..." : "Send Win-Back"}
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
            <strong>Churn Reason:</strong> {result.churnReason}
          </div>

          <div style={{ marginBottom: 8 }}>
            <strong>Win-Back Offer:</strong> {result.winBackOffer}
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
          agentId="win-back-sdr"
          agentName="Win-Back SDR"
          onSave={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
