const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { parseJSONResponse } = require('./_fetchWithRetry');
const { runDual } = require('./_stream/dual');
const { S, callOptions } = require('./_stream/helpers');
const { stream } = require('@netlify/functions');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const OUTPUT_SCHEMA = S.obj({ forecastSummary: S.str, conversionProbability: S.num, riskFactors: S.strArr, recommendations: S.strArr, keyMetrics: S.obj({ expectedRevenue: S.str, winRate: S.str, averageCycleDays: S.str, pipelineCoverage: S.str }) });

const log = createLogger('revenue-intelligence-agent');

exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, dealId, forecastPeriod } = body;

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

    const sdrModel = resolveModel(prefs, 'thinking', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.4);
    const maxTokens = resolveMaxTokens(prefs, 2000);
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('revenue-intelligence-agent', contact?.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven revenue intelligence framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate revenue intelligence analysis.

${contact ? `Contact: ${contact.firstname || ''} ${contact.lastname || ''} at ${contact.company || 'their company'}, ${contact.industry || ''}` : ''}
${deal ? `Deal: $${deal.value || 0} at stage ${deal.stage || 'unknown'}` : ''}

Forecast period: ${forecastPeriod || '3 months'}

Generate:
1. Revenue forecast summary
2. Deal conversion probability
3. Risk factors and mitigation
4. Recommendations for revenue growth
5. Key performance indicators

Return JSON with "forecastSummary", "conversionProbability", "riskFactors" (array), "recommendations" (array), "keyMetrics" (object).${prefsBlock}`;

    return await runDual({
      event,
      body,
      options: callOptions([{ role: 'user', content: prompt }], { model: sdrModel, temperature, maxTokens, schema: OUTPUT_SCHEMA, schemaName: 'revenue_intelligence' }),
      finalize: (content) => {
        const parsed = parseJSONResponse(content, {
          forecastSummary: '',
          conversionProbability: 0,
          riskFactors: [],
          recommendations: [],
          keyMetrics: {},
        });

        log.info('Revenue intelligence generated', { contactId, dealId, gtmPromptUsed: !!gtmPrompt });

        return {
          contactId,
          dealId,
          forecastPeriod: forecastPeriod || '3 months',
          ...parsed,
          gtmPromptUsed: !!gtmPrompt,
        };
      },
    });
  } catch (error) {
    log.error('Revenue intelligence failed', { contactId, dealId, error: error.message });
    return errorResponse(500, 'Revenue intelligence failed');
  }
}));
