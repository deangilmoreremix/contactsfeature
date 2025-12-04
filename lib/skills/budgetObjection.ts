import { callOpenAI } from "../core/callOpenAI";
import { Skill } from "./types";

export const budgetObjectionSkill: Skill = {
  id: "budget_objection",
  description: "Responds when a prospect says they don't have budget.",
  run: async ({ contact, deal, lastMessage }) => {
    const prompt = `
The prospect has raised a **budget objection**.

Last message from prospect:
${lastMessage || "(no specific message provided)"}

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

Task:
- Acknowledge their concern.
- Reframe value vs. cost.
- Offer a path forward (e.g. phased rollout, smaller pilot, or ROI framing).
Return your reply email/message only.
    `;

    const res = await callOpenAI(prompt, {
      model: "gpt-4.1-mini",
      temperature: 0.65
    });

    return res;
  }
};
