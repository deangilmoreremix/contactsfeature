import React, { useEffect, useState } from "react";

interface HeatmapDeal {
  deal_id: string;
  contact_id: string;
  contact_name: string | null;
  contact_email: string | null;
  stage: string;
  value: number;
  risk_score: number;
  days_since_reply: number;
  objection_level: number;
  stage_stagnation: number;
  updated_at: string;
}

interface ListResponse {
  deals: HeatmapDeal[];
}

function riskColor(score: number): string {
  if (score >= 80) return "#FED7D7"; // red-ish
  if (score >= 60) return "#FEEBC8"; // orange-ish
  if (score >= 40) return "#FAF089"; // yellow-ish
  if (score >= 20) return "#C6F6D5"; // green-ish
  return "#E6FFFA"; // teal-ish
}

export const HeatmapPanel: React.FC = () => {
  const [deals, setDeals] = useState<HeatmapDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchDeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/heatmap-list");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }
      const data = (await res.json()) as ListResponse;
      setDeals(data.deals || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (e: any) {
      console.error("Heatmap list error:", e);
      setError(e.message || "Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const recomputeAll = async () => {
    setRecomputing(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/heatmap-recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }
      await res.json(); // we don't need the body; just notify
      await fetchDeals();
    } catch (e: any) {
      console.error("Heatmap recompute all error:", e);
      setError(e.message || "Failed to recompute risks");
    } finally {
      setRecomputing(false);
    }
  };

  const recomputeOne = async (dealId: string) => {
    setRecomputing(true);
    setError(null);
    try {
      const res = await fetch("/.netlify/functions/heatmap-recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }
      await res.json();
      await fetchDeals();
    } catch (e: any) {
      console.error("Heatmap recompute one error:", e);
      setError(e.message || "Failed to recompute this deal");
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        maxWidth: 900,
        flex: 1
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
          alignItems: "center"
        }}
      >
        <div>
          <h2 style={{ marginBottom: 4 }}>🔥 Deal Heatmap & Risk Engine</h2>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#4a5568"
            }}
          >
            Visualize which deals are at highest risk and recompute risk with one click.
          </p>
        </div>
        <button
          type="button"
          onClick={recomputeAll}
          disabled={recomputing || loading}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: recomputing ? "#a0aec0" : "#dd6b20",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: 13,
            cursor: recomputing ? "default" : "pointer",
            whiteSpace: "nowrap"
          }}
        >
          {recomputing ? "Recomputing..." : "Recompute All Risks"}
        </button>
      </div>

      {lastUpdated && (
        <div
          style={{
            fontSize: 11,
            color: "#718096",
            marginBottom: 8
          }}
        >
          Last updated: {lastUpdated}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 8,
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

      {loading ? (
        <div style={{ fontSize: 13, color: "#4a5568" }}>Loading deals…</div>
      ) : deals.length === 0 ? (
        <div style={{ fontSize: 13, color: "#4a5568" }}>No open deals found.</div>
      ) : (
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #e2e8f0"
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#edf2f7",
                  textAlign: "left"
                }}
              >
                <th style={{ padding: 8 }}>Deal / Contact</th>
                <th style={{ padding: 8 }}>Stage</th>
                <th style={{ padding: 8 }}>Value</th>
                <th style={{ padding: 8 }}>Risk</th>
                <th style={{ padding: 8 }}>Days Since Reply</th>
                <th style={{ padding: 8 }}>Objection</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr
                  key={d.deal_id}
                  style={{
                    background: riskColor(d.risk_score),
                    borderTop: "1px solid #e2e8f0"
                  }}
                >
                  <td style={{ padding: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {d.contact_name || "Unknown Contact"}
                    </div>
                    <div style={{ fontSize: 11, color: "#4a5568" }}>
                      {d.contact_email || "No email"} •{" "}
                      <span style={{ fontFamily: "monospace" }}>{d.deal_id}</span>
                    </div>
                  </td>
                  <td style={{ padding: 8 }}>{d.stage}</td>
                  <td style={{ padding: 8 }}>${d.value.toLocaleString()}</td>
                  <td style={{ padding: 8, fontWeight: 600 }}>{d.risk_score}</td>
                  <td style={{ padding: 8 }}>{d.days_since_reply}</td>
                  <td style={{ padding: 8 }}>{d.objection_level}</td>
                  <td style={{ padding: 8 }}>
                    <button
                      type="button"
                      onClick={() => recomputeOne(d.deal_id)}
                      disabled={recomputing}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "none",
                        background: "#4a5568",
                        color: "#ffffff",
                        fontSize: 12,
                        cursor: recomputing ? "default" : "pointer"
                      }}
                    >
                      Recompute
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
