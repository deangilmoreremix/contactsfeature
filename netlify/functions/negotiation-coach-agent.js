const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('negotiation-coach-agent');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, dealId, negotiationStage, currentObjections } = body;

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

    let contact = null;
    if (deal.contact_id) {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', deal.contact_id)
        .maybeSingle();
      contact = contactData;
    }

    const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.5);
    const maxTokens = resolveMaxTokens(prefs, 2000);
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('negotiation-coach-agent', contact?.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven negotiation framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate negotiation coaching for this deal.

Deal: $${deal.value || 0} at ${deal.stage || 'unknown stage'}
Negotiation stage: ${negotiationStage || 'discovery'}
${contact ? `Contact: ${contact.firstname || ''} ${contact.lastname || ''} at ${contact.company || ''}` : ''}
${currentObjections ? `Current objections: ${currentObjections}` : ''}

Generate:
1. Strategy recommendations
2. Objection handling responses
3. Concession planning
4. Closing techniques
5. Risk assessment
6. Next steps

Return JSON with "strategyRecommendations" (array), "objectionHandling" (object), "concessionPlan" (array), "closingTechniques" (array), "riskAssessment" (object), "nextSteps" (array).${prefsBlock}`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      strategyRecommendations: [],
      objectionHandling: {},
      concessionPlan: [],
      closingTechniques: [],
      riskAssessment: {},
      nextSteps: [],
    });

    log.info('Negotiation coaching generated', { dealId, contactId, gtmPromptUsed: !!gtmPrompt });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        dealId,
        negotiationStage: negotiationStage || 'discovery',
        dealValue: deal.value || 0,
        ...parsed,
        gtmPromptUsed: !!gtmPrompt,
      }),
    };
  } catch (error) {
    log.error('Negotiation coaching failed', { dealId, contactId, error: error.message });
    return errorResponse(500, 'Negotiation coaching failed');
  }
});
