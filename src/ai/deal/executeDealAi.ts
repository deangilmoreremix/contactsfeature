export type DealAiTask =
  | "deal_analyze"
  | "deal_favorite_insights"
  | "deal_share_summary"
  | "deal_edit_helper"
  | "sdr_enrich_contact"
  | "sdr_competitor"
  | "sdr_objection_handler"
  | "sdr_follow_up"
  | "sdr_high_intent"
  | "sdr_bump"
  | "sdr_reactivation"
  | "sdr_winback"
  | "sdr_linkedin"
  | "sdr_whatsapp"
  | "sdr_event"
  | "sdr_referral"
  | "sdr_newsletter"
  | "sdr_cold_email"
  | "agent_sales_assistant"
  | "agent_analytics_expert"
  | "agent_calendar_assistant"
  | "agent_risk_assessor"
  | "agent_achievement_coach"
  | "agent_contact_intel"
  | "agent_lead_qualifier"
  | "agent_comm_manager"
  | "agent_deal_analyst"
  | "tab_ai_insights"
  | "tab_journey_summary"
  | "tab_comm_summary"
  | "tab_analytics_summary"
  | "tab_automation_summary"
  | "sidebar_deal_analyze"
  | "sidebar_contact_analysis"
  | "sidebar_contact_enrichment"
  | "sidebar_find_new_image"
  | "email_ai_generate"
  | "email_ai_with_persona"
  | "contact_selector_suggestions"
  | "custom_field_helper"
  | "tag_suggestions"
  | "automation_meeting_times"
  | "automation_followups"
  | "automation_stage_progression"
  | "automation_risk_alerts"
  | "automation_deal_status_updates"
  | "automation_email_sequences"
  | "automation_call_scheduling"
  | "automation_progress_tracking"
  | "intel_next_best_actions"
  | "intel_risk_assessment"
  | "intel_value_prediction"
  | "intel_timeline_estimation"
  | "intel_deal_scoring"
  | "intel_stakeholder_analysis"
  | "intel_company_intel"
  | "intel_competitive_analysis";

export interface DealAiOptions {
  personaId?: string;
  lengthDays?: number;
  channel?: "email" | "linkedin" | "whatsapp";
  tone?: "friendly" | "direct" | "consultative";
  competitors?: string[];
  userMessage?: string;
  goal?: string;
  objection?: string;
  event?: string;
  length?: string;
  personaProfile?: string;
  timezone?: string;
  similarDeals?: any[];
  openActions?: any[];
  historicalDeals?: any[];
  lostDeals?: any[];
  oldDeal?: any;
  [key: string]: any;
}

export async function executeDealAi({
  task,
  dealId,
  workspaceId,
  options = {},
  contact // Optional contact object for contact-based SDR execution
}: {
  task: DealAiTask;
  dealId: string;
  workspaceId: string;
  options?: DealAiOptions;
  contact?: any; // Contact object
}): Promise<any> {
  try {
    const response = await fetch('/.netlify/functions/execute-deal-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, dealId, workspaceId, options, contact })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error');
    }

    return data.result;
  } catch (error) {
    console.error('Error calling SDR service:', error);
    throw error;
  }
}