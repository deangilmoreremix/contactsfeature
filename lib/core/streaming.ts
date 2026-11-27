import { streamResponse, ModelRole } from "./openaiClient";
import { logger } from "./logger";

/**
 * Streams a Responses API call and returns the full text.
 * `messages` is a chat-style array: system/developer messages become `instructions`,
 * the rest is passed as Responses input items.
 */
export async function streamOpenAIResponse(
  messages: Array<{ role: string; content: any }>,
  role: ModelRole | string = "fast",
  onDelta?: (text: string) => void
) {
  logger.debug("Starting streaming OpenAI response", { role });

  const instructions = messages
    .filter((m) => m.role === "system" || m.role === "developer")
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n\n");
  const input = messages
    .filter((m) => m.role !== "system" && m.role !== "developer")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
    }));

  let full = "";
  for await (const ev of streamResponse({
    role,
    instructions: instructions || undefined,
    input
  })) {
    if (ev.type === "delta") {
      full += ev.text;
      onDelta?.(ev.text);
    } else if (ev.type === "error") {
      throw new Error(ev.message);
    }
  }
  return full;
}
