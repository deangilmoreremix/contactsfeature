import { supabase } from "../core/supabaseClient";
import { callOpenAI } from "../core/callOpenAI";
import { logger } from "../core/logger";

interface DealRecord {
  id: string;
  contact_id: string;
  stage: string;
  value: number;
  risk_score: number;
  objection_level: number;
  stage_stagnation: number;
  days_since_reply: number;
  updated_at: string;
}

interface ContactRecord {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
}

export async function computeDealRisk(dealId: string) {
  // Load deal
  const { data: deal, error: dErr } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .single();

  if (dErr || !deal) {
    logger.error("Heatmap: deal not found", { dealId, dErr });
    throw new Error("Deal not found");
  }

  const typedDeal = deal as DealRecord;

  // Load contact
  const { data: contact, error: cErr } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", typedDeal.contact_id)
    .single();

  if (cErr || !contact) {
    logger.error("Heatmap: contact not found", { dealId, cErr });
    throw new Error("Contact not found for deal");
  }

  const typedContact = contact as ContactRecord;

  // Build prompt
  const prompt = `
You are a deal risk analyst for an AI-powered CRM.

Contact:
${JSON.stringify(typedContact, null, 2)}

Deal:
${JSON.stringify(typedDeal, null, 2)}

Task:
1) Assign a RISK_SCORE from 0–100 (0 = no risk, 100 = very high risk).
2) Provide a 1–2 sentence reason.
3) Suggest ONE best next action.

Return JSON in this exact format:
{
  "risk_score": 0,
  "reason": "...",
  "next_action": "..."
}
  `;

  const res = await callOpenAI(prompt, {
    model: "gpt-4.1",
    temperature: 0.3
  });

  let parsed: any;
  try {
    parsed = typeof res === "string" ? JSON.parse(res) : res;
  } catch (e) {
    logger.error("Heatmap: failed to parse risk response", { res, e });
    throw new Error("Failed to parse risk response");
  }

  const riskScore = Number(parsed.risk_score ?? typedDeal.risk_score ?? 0);
  const reason = parsed.reason || "";
  const nextAction = parsed.next_action || "";

  return {
    deal,
    contact,
    risk_score: riskScore,
    reason,
    next_action: nextAction
  };
}
