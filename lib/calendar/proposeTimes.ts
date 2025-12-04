import { callOpenAI } from "../core/callOpenAI";

export async function proposeTimes(contact: any) {
  const prompt = `
Suggest 3 meeting times for this contact:
${JSON.stringify(contact, null, 2)}

Use friendly, professional tone.
  `;
  return await callOpenAI(prompt, []);
}
