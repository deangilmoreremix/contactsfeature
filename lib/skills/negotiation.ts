import { callOpenAI } from "../core/callOpenAI";
import { Skill } from "./types";

export const negotiationSkill: Skill = {
  id: "negotiation",
  description: "Handles negotiating price, value, and objections.",
  run: async ({ contact, deal, extra }) => {
    const prompt = `
You are a senior sales negotiator.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

Context:
${JSON.stringify(extra ?? {}, null, 2)}

Task:
- Respond to a pricing/value objection.
- Emphasize ROI and outcomes.
- Stay respectful and confident.
Return your suggested reply in natural language.
    `;

    const res = await callOpenAI(prompt, {
      model: "gpt-4.1-mini",
      temperature: 0.6
    });

    return res;
  }
};
