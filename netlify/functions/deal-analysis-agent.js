const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('deal-analysis-agent');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, dealId } = body;
  
  if (!dealId) {
    return errorResponse(400, 'Deal ID is required');
  }

  const prefs = extractPreferences(body);

  try {
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (dealError) throw new Error(`Database error: ${dealError.message}`);
    if (!deal) return errorResponse(404, 'Deal not found');

    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', deal.contact_id)
      .maybeSingle();

    const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.5);
    const maxTokens = resolveMaxTokens(prefs, 1500);
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('deal-analysis-agent', contact?.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven deal analysis framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Analyze this deal and provide insights for closing it.

Deal details: ${JSON.stringify({
  name: deal.name,
  value: deal.value,
  stage: deal.stage,
  probability: deal.probability,
  expectedCloseDate: deal.expected_close_date,
  notes: deal.notes,
  createdAt: deal.created_at,
  updatedAt: deal.updated_at,
})}

${contact ? `Contact details: ${JSON.stringify({ name: contact.firstname || contact.name, company: contact.company, title: contact.title, industry: contact.industry })}` : ''}

Analyze and return JSON with:
1. "healthScore" - Overall deal health (0-100)
2. "riskFactors" - Array of risk factors with "factor", "severity" (low/medium/high), "description"
3. "strengths" - Array of positive factors
4. "recommendedActions" - Array of specific actions to move deal forward
5. "nextSteps" - What to do in the next call/meeting
6. "closingTimeline" - Estimated close date and confidence
7. "competitor intel" - Any competitive insights if available${prefsBlock}`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      healthScore: 50,
      riskFactors: [],
      strengths: [],
      recommendedActions: [],
      nextSteps: [],
      closingTimeline: { estimatedClose: null, confidence: 'medium' },
    });

    log.info('Deal analysis completed', { dealId, contactId, healthScore: parsed.healthScore });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        dealId,
        contactId,
        ...parsed,
        gtmPromptUsed: !!gtmPrompt,
      }),
    };
  } catch (error) {
    log.error('Deal analysis failed', { dealId, contactId, error: error.message });
    return errorResponse(500, 'Deal analysis failed');
  }
});
