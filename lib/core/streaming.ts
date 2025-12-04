import { openai } from "./openaiClient";
import { logger } from "./logger";

export async function streamOpenAIResponse(messages: any[], model = "gpt-4.1-mini") {
  logger.debug("Starting streaming OpenAI response", { model });

  const stream = await openai.chat.completions.create({
    model,
    messages,
    stream: true
  });

  let full = "";

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;

    if (typeof delta === "string") {
      full += delta;
    } else if (Array.isArray(delta)) {
      full += delta.map((d: any) => d.text || "").join("");
    }
  }

  return full;
}
