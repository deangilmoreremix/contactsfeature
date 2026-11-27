import { transcribeBuffer } from "../core/openaiClient";
import { logger } from "../core/logger";

/**
 * Transcribes a base64 audio input.
 */
export async function transcribeAudio(base64: string): Promise<string> {
  logger.info("Transcribing audio");

  const buffer = Buffer.from(base64, "base64");
  return transcribeBuffer(buffer, "audio.mp3", "audio/mpeg");
}
