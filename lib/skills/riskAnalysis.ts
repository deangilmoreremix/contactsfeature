import { callOpenAI } from "../core/callOpenAI";
import { Skill } from "./types";

export const riskAnalysisSkill: Skill = {
  id: "risk_analysis",
  description: "Analyzes risk of a deal based on context.",
  run: async ({ contact, deal, lastMessage, extra }) => {
    const prompt = `
You are a deal risk analyst for an AI-powered CRM.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

Last message (if any):
${lastMessage || "(none provided)"}

Extra signals:
${JSON.stringify(extra ?? {}, null, 2)}

Task:
1) Assign a RISK_SCORE from 0–100 (0 = no risk, 100 = very high risk).
2) Provide a 2–3 sentence explanation.
3) Suggest 1 best next move.

Return JSON only in this format:
{
  "risk_score": 0,
  "reason": "...",
  "next_move": "..."
}
    `;

    const res = await callOpenAI(prompt, {
      model: "gpt-4.1",
      temperature: 0.3
    });

    if (typeof res === "string") {
      try {
        return JSON.parse(res);
      } catch (e) {
        return { risk_score: 50, reason: "Could not parse.", next_move: "" };
      }
    }

    return res;
  }
};
