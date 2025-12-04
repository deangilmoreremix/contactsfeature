import { callOpenAI } from "../core/callOpenAI";
import { Skill } from "./types";

export const followUpSkill: Skill = {
  id: "follow_up",
  description: "Generates a follow-up email or message to re-engage a prospect.",
  run: async ({ contact, deal, lastMessage, extra }) => {
    const prompt = `
You are writing a thoughtful follow-up to re-engage a prospect.

Contact:
${JSON.stringify(contact, null, 2)}

Deal:
${JSON.stringify(deal, null, 2)}

Last message from prospect (if any):
${lastMessage || "(no recent reply)"}

Context:
${JSON.stringify(extra ?? {}, null, 2)}

Task:
- Be polite and value-focused.
- Reference the last interaction or next step.
- Make it easy for them to respond (yes/no or quick choice).
Return your follow-up message only.
    `;

    const res = await callOpenAI(prompt, {
      model: "gpt-4.1-mini",
      temperature: 0.7
    });

    return res;
  }
};
