import { openai } from "./openaiClient";
import { openaiFunctionRouter } from "./openaiFunctionRouter";
import { logger } from "./logger";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: any;
  };
}

interface CallOpenAIOptions {
  model?: string;
  temperature?: number;
  tools?: ToolDefinition[];
  systemPrompt?: string;
}

/**
 * Generic helper for calling OpenAI with optional tools.
 * If a tool call is returned, we route it via openaiFunctionRouter.
 */
export async function callOpenAI(
  userPrompt: string,
  options: CallOpenAIOptions = {}
): Promise<string | any> {
  const {
    model = "gpt-4.1",
    temperature = 0.7,
    tools = [],
    systemPrompt
  } = options;

  const messages: any[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({
    role: "user",
    content: userPrompt
  });

  logger.debug("Calling OpenAI", { model, hasTools: !!tools.length });

  const resp = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    tools: tools.length ? tools : undefined,
    tool_choice: tools.length ? "auto" : undefined
  });

  const choice = resp.choices[0];

  // Tool call
  if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
    const toolCall = choice.message.tool_calls[0];
    const fnName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments || "{}");

    logger.info("OpenAI requested tool call", { fnName, args });

    return openaiFunctionRouter(fnName, args);
  }

  // Normal text response
  const content = choice.message.content;
  if (typeof content === "string") return content;

  // If content is an array of parts
  if (Array.isArray(content)) {
    return content.map((c: any) => c.text || "").join("");
  }

  return "";
}
