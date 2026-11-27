import React, { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { SDRAgentConfigurator } from "./sdr/SDRAgentConfigurator";
import { useAIStream } from "../hooks/useAIStream";
import { sdrAuthHeaders } from "../services/sdrClient";
import { StreamingOutput } from "./ui/StreamingOutput";
import { asObj, asStr, joinSections } from "../utils/partialText";

interface SkillMeta {
  id: string;
  description: string;
}

interface SkillsListResponse {
  skills: SkillMeta[];
}

interface SkillRunResponse {
  skillId: string;
  contactId: string;
  dealId?: string | null;
  result: any;
}

/** Text shown while a structured skill (risk analysis) is still being written. */
function riskText(partial: unknown): string | undefined {
  const p = asObj(partial);
  if (!("risk_score" in p || "reason" in p || "next_move" in p)) return undefined;
  return joinSections([
    p.risk_score != null && `Risk score: ${asStr(p.risk_score)}/100`,
    asStr(p.reason),
    p.next_move ? `Next move: ${asStr(p.next_move)}` : "",
  ]);
}

export const SkillsPanel: React.FC = () => {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [contactId, setContactId] = useState("");
  const [loading, setLoading] = useState(false);
  const live = useAIStream<SkillRunResponse>();
  const running = live.isStreaming;
  const result = live.state.result;
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const error = formError || listError || live.state.error;
  const [showSettings, setShowSettings] = useState(false);

  const loadSkills = async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch("/.netlify/functions/skills-api", {
        method: "POST",
        headers: await sdrAuthHeaders(),
        body: JSON.stringify({ action: "list" })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Request failed");
      }
      const data = (await res.json()) as SkillsListResponse;
      setSkills(data.skills || []);
      if (data.skills && data.skills.length > 0) {
        setSelectedSkill(data.skills[0]!.id);
      }
    } catch (e: any) {
      console.error("Skills list error:", e);
      setListError(e.message || "Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const handleRun = async () => {
    setFormError(null);
    live.reset();

    if (!contactId) {
      setFormError("Please enter a contact ID.");
      return;
    }
    if (!selectedSkill) {
      setFormError("Please select a skill.");
      return;
    }

    // Streamed: the reply types in as the skill writes it
    await live.runFunction("/.netlify/functions/skills-api", { skillId: selectedSkill, contactId });
  };

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        color: "#1a202c",
        maxWidth: 640
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>🧠 Agent Skill Engine</h2>
        <button
          onClick={() => setShowSettings(true)}
          title="Configure Skills Settings"
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
        Run individual skills (negotiation, objection handling, research, etc.) against any contact.
      </p>

      {loading ? (
        <div style={{ fontSize: 13 }}>Loading skills…</div>
      ) : skills.length === 0 ? (
        <div style={{ fontSize: 13 }}>No skills found in registry.</div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}
            >
              Skill
            </label>
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e0",
                fontSize: 14,
                background: "#f7fafc"
              }}
            >
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.description}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
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
            onClick={handleRun}
            disabled={running}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: running ? "#a0aec0" : "#2b6cb0",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: 14,
              cursor: running ? "default" : "pointer",
              marginBottom: 12
            }}
          >
            {running ? "Running Skill..." : "Run Skill"}
          </button>
        </>
      )}

      {error && (
        <div
          style={{
            marginTop: 8,
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

      {running && (
        <StreamingOutput
          state={live.state}
          onStop={live.stop}
          display={riskText(live.state.partial) ?? live.state.text}
          placeholder="Running the skill…"
          className="mt-3"
        />
      )}

      {result && !running && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#f7fafc",
            border: "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            ✅ Skill <strong>{result.skillId}</strong> ran for contact{" "}
            <span style={{ fontFamily: "monospace" }}>{result.contactId}</span>
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 12,
              background: "#edf2f7",
              padding: 8,
              borderRadius: 6,
              maxHeight: 220,
              overflow: "auto",
              margin: 0
            }}
          >
            {typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2)}
          </pre>
        </div>
      )}

      {showSettings && (
        <SDRAgentConfigurator
          agentId="skills"
          agentName="Agent Skill Engine"
          onSave={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
