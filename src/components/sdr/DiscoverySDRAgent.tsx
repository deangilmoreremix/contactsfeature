import React, { useState, useEffect } from "react";
import { Search, Users, Building } from "lucide-react";
import { SDRAgentConfigurator } from "./SDRAgentConfigurator";
import { sdrAuthHeaders } from "../../services/sdrClient";
import { Contact } from "../../types/contact";
import { useSDRPreferences } from "../../hooks/useSDRPreferences";

interface DiscoveryResponse {
  contactId: string;
  subject: string;
  body: string;
  discoveryQuestions: string[];
  sent: boolean;
}

interface DiscoverySDRAgentProps {
  contact?: Contact;
}

export const DiscoverySDRAgent: React.FC<DiscoverySDRAgentProps> = ({ contact }) => {
  const [contactId, setContactId] = useState(contact?.id || "");
  const { preferences, apiPreferences, savePreferences, resetPreferences } = useSDRPreferences('discovery-sdr');

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
        headers: await sdrAuthHeaders(),
        body: JSON.stringify({ contactId, preferences: apiPreferences })
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
        border: "1px solid var(--sdr-e2e8f0)",
        background: "var(--sdr-surface)",
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
          <Search size={12} />
          Settings
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "var(--sdr-4a5568)" }}>
        Research prospects and qualify leads with AI-powered intelligence gathering.
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

      <button
        type="button"
        onClick={handleResearch}
        disabled={loading}
        style={{
          width: "100%",
          padding: "0 16px", height: 40, whiteSpace: "nowrap",
          borderRadius: 8,
          border: "none",
          background: loading ? "#a0aec0" : "#2b6cb0",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 14,
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
            Discovery Results
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 8 }}>
              <Users size={16} />
              <strong>{result.subject}</strong>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0, paddingLeft: 24, fontFamily: "inherit" }}>{result.body}</pre>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
              <Building size={16} />
              <strong>Key discovery questions:</strong>
            </div>
            <ul style={{ fontSize: 12, margin: 4, paddingLeft: 20 }}>
              {(result.discoveryQuestions || []).map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showSettings && (
        <SDRAgentConfigurator
          agentId="discovery-sdr"
          agentName="Discovery SDR"
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