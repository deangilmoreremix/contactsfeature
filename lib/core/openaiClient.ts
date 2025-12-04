import OpenAI from "openai";
import { requireEnv } from "./env";

const OPENAI_API_KEY = requireEnv("OPENAI_API_KEY");

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});
