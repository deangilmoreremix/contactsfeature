import { createResponse } from "../core/openaiClient";
import { Skill } from "./types";

export const researchSkill: Skill = {
  id: "research",
  description: "Performs quick prospect or market research.",
  run: async ({ contact, extra }) => {
    const subject = extra?.subject || contact?.company || contact?.email || "this prospect";

    const prompt = `
Do a **quick research summary** about:

${subject}

Task:
- Give 3–5 key insights.
- Include 2–3 potential pain points.
- Include 2–3 potential opportunities our solution might solve.
- Base claims on web sources; say plainly when information could not be found.

Keep it short and skimmable in bullet points.
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
