import { callGemini } from "../core/callGemini";
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

Keep it short and skimmable in bullet points.
    `;

    const res = await callGemini(prompt, {
      model: "gemini-1.5-pro"
    });

    return res;
  }
};
