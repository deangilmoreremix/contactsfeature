const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

const MAX_FOLLOW_UPS = 5;
const FOLLOW_UP_DELAYS_HOURS = [24, 48, 72, 120, 168];

async function generateEmailWithAI(contact, stage, followUpCount, persona, customInstructions) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const model = process.env.SMARTCRM_MODEL || 'gpt-5.2';
  const contactName = contact.firstname || contact.name || 'there';
  const company = contact.company || 'your company';
  const title = contact.title || '';

  let stagePrompt = '';

  if (stage === 'cold_email') {
    stagePrompt = `Generate a personalized cold email to ${contactName}${title ? ` (${title})` : ''} at ${company}.
The cold email should:
- Have an attention-grabbing subject line
- Open with something relevant to them or their company
- Clearly articulate value proposition
- Include a soft call-to-action (not pushy)
- Be concise (under 150 words)
- Sound human, not templated`;
  } else if (stage === 'follow_up') {
    const followUpNum = followUpCount + 1;
    const urgency = followUpNum >= 3 ? 'Be more direct and create mild urgency.' : '';
    const lastChance = followUpNum >= MAX_FOLLOW_UPS
      ? 'This is the final follow-up. Give them an easy out if not interested.'
      : '';

    stagePrompt = `Generate follow-up email #${followUpNum} to ${contactName} at ${company}.
Previous outreach has not received a response yet.
The follow-up should:
- Reference previous outreach without being annoying
- Provide new value or a different angle
- Keep it short and respectful
- Ask a specific question to encourage a response
${urgency}
${lastChance}`;
  } else if (stage === 're_engagement') {
    stagePrompt = `Generate a re-engagement email to ${contactName} at ${company}.
This contact has gone cold after previous interactions.
The re-engagement should:
- Acknowledge the gap in communication
- Share something new or timely
- Be warm and non-pressuring
- Offer a clear, low-commitment next step`;
  } else if (stage === 'win_back') {
    stagePrompt = `Generate a win-back email to ${contactName} at ${company}.
This contact was previously interested but the deal was lost.
The win-back should:
- Acknowledge their previous interest
- Share what has changed or improved
- Offer a compelling reason to re-engage
- Be concise and respectful of their time`;
  }

  const personaBlock = persona
    ? `\nYou are writing as the "${persona}" persona. Match the tone and style of this persona.`
    : '';
  const instructionsBlock = customInstructions
    ? `\nAdditional instructions: ${customInstructions}`
    : '';

  const prompt = `${stagePrompt}

Contact details: ${JSON.stringify({
    name: contactName,
    company,
    title,
    email: contact.email,
    industry: contact.industry,
    notes: contact.notes,
    tags: contact.tags,
    interestLevel: contact.interestlevel,
    status: contact.status
  })}
${personaBlock}${instructionsBlock}

Return JSON with "subject" and "body" fields only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert SDR (Sales Development Representative) AI. Generate personalized, human-sounding sales emails. Always return valid JSON with "subject" and "body" fields.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    return { subject: `Quick note for ${contactName}`, body: content };
  }
}

function getNextFollowUpDelay(followUpCount) {
  const idx = Math.min(followUpCount, FOLLOW_UP_DELAYS_HOURS.length - 1);
  return FOLLOW_UP_DELAYS_HOURS[idx];
}

function isWithinBusinessHours(timezone) {
  try {
    const now = new Date();
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/New_York',
      hour: 'numeric',
      hour12: false
    }).format(now);
    const hour = parseInt(hourStr);
    const day = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/New_York',
      weekday: 'short'
    }).format(now);
    if (day === 'Sat' || day === 'Sun') return false;
    return hour >= 8 && hour < 18;
  } catch {
    return true;
  }
}

async function checkDailyRateLimit(contactId, maxPerDay) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('contact_id', contactId)
    .eq('is_inbound', false)
    .gte('created_at', oneDayAgo);
  return (count || 0) < (maxPerDay || 3);
}

async function checkDuplicateEmail(contactId, stage) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('emails')
    .select('id')
    .eq('contact_id', contactId)
    .eq('agent_type', stage)
    .gte('created_at', oneHourAgo)
    .limit(1);
  return data && data.length > 0;
}

async function logAgentActivity(contactId, userId, stateId, level, message) {
  await supabase.from('agent_logs').insert({
    contact_id: contactId,
    user_id: userId || null,
    agent_type: 'sdr',
    level,
    message,
    autopilot_state_id: stateId || null
  }).catch(() => {});

  await supabase.from('autopilot_logs').insert({
    contact_id: contactId,
    state: 'sdr_outreach',
    event: level === 'error' ? 'ERROR' : 'OUTREACH_SENT',
    details: { message }
  }).catch(() => {});
}

async function runAutopilotStep(contact, settings) {
  const { data: existingState } = await supabase
    .from('autopilot_state')
    .select('*')
    .eq('lead_id', contact.id)
    .eq('agent_type', 'sdr_autopilot')
    .maybeSingle();

  let state = existingState;
  if (!state) {
    const { data: newState, error } = await supabase
      .from('autopilot_state')
      .insert({
        lead_id: contact.id,
        agent_type: 'sdr_autopilot',
        status: 'active',
        current_stage: 'cold_email',
        follow_up_count: 0,
        total_emails_sent: 0,
        persona_id: settings.persona_id,
        user_id: settings.user_id || null,
        next_action_at: new Date().toISOString(),
        state_json: { initialized: true }
      })
      .select()
      .maybeSingle();
    if (error) throw new Error(`Failed to create autopilot state: ${error.message}`);
    state = newState;
  }

  if (['paused', 'stopped', 'completed'].includes(state.status)) {
    return { skipped: true, reason: `Autopilot is ${state.status}` };
  }

  if (settings.respect_business_hours && !isWithinBusinessHours(settings.timezone)) {
    return { skipped: true, reason: 'Outside business hours' };
  }

  if (!(await checkDailyRateLimit(contact.id, settings.max_emails_per_day))) {
    return { skipped: true, reason: 'Daily rate limit reached' };
  }

  if (state.last_reply_at) {
    const replyAge = Date.now() - new Date(state.last_reply_at).getTime();
    if (replyAge < 24 * 60 * 60 * 1000) {
      return { skipped: true, reason: 'Contact replied recently, waiting for human review' };
    }
  }

  let stage = state.current_stage || 'cold_email';
  let followUpCount = state.follow_up_count || 0;

  if (stage === 'follow_up' && followUpCount >= MAX_FOLLOW_UPS) {
    await supabase
      .from('autopilot_state')
      .update({
        status: 'completed',
        state_json: { ...state.state_json, completed_reason: 'max_follow_ups_reached' },
        updated_at: new Date().toISOString()
      })
      .eq('id', state.id);
    await logAgentActivity(contact.id, state.user_id, state.id, 'info',
      `Autopilot completed: max follow-ups (${MAX_FOLLOW_UPS}) reached.`);
    return { done: true, reason: 'Max follow-ups reached' };
  }

  if (await checkDuplicateEmail(contact.id, stage)) {
    return { skipped: true, reason: 'Duplicate email detected within the last hour' };
  }

  const emailContent = await generateEmailWithAI(
    contact, stage, followUpCount,
    settings.persona_id,
    settings.notes || settings.custom_instructions
  );

  const delayHours = getNextFollowUpDelay(stage === 'cold_email' ? 0 : followUpCount);
  const nextActionAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

  const { error: emailError } = await supabase.from('emails').insert({
    contact_id: contact.id,
    to_email: contact.email,
    subject: emailContent.subject,
    body_html: emailContent.body,
    body_text: emailContent.body,
    status: 'queued',
    agent_type: stage,
    autopilot_state_id: state.id,
    is_inbound: false,
    user_id: state.user_id || settings.user_id || null
  });
  if (emailError) throw new Error(`Failed to queue email: ${emailError.message}`);

  const nextStage = stage === 'cold_email' ? 'follow_up' : stage;
  const nextFollowUp = stage === 'cold_email' ? 0 : followUpCount + 1;

  await supabase.from('autopilot_state').update({
    current_stage: nextStage,
    follow_up_count: nextFollowUp,
    total_emails_sent: (state.total_emails_sent || 0) + 1,
    last_email_sent_at: new Date().toISOString(),
    messages_sent: (state.messages_sent || 0) + 1,
    next_action_at: nextActionAt,
    state_json: { ...state.state_json, last_subject: emailContent.subject, last_stage: stage },
    updated_at: new Date().toISOString()
  }).eq('id', state.id);

  await supabase.from('contact_agent_settings').update({
    current_step: (settings.current_step || 0) + 1,
    last_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('contact_id', contact.id);

  await logAgentActivity(contact.id, state.user_id, state.id, 'info',
    `[${stage}] Email queued: "${emailContent.subject}" | Next action in ${delayHours}h`);

  return {
    success: true,
    stage,
    followUpCount: nextFollowUp,
    subject: emailContent.subject,
    nextActionAt,
    emailQueued: true
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { contactId } = body;

    if (!contactId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'contactId is required' }) };
    }

    const { data: contact } = await supabase
      .from('contacts').select('*').eq('id', contactId).maybeSingle();
    if (!contact) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Contact not found' }) };
    }

    const { data: settings } = await supabase
      .from('contact_agent_settings').select('*').eq('contact_id', contactId).maybeSingle();
    if (!settings) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No agent settings found' }) };
    }

    if (!settings.autopilot_enabled && !settings.is_enabled) {
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ skipped: true, reason: 'Autopilot disabled' }) };
    }

    const result = await runAutopilotStep(contact, settings);
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ contactId, result }) };
  } catch (err) {
    console.error('[trigger-autopilot] error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to trigger autopilot', details: err.message }) };
  }
};