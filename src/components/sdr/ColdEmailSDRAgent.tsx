import React, { useState, useEffect, useCallback, useRef } from "react";
import { Settings, Send, Mail, Copy, Check, Loader2, X } from "lucide-react";
import { SDRAgentConfigurator } from "./SDRAgentConfigurator";
import { Contact } from "../../types/contact";
import { saveSdrDraft } from "../../utils/sdrDraftUtils";
import { useSDRPreferences } from "../../hooks/useSDRPreferences";
import { useStreamingAI } from "../../hooks/useStreamingAI";
import { supabase } from "../../services/supabaseClient";

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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ColdEmailResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSubject, setStreamingSubject] = useState('');
  const [streamingProgress, setStreamingProgress] = useState(0);

  useEffect(() => {
    if (contact?.id) {
      setContactId(contact.id);
    }
  }, [contact?.id]);

  // Streaming hook for real-time email generation
  const { startStream, stopStream } = useStreamingAI<ColdEmailResponse>({
    onProgress: (progress, message) => {
      setStreamingProgress(progress);
    },
    onComplete: (data) => {
      if (data) {
        setResult(data);
      }
      setIsStreaming(false);
      setStreamingProgress(100);
    },
    onError: (errorMsg) => {
      setError(errorMsg);
      setIsStreaming(false);
    },
  });

  const handleSaveDraft = async () => {
    const finalResult = result || { 
      contactId, 
      subject: streamingSubject || 'Generated Email', 
      body: streamingContent,
      sent: false 
    };
    
    const res = await saveSdrDraft({
      contactId: finalResult.contactId || contactId,
      subject: finalResult.subject,
      body: finalResult.body,
      agentType: 'cold-email-sdr',
    });
    if (res.success) setDraftSaved(true);
  };

  const handleCopy = () => {
    const textToCopy = streamingSubject 
      ? `Subject: ${streamingSubject}\n\n${streamingContent}`
      : result 
        ? `Subject: ${result.subject}\n\n${result.body}`
        : '';
    
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStopStreaming = () => {
    stopStream();
    setIsStreaming(false);
    // Keep what was generated so far
    if (streamingContent) {
      setResult({
        contactId,
        subject: streamingSubject || 'Generated Email',
        body: streamingContent,
        sent: false,
      });
    }
  };

  const handleSend = async () => {
    setError(null);
    setResult(null);
    setStreamingContent('');
    setStreamingSubject('');
    setStreamingProgress(0);

    if (!contactId) {
      setError("Please enter a contact ID.");
      return;
    }

    setLoading(true);
    setIsStreaming(true);

    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Start streaming request
      await startStream(
        '/.netlify/functions/cold-email-sdr',
        { contactId, preferences: apiPreferences },
        { 'Authorization': `Bearer ${session.access_token}` }
      );

    } catch (e: any) {
      console.error("[ColdEmailSDRAgent] error:", e);
      setError(e.message || "Failed to send cold email");
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  // Generate display content - either streaming or final result
  const displaySubject = streamingSubject || result?.subject || '';
  const displayBody = streamingContent || result?.body || '';

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
        <h2 style={{ margin: 0 }}>❄️ Cold Email SDR</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Cold Email SDR Settings"
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
        Send first-touch cold emails to brand new prospects with personalized messaging.
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

      {/* Streaming Progress */}
      {isStreaming && (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 12px",
            borderRadius: 8,
            background: "#eff6ff",
            border: "1px solid #bfdbfe"
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 12, color: "#1e40af", fontWeight: 500 }}>
              Generating email... {streamingProgress}%
            </span>
          </div>
          <div style={{
            height: 4,
            background: '#e5e7eb',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${streamingProgress}%`,
              background: '#3b82f6',
              transition: 'width 0.3s ease'
            }} />
          </div>
          {streamingSubject && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280" }}>
              <strong>Subject:</strong> {streamingSubject}
            </div>
          )}
          <button
            onClick={handleStopStreaming}
            style={{
              marginTop: 8,
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: '1px solid #d1d5db',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <X size={10} /> Stop
          </button>
        </div>
      )}

      {contact ? (
        <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 12, color: "#166534", fontWeight: 500 }}>
            Target: {contact.firstName || contact.name} {contact.lastName || ''}
          </div>
          <div style={{ fontSize: 11, color: contact.email ? "#15803d" : "#dc2626" }}>
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
              border: "1px solid #cbd5e0",
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
          padding: "8px 10px",
          borderRadius: 8,
          border: "none",
          background: isStreaming ? "#dc2626" : loading ? "#a0aec0" : "#2b6cb0",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading && !isStreaming ? "default" : "pointer",
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6
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
                background: isStreaming ? "#fffbeb" : "#edf2f7",
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
                  gap: 4,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  background: copied ? "#f0fdf4" : "white",
                  fontSize: 12,
                  cursor: "pointer",
                  color: copied ? "#166534" : "#374151"
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
                  gap: 4,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: draftSaved ? "#dcfce7" : "#2563eb",
                  color: draftSaved ? "#166534" : "white",
                  fontSize: 12,
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
