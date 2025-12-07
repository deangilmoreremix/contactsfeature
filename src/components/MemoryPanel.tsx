import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SDRAgentConfigurator } from "./sdr/SDRAgentConfigurator";

interface MemoryLayer {
  id?: string;
  memory_type?: string;
  data?: any;
  updated_at?: string;
}

interface MemoryResponse {
  contactId: string;
  memory: {
    short: MemoryLayer[];
    mid: MemoryLayer[];
    long: MemoryLayer[];
  };
}

export const MemoryPanel: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mem, setMem] = useState<MemoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const fetchMemory = async () => {
    setError(null);
    setMem(null);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/.netlify/functions/memory-get?contactId=${encodeURIComponent(contactId)}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }
      const data = (await res.json()) as MemoryResponse;
      setMem(data);
    } catch (e: any) {
      console.error("Memory get error:", e);
      setError(e.message || "Failed to load memory");
    } finally {
      setLoading(false);
    }
  };

  const renderLayer = (title: string, items: MemoryLayer[]) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h4
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#718096",
          margin: "4px 0"
        }}
      >
        {title}
      </h4>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: "#a0aec0" }}>No entries.</div>
      ) : (
        <div
          style={{
            maxHeight: 180,
            overflow: "auto",
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            background: "#f7fafc"
          }}
        >
          {items.map((m, idx) => (
            <div
              key={idx}
              style={{
                padding: 8,
                borderBottom: "1px solid #e2e8f0"
              }}
            >
              <div style={{ fontSize: 11, color: "#718096", marginBottom: 2 }}>
                {m.memory_type || "entry"} •{" "}
                {m.updated_at && new Date(m.updated_at).toLocaleString()}
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  margin: 0
                }}
              >
                {JSON.stringify(m.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        marginTop: 24
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>🧠 Agent Memory Layers</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Memory Settings"
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
        Inspect short, mid, and long-term AI memory for any contact.
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
        onClick={fetchMemory}
        disabled={loading}
        style={{
          padding: "9px 14px",
          borderRadius: 8,
          border: "none",
          background: loading ? "#a0aec0" : "#3182ce",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading ? "default" : "pointer",
          marginBottom: 12
        }}
      >
        {loading ? "Loading Memory..." : "View Memory"}
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

      {mem && (
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap"
          }}
        >
          {renderLayer("Short-Term", mem.memory.short)}
          {renderLayer("Mid-Term", mem.memory.mid)}
          {renderLayer("Long-Term", mem.memory.long)}
        </div>
      )}

      {showSettings && (
        <SDRAgentConfigurator
          agentId="memory"
          agentName="Agent Memory Layers"
          onSave={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
