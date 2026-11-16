import { createResponse } from "../core/openaiClient";
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
- Base claims on web sources; say plainly when information could not be found.

Return a concise summary with bullet points.
    `;

    const res = await createResponse({
      role: "thinking",
      effort: "low",
      input: prompt,
      tools: [{ type: "web_search" }]
    });

    const sources = res.citations.length
      ? `\n\nSources:\n${res.citations.map((c) => `- ${c.title}: ${c.url}`).join("\n")}`
      : "";
    return res.text + sources;
  }
};
