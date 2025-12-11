import React, { useState } from "react";

interface AutopilotStatus {
  contact?: {
    id: string;
    name: string | null;
    email: string | null;
    company: string | null;
    lead_status: string | null;
  };
  settings?: any;
  lastLog?: any;
}

export const AutopilotControlPanel: React.FC = () => {
  const [contactId, setContactId] = useState("");
  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    if (!contactId) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);

    try {
      const res = await fetch("/.netlify/functions/get-autopilot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load status");
      }
      setStatus(json);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: { autopilot_enabled?: boolean; escalated_to_ae?: boolean }) => {
    if (!contactId) return;
    setSaving(true);
    setError(null);
    setActionMessage(null);

    try {
      const res = await fetch("/.netlify/functions/update-autopilot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, ...updates }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update settings");
      }
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              settings: json.settings,
            }
          : prev
      );
      setActionMessage("Settings updated.");
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const runSdrStep = async () => {
    if (!contactId) return;
    setActionMessage(null);
    setError(null);

    try {
      const res = await fetch("/.netlify/functions/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to run SDR agent");
      }
      setActionMessage(`SDR step run: step ${json.step || ""} executed.`);
      // Refresh status to see updated step / log
      await loadStatus();
    } catch (e: any) {
      setError(e.message || "Unknown error");
    }
  };

  const runAeFollowup = async () => {
    if (!contactId) return;
    setActionMessage(null);
    setError(null);

    try {
      // For manual AE run, we just send contactId; AE uses default context.
      const res = await fetch("/.netlify/functions/run-ae-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to run AE agent");
      }
      setActionMessage("AE agent executed and reply sent (if tool call was successful).");
      await loadStatus();
    } catch (e: any) {
      setError(e.message || "Unknown error");
    }
  };

  const settings = status?.settings || {};
  const autopilotEnabled = !!settings.autopilot_enabled;
  const escalatedToAe = !!settings.escalated_to_ae;
  const currentStep = settings.current_step ?? null;
  const sequenceLength = settings.sequence_length ?? null;

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-xl bg-white/80">
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Contact ID</label>
          <input
            className="w-full border rounded-md px-2 py-1 text-sm"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            placeholder="Enter contact UUID / ID"
          />
        </div>
        <button
          onClick={loadStatus}
          disabled={loading || !contactId}
          className="md:w-auto w-full rounded-md border px-3 py-2 text-sm font-semibold bg-black text-white disabled:opacity-60"
        >
          {loading ? "Loading..." : "Load Autopilot Status"}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">Error: {error}</div>}
      {actionMessage && <div className="text-sm text-emerald-600">{actionMessage}</div>}

      {status && (
        <div className="grid md:grid-cols-3 gap-4 mt-2">
          {/* Contact card */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h3 className="font-semibold text-sm mb-2">Contact</h3>
            <p className="text-xs text-gray-700">
              <span className="font-medium">Name:</span> {status.contact?.name || "—"}
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-medium">Email:</span> {status.contact?.email || "—"}
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-medium">Company:</span> {status.contact?.company || "—"}
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-medium">Status:</span> {status.contact?.lead_status || "—"}
            </p>
          </div>

          {/* Autopilot controls */}
          <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
            <h3 className="font-semibold text-sm mb-2">Autopilot Controls</h3>

            <div className="flex items-center justify-between text-xs">
              <span>Autopilot Enabled</span>
              <button
                disabled={saving}
                onClick={() => updateSettings({ autopilot_enabled: !autopilotEnabled })}
                className={`px-2 py-1 rounded-full text-xs border ${
                  autopilotEnabled ? "bg-emerald-500 text-white" : "bg-white text-gray-700"
                }`}
              >
                {autopilotEnabled ? "On" : "Off"}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span>Escalated to AE</span>
              <button
                disabled={saving}
                onClick={() => updateSettings({ escalated_to_ae: !escalatedToAe })}
                className={`px-2 py-1 rounded-full text-xs border ${
                  escalatedToAe ? "bg-blue-500 text-white" : "bg-white text-gray-700"
                }`}
              >
                {escalatedToAe ? "Yes" : "No"}
              </button>
            </div>

            <div className="text-xs text-gray-700">
              <span className="font-medium">Sequence:</span>{" "}
              {currentStep !== null && sequenceLength !== null
                ? `${currentStep}/${sequenceLength}`
                : "Not configured"}
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={runSdrStep}
                disabled={saving || loading || !contactId}
                className="w-full rounded-md border px-3 py-1.5 text-xs font-semibold bg-black text-white disabled:opacity-60"
              >
                Run SDR Step Now
              </button>
              <button
                onClick={runAeFollowup}
                disabled={saving || loading || !contactId}
                className="w-full rounded-md border px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white disabled:opacity-60"
              >
                Run AE Follow-up Now
              </button>
            </div>
          </div>

          {/* Last log */}
          <div className="border rounded-lg p-3 bg-gray-50">
            <h3 className="font-semibold text-sm mb-2">Last Agent Log</h3>
            {status.lastLog ? (
              <>
                <p className="text-xs text-gray-500 mb-1">
                  {status.lastLog.created_at} · {status.lastLog.level}
                </p>
                <pre className="text-[11px] whitespace-pre-wrap">
                  {status.lastLog.message}
                </pre>
              </>
            ) : (
              <p className="text-xs text-gray-500">No logs yet for this contact.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};