const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('competitive-intelligence-agent');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, targetCompany } = body;

  if (!targetCompany && !contactId) {
    return errorResponse(400, 'Contact ID or target company is required');
  }

  const prefs = extractPreferences(body);

  try {
    let contact = null;
    let company = targetCompany;

    if (contactId) {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (contactError) throw new Error(`Database error: ${contactError.message}`);
      contact = contactData;
      if (!company && contact) {
        company = contact.company;
      }
    }

    const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.4);
    const maxTokens = resolveMaxTokens(prefs, 2000);
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('competitive-intelligence-agent', contact?.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven competitive intelligence framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate competitive intelligence analysis for: ${company || 'the target company'}

${contact ? `Industry: ${contact.industry || 'not specified'}` : ''}

Generate:
1. Company overview and market positioning
2. Strengths, weaknesses, opportunities, threats (SWOT)
3. Competitive advantages and vulnerabilities
4. Strategic recommendations
5. Risk assessment

Return JSON with "overview", "swot" (object with arrays), "competitiveAdvantages", "vulnerabilities", "recommendations" (array), "riskAssessment".${prefsBlock}`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      overview: '',
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      competitiveAdvantages: [],
      vulnerabilities: [],
      recommendations: [],
      riskAssessment: {},
    });

    log.info('Competitive intelligence generated', { contactId, targetCompany: company, gtmPromptUsed: !!gtmPrompt });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        targetCompany: company,
        ...parsed,
        gtmPromptUsed: !!gtmPrompt,
      }),
    };
  } catch (error) {
    log.error('Competitive intelligence failed', { contactId, targetCompany, error: error.message });
    return errorResponse(500, 'Competitive intelligence failed');
  }
});
