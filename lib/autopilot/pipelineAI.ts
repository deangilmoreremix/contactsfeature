import { callOpenAI } from "../core/callOpenAI";
import { supabase } from "../core/supabaseClient";
import { logger } from "../core/logger";
import { AutopilotContext } from "./state";
import { buildMemoryPrompt } from "../memory/memoryPrompt";

export async function runPipelineAI(ctx: AutopilotContext) {
  const { contact, deal, memory } = ctx;

  const memoryBlock = buildMemoryPrompt(memory.short, memory.mid, memory.long);

  const prompt = `
You are the SmartCRM Deal Intelligence Engine.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

${memoryBlock}

Your tasks:
1) Create a 1–2 sentence SUMMARY of this deal.
2) Suggest the BEST NEXT ACTION.
3) Rate RISK_SCORE from 0–100 and explain why.

Return JSON in this format:
{
  "summary": "...",
  "next_action": "...",
  "risk_score": 0,
  "reason": "..."
}
  `;

  let parsed: any;
  let res: any;
  try {
    res = await callOpenAI(prompt, {
      role: "thinking",
      schemaName: "pipeline_ai",
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          next_action: { type: "string" },
          risk_score: { type: "number" },
          reason: { type: "string" }
        }
      }
    });
    parsed = typeof res === "string" ? JSON.parse(res) : res;
  } catch (e) {
    logger.error("Failed to parse pipeline AI response", { res, e });
    return null;
  }

  const { error } = await supabase
    .from("deals")
    .update({
      risk_score: parsed.risk_score,
      summary: parsed.summary,
      next_action: parsed.next_action
    })
    .eq("id", deal.id);

  if (error) {
    logger.error("Failed to update deal with pipeline AI results", { error });
  }

  return parsed;
}
