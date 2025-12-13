/**
 * Central AI Configuration for SmartCRM
 * Manages model versions and routing for GPT-5.2 upgrade
 */

// Environment-based model configuration
export const SMARTCRM_DEFAULT_MODEL = process.env['SMARTCRM_MODEL'] || "gpt-5.2";
export const SMARTCRM_THINKING_MODEL = process.env['SMARTCRM_THINKING_MODEL'] || "gpt-5.2-thinking";
export const SMARTCRM_FAST_MODEL = process.env['SMARTCRM_FAST_MODEL'] || "gpt-5.2-instant";

// Legacy model support (for backward compatibility)
export const LEGACY_MODELS = {
  DEFAULT: "gpt-5.1",
  THINKING: "gpt-5.1-thinking",
  FAST: "gpt-5.1-instant"
};

// Task-based model routing
export type SmartCRMTask = "sdr" | "ae" | "autopilot" | "summary" | "ui-helper" | "research" | "communication" | "analysis";

export function getModelForTask(task: SmartCRMTask): string {
  switch (task) {
    case "sdr":
    case "ae":
    case "autopilot":
    case "research":
    case "analysis":
      return SMARTCRM_THINKING_MODEL; // Deep reasoning for complex tasks

    case "communication":
      return SMARTCRM_DEFAULT_MODEL; // Balanced for communication tasks

    case "summary":
    case "ui-helper":
    default:
      return SMARTCRM_FAST_MODEL; // Fast and cheap for simple tasks
  }
}

// User/workspace-specific model resolution
export interface SmartCRMModels {
  core: string;
  fast: string;
  thinking: string;
}

export async function resolveSmartcrmModelsForUser(userId?: string): Promise<SmartCRMModels> {
  // TODO: Implement database lookup for user-specific model preferences
  // For now, return environment defaults
  return {
    core: SMARTCRM_DEFAULT_MODEL,
    fast: SMARTCRM_FAST_MODEL,
    thinking: SMARTCRM_THINKING_MODEL
  };
}

// Model capabilities and limits
export const MODEL_LIMITS = {
  "gpt-5.2": {
    maxTokens: 128000,
    contextWindow: 128000,
    supportsTools: true,
    supportsVision: true
  },
  "gpt-5.2-thinking": {
    maxTokens: 128000,
    contextWindow: 128000,
    supportsTools: true,
    supportsVision: true
  },
  "gpt-5.2-instant": {
    maxTokens: 32000,
    contextWindow: 32000,
    supportsTools: true,
    supportsVision: false
  }
};

// Migration utilities
export function isLegacyModel(model: string): boolean {
  return Object.values(LEGACY_MODELS).includes(model);
}

export function migrateModelToCurrent(model: string): string {
  switch (model) {
    case LEGACY_MODELS.DEFAULT:
      return SMARTCRM_DEFAULT_MODEL;
    case LEGACY_MODELS.THINKING:
      return SMARTCRM_THINKING_MODEL;
    case LEGACY_MODELS.FAST:
      return SMARTCRM_FAST_MODEL;
    default:
      return model; // Already current
  }
}-e 
// SDR Autopilot specific models
export const SMARTCRM_SDR_MODEL = "gpt-5.2-thinking";  // Main SDR/autopilot brain
export const SMARTCRM_SDR_FAST  = "gpt-5.2-instant";   // Quick subject/reply helpers
export const SMARTCRM_SDR_PRO   = "gpt-5.2-pro";       // Heavy analytics (optional)

// Model selection helper for SDR tasks
export function pickModelForSdrTask(task: "autopilot" | "inline" | "analytics") {
  if (task === "autopilot") return SMARTCRM_SDR_MODEL;
  if (task === "analytics") return SMARTCRM_SDR_PRO;
  return SMARTCRM_SDR_FAST;
}
