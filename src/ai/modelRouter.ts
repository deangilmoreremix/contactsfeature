/**
 * SmartCRM AI Model Router
 * Intelligently routes AI tasks to appropriate GPT-5.2 variants
 */

import type { AiTask } from './types';

/**
 * Routes AI tasks to the most appropriate GPT-5.2 model variant
 * based on task complexity and requirements
 */
export function pickModelForTask(task: AiTask): string {
  switch (task) {
    // Heavy analytics & cross-panel intelligence
    case "ai_predictions":
    case "ai_risk_assessment":
    case "ai_trend_analysis":
    case "ai_insights_generation":
    case "intelligence_engine":
    case "smart_recommendations":
      return "gpt-5.2-pro";

    // Deep reasoning / multi-step logic
    case "contact_analyze":
    case "lead_score":
    case "ai_contact_analysis":
    case "sales_playbook":
    case "deal_health":
    case "automation_suggestions":
    case "automation_optimization":
    case "ai_auto_enrich":
    case "sdr_persona_suggestion":
      return "gpt-5.2-thinking";

    // Fast, focused tasks (email, insights, communication)
    case "ai_web_research":
    case "ai_goals":
    case "toolbar_lead_score":
    case "toolbar_email_ai":
    case "toolbar_enrich":
    case "toolbar_insights":
    case "comm_optimizer":
    case "discovery_questions":
    case "comm_ai_email":
    case "comm_ai_sms":
    case "comm_ai_strategy":
    case "comm_ai_meeting_invite":
    case "comm_ai_proposal_email":
    case "lead_score_feedback":
    default:
      return "gpt-5.2-instant";
  }
}

/**
 * Gets model configuration including context limits and pricing
 */
export function getModelConfig(model: string) {
  const configs = {
    "gpt-5.2-instant": {
      maxTokens: 4096,
      contextWindow: 8192,
      costPerToken: 0.0015,
      typicalLatency: "fast"
    },
    "gpt-5.2-thinking": {
      maxTokens: 8192,
      contextWindow: 32768,
      costPerToken: 0.003,
      typicalLatency: "medium"
    },
    "gpt-5.2-pro": {
      maxTokens: 16384,
      contextWindow: 131072,
      costPerToken: 0.006,
      typicalLatency: "slow"
    }
  };

  return configs[model as keyof typeof configs] || configs["gpt-5.2-instant"];
}

/**
 * Validates if a task can be handled by the selected model
 */
export function validateTaskModel(task: AiTask, model: string): boolean {
  // All combinations are valid for now, but this could include
  // business logic like "pro tasks require pro model"
  return true;
}