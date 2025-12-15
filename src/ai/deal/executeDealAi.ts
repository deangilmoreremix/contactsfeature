import { supabase } from '../../../lib/core/supabaseClient';
import { callOpenAI } from '../../../lib/core/callOpenAI';
import { logger } from '../../../lib/core/logger';

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

export interface DealContext {
  deal: any; // Deal data
  contacts: any[]; // Associated contacts
  account: any; // Account data
  lastActivities: any[]; // Recent activities
  pipeline: any; // Pipeline data
  analytics: any; // Analytics slice
}

export async function buildDealContext(dealId: string, workspaceId: string): Promise<DealContext> {
  try {
    // Fetch deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('workspace_id', workspaceId)
      .single();

    if (dealError) throw dealError;

    // Fetch associated contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('deal_id', dealId)
      .eq('workspace_id', workspaceId);

    if (contactsError) throw contactsError;

    // Fetch account (assuming account_id in deal)
    let account = null;
    if (deal.account_id) {
      const { data: acc, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', deal.account_id)
        .eq('workspace_id', workspaceId)
        .single();

      if (!accError) account = acc;
    }

    // Fetch last activities (recent communications, meetings, etc.)
    const { data: lastActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('deal_id', dealId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) throw activitiesError;

    // Fetch pipeline data
    const { data: pipeline, error: pipelineError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', deal.pipeline_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (pipelineError) throw pipelineError;

    // Fetch analytics (placeholder - implement based on your analytics service)
    const analytics = {}; // TODO: Fetch from analytics service

    return {
      deal,
      contacts: contacts || [],
      account,
      lastActivities: lastActivities || [],
      pipeline,
      analytics
    };
  } catch (error) {
    logger.error('Error building deal context:', error);
    throw error;
  }
}

export async function buildContactContext(contact: any, workspaceId: string): Promise<DealContext> {
  try {
    // Create a mock deal from contact data
    const mockDeal = {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`.trim() || contact.name,
      value: contact.aiScore ? contact.aiScore * 1000 : 0,
      company: contact.company,
      stage: contact.status || 'prospect',
      account_id: null,
      pipeline_id: 'default',
      workspace_id: workspaceId,
      created_at: contact.createdAt,
      updated_at: contact.updatedAt
    };

    // Fetch account if company exists
    let account = null;
    if (contact.company) {
      const { data: acc, error: accError } = await supabase
        .from('accounts')
        .select('*')
        .eq('name', contact.company)
        .eq('workspace_id', workspaceId)
        .single();

      if (!accError) account = acc;
    }

    // Fetch last activities for this contact
    const { data: lastActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) throw activitiesError;

    // Mock pipeline
    const pipeline = {
      id: 'default',
      name: 'Default Pipeline',
      workspace_id: workspaceId
    };

    // Mock analytics
    const analytics = {};

    return {
      deal: mockDeal,
      contacts: [contact],
      account,
      lastActivities: lastActivities || [],
      pipeline,
      analytics
    };
  } catch (error) {
    logger.error('Error building contact context:', error);
    throw error;
  }
}

function getModelForTask(task: DealAiTask): string {
  if (task.startsWith('email_') || task === 'deal_share_summary' || task === 'sidebar_find_new_image') {
    return 'gpt-5.2-instant';
  }
  if (task.startsWith('sdr_') || task.startsWith('agent_') || task.startsWith('deal_') || task.startsWith('sidebar_') || task.startsWith('tab_') || task.startsWith('automation_')) {
    return 'gpt-5.2-thinking';
  }
  if (task.startsWith('intel_')) {
    return 'gpt-5.2-pro';
  }
  return 'gpt-5.2-thinking'; // default
}

function buildPromptForTask(task: DealAiTask, context: DealContext, options: DealAiOptions): string {
  const { deal, contacts, account, lastActivities, pipeline, analytics } = context;

  // SDR Tasks - Generate multi-step sequences
  if (task.startsWith('sdr_')) {
    const sdrType = task.replace('sdr_', '').replace('_', ' ');
    let specificInstructions = '';

    switch (task) {
      case 'sdr_enrich_contact':
        specificInstructions = 'Focus on identifying missing contact information and suggesting enrichment sources.';
        break;
      case 'sdr_competitor':
        specificInstructions = `Differentiate from competitors: ${options.competitors?.join(', ') || 'unknown'}.`;
        break;
      case 'sdr_objection_handler':
        specificInstructions = `Address the objection: "${options['objection'] || 'recent objection'}" with canned replies and follow-up sequence.`;
        break;
      case 'sdr_high_intent':
        specificInstructions = 'Compress timeline and push for immediate meeting due to high intent signals.';
        break;
      case 'sdr_bump':
        specificInstructions = 'Create a short nudge message to re-engage.';
        break;
      case 'sdr_reactivation':
      case 'sdr_winback':
        specificInstructions = 'Craft a "come back" campaign for long-dormant or lost deals.';
        break;
      case 'sdr_linkedin':
        specificInstructions = 'Optimize for LinkedIn messaging style and length.';
        break;
      case 'sdr_whatsapp':
        specificInstructions = 'Use WhatsApp conversational tone and shorter messages.';
        break;
      case 'sdr_event':
        specificInstructions = `Tie messaging to event: ${options.event || 'upcoming event'}.`;
        break;
      case 'sdr_referral':
        specificInstructions = 'Ask for referrals to other team members.';
        break;
      case 'sdr_newsletter':
        specificInstructions = 'Convert newsletter subscribers to qualified leads.';
        break;
      case 'sdr_cold_email':
        specificInstructions = 'Personalize cold outreach using available data and research.';
        break;
      default:
        specificInstructions = `Create a ${options.lengthDays || 7}-day ${sdrType} sequence.`;
    }

    return `Create a ${options.lengthDays || 7}-day ${sdrType} sequence for this deal.
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Last Activities: ${JSON.stringify(lastActivities)}
Channel: ${options.channel || 'email'}
Tone: ${options.tone || 'friendly'}
${specificInstructions}
Output JSON with "sequence" array containing objects with day_offset, channel, subject, body_html.`;
  }

  // Agent Tasks - Conversational AI assistants
  if (task.startsWith('agent_')) {
    const agentRole = task.replace('agent_', '').replace('_', ' ');
    let roleDescription = '';

    switch (task) {
      case 'agent_sales_assistant':
        roleDescription = 'Sales assistant that understands pipeline, next best actions, and stage risks.';
        break;
      case 'agent_analytics_expert':
        roleDescription = 'Analytics expert that interprets deal metrics and answers questions like "where are we losing deals?".';
        break;
      case 'agent_calendar_assistant':
        roleDescription = 'Calendar assistant that checks availability and proposes meeting times.';
        break;
      case 'agent_risk_assessor':
        roleDescription = 'Risk assessor that evaluates deal health and mitigation strategies.';
        break;
      case 'agent_achievement_coach':
        roleDescription = 'Achievement coach that suggests goals and habits based on deal performance.';
        break;
      case 'agent_contact_intel':
        roleDescription = 'Contact intelligence expert focusing on relationship dynamics.';
        break;
      case 'agent_lead_qualifier':
        roleDescription = 'Lead qualifier using BANT/MEDDIC style questioning.';
        break;
      case 'agent_comm_manager':
        roleDescription = 'Communication manager suggesting next emails/SMS and tone.';
        break;
      case 'agent_deal_analyst':
        roleDescription = 'Deal analyst providing CRO-style advice on deal strategy.';
        break;
    }

    return `You are a ${roleDescription} for this deal.
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Last Activities: ${JSON.stringify(lastActivities)}
Analytics: ${JSON.stringify(analytics)}
User Message: ${options.userMessage || 'Provide assistance for this deal.'}
Respond helpfully and contextually.`;
  }

  // Tab Tasks - Summary and insights
  if (task.startsWith('tab_')) {
    switch (task) {
      case 'tab_ai_insights':
        return `Generate top 3-5 AI insights for this deal combining metrics, contact intel, and history.
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Activities: ${JSON.stringify(lastActivities)}
Analytics: ${JSON.stringify(analytics)}
Output: insights + recommended actions.`;

      case 'tab_journey_summary':
        return `Build a narrative timeline of this deal's journey from activities.
Activities: ${JSON.stringify(lastActivities)}
Deal: ${JSON.stringify(deal)}
Output: chronological story highlighting key moments.`;

      case 'tab_comm_summary':
        return `Summarize communication threads, highlighting tone, open questions, missing stakeholders.
Activities: ${JSON.stringify(lastActivities)}
Contacts: ${JSON.stringify(contacts)}
Output: communication analysis.`;

      case 'tab_analytics_summary':
        return `Interpret deal metrics: probability of closing, time-to-close, size vs segment average.
Analytics: ${JSON.stringify(analytics)}
Deal: ${JSON.stringify(deal)}
Output: key metrics interpretation.`;

      case 'tab_automation_summary':
        return `Review existing automations for this deal and suggest improvements.
Deal: ${JSON.stringify(deal)}
Output: automation assessment and suggestions.`;
    }
  }

  // Sidebar Tasks
  if (task.startsWith('sidebar_')) {
    switch (task) {
      case 'sidebar_deal_analyze':
        return `Analyze deal health with summary. Similar to deal_health but concise.
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Activities: ${JSON.stringify(lastActivities)}
Output: health score + summary.`;

      case 'sidebar_contact_analysis':
        return `Analyze contacts scoped to this deal, similar to contact card AI.
Contacts: ${JSON.stringify(contacts)}
Deal: ${JSON.stringify(deal)}
Output: contact insights.`;

      case 'sidebar_contact_enrichment':
        return `Suggest enrichment for contacts, calling external APIs if needed.
Contacts: ${JSON.stringify(contacts)}
Output: enrichment suggestions.`;

      case 'sidebar_find_new_image':
        return `Suggest search queries for finding appropriate images for this deal/account.
Deal: ${JSON.stringify(deal)}
Account: ${JSON.stringify(account)}
Output: search query suggestions.`;
    }
  }

  // Email and Modal Tasks
  if (task.startsWith('email_') || task === 'contact_selector_suggestions' || task === 'custom_field_helper' || task === 'tag_suggestions') {
    switch (task) {
      case 'email_ai_generate':
        return `Generate email for goal: ${options.goal || 'general'}.
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Length: ${options.length || 'medium'}
Tone: ${options.tone || 'professional'}
Persona: ${options.personaId || 'default'}
Output: subject and body.`;

      case 'email_ai_with_persona':
        return `Generate email with persona profile.
Persona: ${options.personaProfile || 'standard'}
${buildPromptForTask('email_ai_generate', context, options)}`;

      case 'contact_selector_suggestions':
        return `Suggest internal contacts that often work with this company/account.
Account: ${JSON.stringify(account)}
Deal: ${JSON.stringify(deal)}
Output: suggested contacts list.`;

      case 'custom_field_helper':
        return `Suggest useful custom fields for this deal segment.
Deal: ${JSON.stringify(deal)}
Pipeline: ${JSON.stringify(pipeline)}
Output: field suggestions.`;

      case 'tag_suggestions':
        return `Suggest tags for better segmentation and automation.
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Output: tag recommendations.`;
    }
  }

  // Automation Tasks
  if (task.startsWith('automation_')) {
    switch (task) {
      case 'automation_meeting_times':
        return `Suggest 3 best meeting time slots based on timezone and patterns.
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Timezone: ${options.timezone || 'UTC'}
Previous meetings: ${JSON.stringify(lastActivities.filter(a => a.type === 'meeting'))}
Output: time slot suggestions with reasoning.`;

      case 'automation_followups':
        return `Create trigger rules for follow-up reminders based on engagement.
Activities: ${JSON.stringify(lastActivities)}
Output: automation rule suggestions.`;

      case 'automation_stage_progression':
        return `Suggest conditions for automatic stage progression.
Pipeline: ${JSON.stringify(pipeline)}
Deal: ${JSON.stringify(deal)}
Historical deals: ${options.similarDeals || []}
Output: progression rules.`;

      case 'automation_risk_alerts':
        return `Suggest risk-based alert conditions.
Deal: ${JSON.stringify(deal)}
Analytics: ${JSON.stringify(analytics)}
Output: alert rules.`;

      case 'automation_deal_status_updates':
      case 'automation_email_sequences':
      case 'automation_call_scheduling':
      case 'automation_progress_tracking':
        return `Suggest automation rules for ${task.replace('automation_', '').replace('_', ' ')}.
Deal: ${JSON.stringify(deal)}
Activities: ${JSON.stringify(lastActivities)}
Output: rule suggestions.`;
    }
  }

  // Intelligence Layer Tasks
  if (task.startsWith('intel_')) {
    switch (task) {
      case 'intel_next_best_actions':
        return `Analyze open actions and suggest 3-5 next best actions.
Deal: ${JSON.stringify(deal)}
Open Actions: ${options.openActions || []}
Analytics: ${JSON.stringify(analytics)}
Output: prioritized action list.`;

      case 'intel_risk_assessment':
        return `Provide 0-100 risk score, category, top risks, and mitigations.
Deal: ${JSON.stringify(deal)}
Analytics: ${JSON.stringify(analytics)}
Activities: ${JSON.stringify(lastActivities)}
Output: risk assessment.`;

      case 'intel_value_prediction':
        return `Predict final deal size, upsell potential.
Deal: ${JSON.stringify(deal)}
Historical: ${options.historicalDeals || []}
Analytics: ${JSON.stringify(analytics)}
Output: value predictions.`;

      case 'intel_timeline_estimation':
        return `Estimate expected close date with justification.
Deal: ${JSON.stringify(deal)}
Pipeline: ${JSON.stringify(pipeline)}
Analytics: ${JSON.stringify(analytics)}
Output: timeline estimate.`;

      case 'intel_deal_scoring':
        return `Multi-dimension score: Fit, Intent, Engagement, Champion strength.
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Activities: ${JSON.stringify(lastActivities)}
Output: dimension scores.`;

      case 'intel_stakeholder_analysis':
        return `Analyze participants and suggest missing roles.
Contacts: ${JSON.stringify(contacts)}
Activities: ${JSON.stringify(lastActivities)}
Output: stakeholder analysis.`;

      case 'intel_company_intel':
        return `Summarize company, industry, strategic initiatives.
Account: ${JSON.stringify(account)}
Deal: ${JSON.stringify(deal)}
Output: company intelligence.`;

      case 'intel_competitive_analysis':
        return `Compare vs lost deals to competitors, suggest messaging.
Deal: ${JSON.stringify(deal)}
Lost Deals: ${options.lostDeals || []}
Competitors: ${options.competitors || []}
Output: competitive analysis.`;
    }
  }

  // Deal-specific tasks
  switch (task) {
    case 'deal_analyze':
      return `Provide short plain-English summary, stage health, and "what to do today".
Deal: ${JSON.stringify(deal)}
Contacts: ${JSON.stringify(contacts)}
Activities: ${JSON.stringify(lastActivities)}
Output: summary + health + action.`;

    case 'deal_favorite_insights':
      return `Analyze why this deal should be favorited. Deal: ${JSON.stringify(deal)}. Contacts: ${JSON.stringify(contacts)}. Provide 1-2 bullet reasons.`;

    case 'deal_share_summary':
      return `Create a shareable summary for this deal. Deal: ${JSON.stringify(deal)}. Include subject and body for email/Slack.`;

    case 'deal_edit_helper':
      return `Compare old and new deal states. Old: ${options.oldDeal ? JSON.stringify(options.oldDeal) : 'N/A'}. New: ${JSON.stringify(deal)}. Suggest follow-up actions.`;

    default:
      return `Perform task ${task} for deal. Context: ${JSON.stringify(context)}. Options: ${JSON.stringify(options)}.`;
  }
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