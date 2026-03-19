const { supabase } = require('./_supabaseClient');
const { buildSdrAgent } = require('./_aiClients');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('run-agent');

exports.handler = withAuth(async (event, user) => {
  const correlationId = generateCorrelationId();
  log.setCorrelationId(correlationId);

  const body = parseBody(event);
  if (!body) {
    return errorResponse(400, 'Invalid JSON body');
  }

  const { contactId } = body;
  const contactError = validateContactId(contactId);
  if (contactError) {
    return errorResponse(400, contactError);
  }

  const prefs = extractPreferences(body);

  try {
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactErr || !contact) {
      return errorResponse(404, 'Contact not found');
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
      contact,
    });

    const sdrModel = resolveModel(prefs, 'gpt-5.2', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const prompt = `${agent.instructions}

Contact: ${contact.name || 'Unknown'} at ${contact.company || 'Unknown Company'}
Email: ${contact.email || 'N/A'}
Title: ${contact.title || 'N/A'}
Industry: ${contact.industry || 'N/A'}
Status: ${contact.status || 'new'}
Step: ${currentStep} of ${sequenceLength}
${prefsBlock}

Generate the next outreach message for step ${currentStep}. Return JSON with "subject", "body", and "next_action" fields.`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens: 1500 }
    );

    const parsed = parseJSONResponse(content, {
      subject: `Follow up - Step ${currentStep}`,
      body: content,
      next_action: 'follow_up',
    });

    const nextStep = currentStep + 1;
    const isComplete = nextStep > sequenceLength;

    if (autopilotRow) {
      const updatedState = {
        ...(autopilotRow.state_json || {}),
        current_step: isComplete ? sequenceLength : nextStep,
        last_executed_at: new Date().toISOString(),
        last_result: { subject: parsed.subject, next_action: parsed.next_action },
      };

      await supabase
        .from('autopilot_state')
        .update({
          state_json: updatedState,
          status: isComplete ? 'completed' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('lead_id', contactId)
        .eq('agent_type', 'sdr_autopilot');
    }

    await supabase.from('emails').insert({
      contact_id: contactId,
      from_email: 'sdr@smartcrm.ai',
      to_email: contact.email,
      subject: parsed.subject,
      body_text: parsed.body,
      status: 'draft',
      is_inbound: false,
      agent_type: 'sdr_autopilot',
      user_id: user.id,
    }).then(null, (err) => log.warn('Failed to save email draft', { error: err.message }));

    log.info('Agent run completed', { contactId, step: currentStep, isComplete });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        step: currentStep,
        sequenceLength,
        subject: parsed.subject,
        body: parsed.body,
        next_action: parsed.next_action,
        isComplete,
        nextStep: isComplete ? null : nextStep,
      }),
    };
  } catch (error) {
    log.error('Agent execution failed', { contactId, error: error.message });
    return errorResponse(500, 'SDR agent execution failed');
  }
});
