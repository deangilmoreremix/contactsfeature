import React, { useState, useEffect } from "react";
import { Search, Users, Building } from "lucide-react";
import { SDRAgentConfigurator } from "./SDRAgentConfigurator";
import { Contact } from "../../types/contact";

interface DiscoveryResponse {
  contactId: string;
  research: {
    linkedin: string;
    company: string;
    triggers: string[];
  };
  qualification: {
    score: number;
    reasons: string[];
  };
  nextActions: string[];
}

interface DiscoverySDRAgentProps {
  contact?: Contact;
}

export const DiscoverySDRAgent: React.FC<DiscoverySDRAgentProps> = ({ contact }) => {
  const [contactId, setContactId] = useState(contact?.id || "");

  useEffect(() => {
    if (contact?.id) {
      setContactId(contact.id);
    }
  }, [contact?.id]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleResearch = async () => {
    setError(null);
    setResult(null);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/discovery-sdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Discovery research failed");
      }

      const json = (await res.json()) as DiscoveryResponse;
      setResult(json);
    } catch (e: any) {
      console.error("[DiscoverySDRAgent] error:", e);
      setError(e.message || "Failed to perform discovery research");
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
        <h2 style={{ margin: 0 }}>🔍 Discovery SDR</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Discovery SDR Settings"
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
          <Search size={12} />
          Settings
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#4a5568" }}>
        Research prospects and qualify leads with AI-powered intelligence gathering.
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
        onClick={handleResearch}
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
        {loading ? "Researching..." : "Start Discovery Research"}
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
            Discovery Results
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
              <Users size={16} />
              <strong>LinkedIn Profile:</strong>
            </div>
            <p style={{ fontSize: 12, margin: 0, paddingLeft: 24 }}>{result.research.linkedin}</p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
              <Building size={16} />
              <strong>Company Intelligence:</strong>
            </div>
            <p style={{ fontSize: 12, margin: 0, paddingLeft: 24 }}>{result.research.company}</p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>Trigger Events:</strong>
            <ul style={{ fontSize: 12, margin: 4, paddingLeft: 20 }}>
              {result.research.triggers.map((trigger, i) => (
                <li key={i}>{trigger}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong>Qualification Score:</strong>
            <div style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 12,
              background: result.qualification.score > 7 ? '#c6f6d5' : result.qualification.score > 4 ? '#fef5e7' : '#fed7d7',
              color: result.qualification.score > 7 ? '#22543d' : result.qualification.score > 4 ? '#744210' : '#742a2a',
              fontSize: 11,
              fontWeight: 600,
              marginLeft: 8
            }}>
              {result.qualification.score}/10
            </div>
          </div>

          <div>
            <strong>Recommended Actions:</strong>
            <ul style={{ fontSize: 12, margin: 4, paddingLeft: 20 }}>
              {result.nextActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showSettings && (
        <SDRAgentConfigurator
          agentId="discovery-sdr"
          agentName="Discovery SDR"
          onSave={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};