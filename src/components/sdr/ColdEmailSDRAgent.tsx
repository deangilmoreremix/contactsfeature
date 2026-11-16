import React, { useState, useEffect } from "react";
import { Settings, Send, Mail, Copy, Check, Loader2, X } from "lucide-react";
import { SDRAgentConfigurator } from "./SDRAgentConfigurator";
import { Contact } from "../../types/contact";
import { saveSdrDraft } from "../../utils/sdrDraftUtils";
import { useSDRPreferences } from "../../hooks/useSDRPreferences";
import { useSdrRun, SdrLiveBar } from "./SdrLive";

interface ColdEmailResponse {
  contactId: string;
  subject: string;
  body: string;
  sent: boolean;
  gtmPromptUsed?: boolean;
  model?: string;
}

interface ColdEmailSDRAgentProps {
  contact?: Contact;
}

export const ColdEmailSDRAgent: React.FC<ColdEmailSDRAgentProps> = ({ contact }) => {
  const [contactId, setContactId] = useState(contact?.id || "");
  const { preferences, apiPreferences, savePreferences, resetPreferences } = useSDRPreferences('cold-email-sdr');
  
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live generation: subject / body fill in as the model writes them (Responses API stream).
  const run = useSdrRun<ColdEmailResponse>();
  const isStreaming = run.loading;
  const loading = isStreaming;
  const live = run.live;
  const displaySubject = live?.subject || '';
  const displayBody = live?.body || '';

  useEffect(() => {
    if (contact?.id) {
      setContactId(contact.id);
    }
  }, [contact?.id]);

  const handleSaveDraft = async () => {
    const res = await saveSdrDraft({
      contactId: live?.contactId || contactId,
      subject: displaySubject || 'Generated Email',
      body: displayBody,
      agentType: 'cold-email-sdr',
    });
    if (res.success) setDraftSaved(true);
  };

  const handleCopy = () => {
    if (displayBody) {
      navigator.clipboard.writeText(`Subject: ${displaySubject}\n\n${displayBody}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Stop keeps whatever has been written so far (it can still be copied / saved).
  const handleStopStreaming = () => run.stop();

  const handleSend = async () => {
    setError(null);
    setDraftSaved(false);
    run.reset();

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }

    await run.runFunction('/.netlify/functions/cold-email-sdr', { contactId, preferences: apiPreferences });
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
        <h2 style={{ margin: 0 }}>❄️ Cold Email SDR</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Cold Email SDR Settings"
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
        Send first-touch cold emails to brand new prospects with personalized messaging.
      </p>

      {(error || run.streamError) && (
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
          ⚠️ {error || run.streamError}
        </div>
      )}

      <SdrLiveBar run={run} showStop={false} />

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
            disabled={loading || isStreaming}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--sdr-cbd5e0)",
              fontSize: 13,
              opacity: loading || isStreaming ? 0.6 : 1
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={isStreaming ? handleStopStreaming : handleSend}
        disabled={loading && !isStreaming}
        style={{
          width: "100%",
          padding: "0 16px", height: 40, whiteSpace: "nowrap",
          borderRadius: 8,
          border: "none",
          background: isStreaming ? "#dc2626" : loading ? "#a0aec0" : "#2b6cb0",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 14,
          cursor: loading && !isStreaming ? "default" : "pointer",
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}
      >
        {isStreaming ? (
          <>
            <X size={14} />
            Stop Generation
          </>
        ) : loading ? (
          <>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Generating...
          </>
        ) : (
          <>
            <Send size={14} />
            Send Cold Email
          </>
        )}
      </button>

      {/* Result / Streaming Preview */}
      {(displayBody || isStreaming) && (
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
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {isStreaming ? (
              <>
                <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                Generating...
              </>
            ) : (
              'Result'
            )}
          </div>

          {displaySubject && (
            <div style={{ marginBottom: 8 }}>
              <strong>Subject:</strong> {displaySubject}
            </div>
          )}

          <div>
            <strong>Message:</strong>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                marginTop: 4,
                background: isStreaming ? "var(--sdr-fffbeb)" : "var(--sdr-edf2f7)",
                padding: 8,
                borderRadius: 6,
                minHeight: isStreaming ? 100 : 'auto',
                border: isStreaming ? "1px dashed #fbbf24" : "none"
              }}
            >
              {displayBody || (isStreaming ? 'Generating...' : '')}
              {isStreaming && <span style={{ opacity: 0.5 }}>|</span>}
            </pre>
          </div>

          {!isStreaming && displayBody && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "0 16px", height: 40, whiteSpace: "nowrap",
                  borderRadius: 8,
                  border: "1px solid var(--sdr-d1d5db)",
                  background: copied ? "var(--sdr-f0fdf4)" : "var(--sdr-surface)",
                  fontSize: 14,
                  cursor: "pointer",
                  color: copied ? "var(--sdr-166534)" : "var(--sdr-374151)"
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={draftSaved}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "0 16px", height: 40, whiteSpace: "nowrap",
                  borderRadius: 8,
                  border: "none",
                  background: draftSaved ? "var(--sdr-dcfce7)" : "#2563eb",
                  color: draftSaved ? "var(--sdr-166534)" : "white",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: draftSaved ? "default" : "pointer"
                }}
              >
                {draftSaved ? <Check size={12} /> : <Mail size={12} />}
                {draftSaved ? "Draft Saved" : "Save as Draft"}
              </button>
            </div>
          )}
        </div>
      )}

      {showSettings && (
        <SDRAgentConfigurator
          agentId="cold-email-sdr"
          agentName="Cold Email SDR"
          currentConfig={preferences}
          onSave={async (config) => {
            await savePreferences(config);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
          onReset={resetPreferences}
        />
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
