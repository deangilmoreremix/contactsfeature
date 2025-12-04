import { callGemini } from "../core/callGemini";
import { Skill } from "./types";

export const competitorIntelSkill: Skill = {
  id: "competitor_intel",
  description:
    "Provides competitive positioning insight against typical CRM / sales tools.",
  run: async ({ contact, extra }) => {
    const market = extra?.market || contact?.company || "B2B SMB sales";

    const prompt = `
You are a market researcher.

Market or company:
${market}

Task:
- Identify typical competing solutions or categories.
- Explain how our solution (SmartCRM-style AI OS) can be positioned competitively.
- Focus on benefits like automation, AI assistance, and reduced tool sprawl.

Return a concise summary with bullet points.
    `;

    const res = await callGemini(prompt, {
      model: "gemini-1.5-pro"
    });

    return res;
  }
};
