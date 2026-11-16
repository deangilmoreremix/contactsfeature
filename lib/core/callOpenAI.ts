import { createResponse, ModelRole, Effort } from "./openaiClient";
import { openaiFunctionRouter } from "./openaiFunctionRouter";
import { logger } from "./logger";

/** Chat-style tool definition accepted for backwards compatibility; converted to the flat Responses shape. */
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: any;
  };
}

interface CallOpenAIOptions {
  /** Model role (default | thinking | fast | pro) or an explicit model id. */
  role?: ModelRole;
  model?: string;
  effort?: Effort;
  /** Only honoured by the Responses API when effort is "none" (non-reasoning mode). */
  temperature?: number;
  tools?: ToolDefinition[];
  systemPrompt?: string;
  schema?: any;
  schemaName?: string;
  maxOutputTokens?: number;
}

function toResponsesTools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    type: "function" as const,
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
    strict: false,
  }));
}

/**
 * Generic helper for calling OpenAI (Responses API) with optional tools.
 * If a tool call is returned, we route it via openaiFunctionRouter.
 * With `schema`, returns the parsed JSON object; otherwise the text.
 */
export async function callOpenAI(
  userPrompt: string,
  options: CallOpenAIOptions = {}
): Promise<string | any> {
  const { tools = [], systemPrompt } = options;

  logger.debug("Calling OpenAI Responses API", {
    role: options.role || options.model || "default",
    hasTools: !!tools.length
  });

  const result = await createResponse({
    role: options.role,
    model: options.model,
    effort: options.effort,
    temperature: options.temperature,
    instructions: systemPrompt,
    input: userPrompt,
    schema: options.schema,
    schemaName: options.schemaName,
    maxOutputTokens: options.maxOutputTokens,
    tools: tools.length ? toResponsesTools(tools) : undefined,
    toolChoice: tools.length ? "auto" : undefined
  });

  if (result.functionCalls.length) {
    const call = result.functionCalls[0];
    logger.info("OpenAI requested tool call", { fnName: call.name, args: call.arguments });
    return openaiFunctionRouter(call.name, call.arguments);
  }

  if (options.schema) {
    if (result.json === null) throw new Error("OpenAI returned no parseable JSON for the requested schema");
    return result.json;
  }

  return result.text;
}
