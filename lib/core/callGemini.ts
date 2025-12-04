import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireEnv } from "./env";
import { logger } from "./logger";

const GEMINI_API_KEY = requireEnv("GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface CallGeminiOptions {
  model?: string;
  systemPrompt?: string;
}

/**
 * Simple wrapper for Gemini-pro (text-only).
 */
export async function callGemini(
  userPrompt: string,
  options: CallGeminiOptions = {}
): Promise<string> {
  const { model = "gemini-1.5-pro", systemPrompt } = options;

  const modelInstance = genAI.getGenerativeModel({ model });

  let finalPrompt = userPrompt;
  if (systemPrompt) {
    finalPrompt = `${systemPrompt}\n\nUser:\n${userPrompt}`;
  }

  logger.debug("Calling Gemini", { model });

  const result = await modelInstance.generateContent(finalPrompt);
  const text = result.response.text();
  return text;
}
