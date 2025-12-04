import { requireEnv } from "./env";
import { logger } from "./logger";

const MCP_BASE_URL = requireEnv("MCP_BASE_URL");

/**
 * Generic MCP executor:
 *  - server: e.g. "SmartCRMTools", "AgentMail", "VoiceAgent"
 *  - method: e.g. "save_activity", "send_message"
 */
export async function executeTool(
  server: string,
  method: string,
  args: any
): Promise<any> {
  const url = `${MCP_BASE_URL}/mcp/${server}/${method}`;

  logger.debug("Executing MCP tool", { url, args });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("MCP tool error", { status: res.status, text });
    throw new Error(`MCP tool error: ${res.status} ${text}`);
  }

  const json = await res.json();
  logger.debug("MCP tool result", json);
  return json;
}
