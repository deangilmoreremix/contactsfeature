/**
 * Central AI configuration for SmartCRM.
 *
 * Model ids live in ONE place — src/config/models.json — and are resolved on the server
 * (netlify/functions/_responses.js). The browser only ever names a ROLE
 * ("default" | "thinking" | "fast" | "pro") when calling the AI proxy (src/services/aiClient.ts);
 * it never needs, or holds, an OpenAI key.
 */
import models from './models.json';

export type ModelRole = 'default' | 'thinking' | 'fast' | 'pro';

export const SMARTCRM_DEFAULT_MODEL: ModelRole = 'default';
export const SMARTCRM_THINKING_MODEL: ModelRole = 'thinking';
export const SMARTCRM_FAST_MODEL: ModelRole = 'fast';

/** Display info for UI (real model ids from models.json, reasoning effort per role). */
export const MODEL_ROLES: Record<ModelRole, { model: string; effort: string }> = models.text;

// Task-based role routing
export type SmartCRMTask = "sdr" | "ae" | "autopilot" | "summary" | "ui-helper" | "research" | "communication" | "analysis";

export function getModelForTask(task: SmartCRMTask): ModelRole {
  switch (task) {
    case "sdr":
    case "ae":
    case "autopilot":
    case "research":
    case "analysis":
      return SMARTCRM_THINKING_MODEL; // deep reasoning for complex tasks

    case "communication":
      return SMARTCRM_DEFAULT_MODEL; // balanced

    case "summary":
    case "ui-helper":
    default:
      return SMARTCRM_FAST_MODEL; // fast and cheap
  }
}

export interface SmartCRMModels {
  core: ModelRole;
  fast: ModelRole;
  thinking: ModelRole;
}

export async function resolveSmartcrmModelsForUser(_userId?: string): Promise<SmartCRMModels> {
  return { core: SMARTCRM_DEFAULT_MODEL, fast: SMARTCRM_FAST_MODEL, thinking: SMARTCRM_THINKING_MODEL };
}

// SDR autopilot roles
export const SMARTCRM_SDR_MODEL: ModelRole = 'thinking'; // main SDR/autopilot brain
export const SMARTCRM_SDR_FAST: ModelRole = 'fast';      // quick subject/reply helpers
export const SMARTCRM_SDR_PRO: ModelRole = 'pro';        // heavy analytics

export function pickModelForSdrTask(task: "autopilot" | "inline" | "analytics"): ModelRole {
  if (task === "autopilot") return SMARTCRM_SDR_MODEL;
  if (task === "analytics") return SMARTCRM_SDR_PRO;
  return SMARTCRM_SDR_FAST;
}
