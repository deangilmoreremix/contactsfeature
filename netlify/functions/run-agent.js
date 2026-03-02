const { supabase } = require('./_supabaseClient');
const { openai, buildSdrAgent } = require('./_aiClients');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature } = require('./_sdrPreferences');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { contactId } = body;
    const prefs = extractPreferences(body);

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'contactId is required' })
      };
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (contactError || !contact) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    const { data: settings } = await supabase
      .from('contact_agent_settings')
      .select('*')
      .eq('contact_id', contactId)
      .maybeSingle();

    const { data: autopilotRow } = await supabase
      .from('autopilot_state')
      .select('state_json, status')
      .eq('lead_id', contactId)
      .eq('agent_type', 'sdr_autopilot')
      .maybeSingle();

    const currentStep = autopilotRow?.state_json?.current_step || 1;
    const sequenceLength = settings?.sequence_length || autopilotRow?.state_json?.sequence_length || 5;
    const personaId = settings?.persona_id || 'cold_saas_founder';

    const agent = buildSdrAgent({
      agentId: 'sdr-autopilot',
      personaId,
      sequenceLength,
      step: currentStep,
      contact
    });

    const sdrModel = resolveModel(prefs, 'gpt-5.2', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const prompt = `${agent.instructions}

Contact: ${contact.name || 'Unknown'} at ${contact.company || 'Unknown Company'}
Email: ${contact.email || 'N/A'}
Title: ${contact.title || contact.jobTitle || 'N/A'}
Industry: ${contact.industry || 'N/A'}
Status: ${contact.lead_status || 'new'}
Step: ${currentStep} of ${sequenceLength}
${prefsBlock}

Generate the next outreach message for step ${currentStep}. Return JSON with "subject", "body", and "next_action" fields.`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: sdrModel,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (_parseErr) {
      parsed = { subject: `Follow up - Step ${currentStep}`, body: content, next_action: 'follow_up' };
    }

    const nextStep = currentStep + 1;
    const isComplete = nextStep > sequenceLength;

    if (autopilotRow) {
      const updatedState = {
        ...(autopilotRow.state_json || {}),
        current_step: isComplete ? sequenceLength : nextStep,
        last_executed_at: new Date().toISOString(),
        last_result: { subject: parsed.subject, next_action: parsed.next_action }
      };

      await supabase
        .from('autopilot_state')
        .update({
          state_json: updatedState,
          status: isComplete ? 'completed' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('lead_id', contactId)
        .eq('agent_type', 'sdr_autopilot');
    }

    try {
      await supabase.from('emails').insert({
        contact_id: contactId,
        from_email: 'sdr@smartcrm.ai',
        to_email: contact.email,
        subject: parsed.subject,
        body_text: parsed.body,
        status: 'draft',
        source: 'sdr_autopilot',
        direction: 'outbound'
      });
    } catch (_emailErr) {
      console.warn('Failed to save email draft:', _emailErr);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        step: currentStep,
        sequenceLength,
        subject: parsed.subject,
        body: parsed.body,
        next_action: parsed.next_action,
        isComplete,
        nextStep: isComplete ? null : nextStep
      })
    };

  } catch (error) {
    console.error('[run-agent] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'SDR agent execution failed',
        details: error.message
      })
    };
  }
};
