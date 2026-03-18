const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('generate-with-prompt');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { promptId, prompt, contactId, dealId, customInput, outputFormat } = body;

  if (!prompt && !promptId) {
    return errorResponse(400, 'Prompt or prompt ID is required');
  }

  const prefs = extractPreferences(body);

  try {
    let contact = null;
    let deal = null;

    if (contactId) {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (contactError) throw new Error(`Database error: ${contactError.message}`);
      contact = contactData;
    }

    if (dealId) {
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (dealError) throw new Error(`Database error: ${dealError.message}`);
      deal = dealData;
    }

    const model = resolveModel(prefs, 'gpt-5.2', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 2000);
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    let promptText = prompt || '';

    if (promptId && !prompt) {
      const { data: customPrompt } = await supabase
        .from('custom_prompts')
        .select('*')
        .eq('id', promptId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (customPrompt) {
        promptText = customPrompt.prompt;
      }
    }

    const userContext = buildUserContext({ contact, deal, customInput });

    const fullPrompt = `${promptText}

${userContext}

${outputFormat ? `Output format: ${outputFormat}` : ''}
${prefsBlock}

Generate the content now.`;

    log.info('Generating content with prompt', { promptId, contactId, dealId });

    const content = await callOpenAI(
      [{ role: 'user', content: fullPrompt }],
      { model, temperature, maxTokens }
    );

    let parsed;
    try {
      parsed = parseJSONResponse(content, { content });
    } catch {
      parsed = { content };
    }

    const result = {
      content: parsed.content || content,
      ...parsed,
      promptId,
      contactId,
      dealId,
      generatedAt: new Date().toISOString(),
    };

    await logGeneration({ userId: user.id, promptId, contactId, dealId, success: true });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result),
    };
  } catch (error) {
    log.error('Content generation failed', { promptId, contactId, error: error.message });
    await logGeneration({ userId: user.id, promptId, contactId, dealId, success: false, error: error.message });
    return errorResponse(500, 'Content generation failed');
  }
});

function buildUserContext({ contact, deal, customInput }) {
  const parts = [];

  if (contact) {
    const contactInfo = {
      name: `${contact.firstname || ''} ${contact.lastname || ''}`.trim() || 'there',
      company: contact.company || 'their company',
      title: contact.title || '',
      industry: contact.industry || '',
      email: contact.email || '',
      notes: contact.notes || '',
    };
    parts.push(`Contact: ${JSON.stringify(contactInfo)}`);
  }

  if (deal) {
    const dealInfo = {
      name: deal.name,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      expectedCloseDate: deal.expected_close_date,
    };
    parts.push(`Deal: ${JSON.stringify(dealInfo)}`);
  }

  if (customInput) {
    parts.push(`Additional context: ${customInput}`);
  }

  return parts.join('\n\n');
}

async function logGeneration({ userId, promptId, contactId, dealId, success, error }) {
  try {
    await supabase.from('prompt_generation_logs').insert({
      user_id: userId,
      prompt_id: promptId,
      contact_id: contactId,
      deal_id: dealId,
      success,
      error_message: error,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log generation:', err);
  }
}
