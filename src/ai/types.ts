/**
 * SmartCRM AI Orchestrator Types
 * Defines all AI task types and related interfaces
 */

export type AiTask =
  | "contact_analyze"
  | "lead_score"
  | "lead_score_feedback"
  | "ai_web_research"
  | "ai_contact_analysis"
  | "ai_auto_enrich"
  | "ai_goals"
  | "toolbar_lead_score"
  | "toolbar_email_ai"
  | "toolbar_enrich"
  | "toolbar_insights"
  | "sales_playbook"
  | "comm_optimizer"
  | "discovery_questions"
  | "deal_health"
  | "automation_suggestions"
  | "automation_optimization"
  | "comm_ai_email"
  | "comm_ai_sms"
  | "comm_ai_strategy"
  | "comm_ai_meeting_invite"
  | "comm_ai_proposal_email"
  | "ai_predictions"
  | "ai_risk_assessment"
  | "ai_trend_analysis"
  | "ai_insights_generation"
  | "intelligence_engine"
  | "smart_recommendations"
  | "sdr_persona_suggestion";

export interface ExecuteAiParams {
  task: AiTask;
  targetId?: string;
  workspaceId: string;
  options?: Record<string, any>;
}

export interface AiExecutionResult {
  ok: boolean;
  task: AiTask;
  data?: any;
  raw?: any;
  error?: string;
}

export interface CrmContext {
  contact?: any;
  deal?: any;
  company?: any;
  emails?: any[];
  tasks?: any[];
  notes?: any[];
  pipeline?: any;
  analytics?: any;
  persona?: any;
}

export interface AiUsageLog {
  workspaceId: string;
  task: AiTask;
  targetId?: string;
  model: string;
  inputSummary?: string;
  outputSummary?: string;
  createdAt: string;
}

export interface AiFeedback {
  workspaceId: string;
  task: AiTask;
  targetId: string;
  rating: "up" | "down";
  comment?: string;
  createdAt: string;
}