import { synthesizeSpeech } from "../core/openaiClient";
import { logger } from "../core/logger";

/**
 * Converts a text script into base64-encoded audio.
 */
export async function createVoiceMessage(script: string): Promise<string> {
  logger.info("Creating voice message from script");

  const audio = await synthesizeSpeech(script, "alloy");
  return Buffer.from(audio).toString("base64");
}
