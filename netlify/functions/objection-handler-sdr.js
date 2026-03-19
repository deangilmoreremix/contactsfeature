const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody, sanitizeString } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('objection-handler-sdr');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId } = body;
  const idErr = validateContactId(contactId);
  if (idErr) return errorResponse(400, idErr);

  const objection = sanitizeString(body.objection, 2000);
  if (!objection) return errorResponse(400, 'Objection text is required');

  const prefs = extractPreferences(body);

  try {
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contact) return errorResponse(404, 'Contact not found');

    const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_THINKING_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1000);
    const contactName = contact.firstname || contact.name || 'the prospect';
    const company = contact.company || 'their company';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const prompt = `You are an expert sales development representative handling objections.

Contact: ${contactName} at ${company}
Title: ${contact.title || 'Not specified'}
Industry: ${contact.industry || 'Not specified'}

The prospect raised this objection: "${objection}"

Common objection categories:
- Price/Budget: "too expensive", "no budget", "need to cut costs"
- Timing: "not now", "maybe next quarter", "bad timing"
- Competition: "we use X competitor", "happy with current solution"
- Authority: "need to check with my boss", "not my decision"
- Need: "we don't need this", "not a priority"
- Trust: "never heard of you", "need references"

Craft a professional, empathetic response that:
1. Acknowledges their concern without being dismissive
2. Provides relevant context or reframe
3. Offers a path forward
4. Maintains the relationship even if they're not ready${prefsBlock}

Return JSON with:
- "response": The full email response text
- "confidence": A number from 0.0 to 1.0 indicating how confident you are in this response
- "objectionType": The category this objection falls into`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      response: content,
      confidence: 0.6,
      objectionType: 'unknown',
    });

    log.info('Objection handled', { contactId });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        objection,
        response: parsed.response,
        sent: true,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      }),
    };
  } catch (error) {
    log.error('Objection handling failed', { contactId, error: error.message });
    return errorResponse(500, 'Objection handling failed');
  }
});
