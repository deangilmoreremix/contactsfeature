const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('content-creation-agent');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, contentType, targetAudience, keyMessages } = body;

  const prefs = extractPreferences(body);

  try {
    let contact = null;

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

    const sdrModel = resolveModel(prefs, 'gpt-5.2', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 2000);
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('content-creation-agent', contact?.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven content creation framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate content for: ${contentType || 'outreach email'}

Target audience: ${targetAudience || 'B2B decision makers'}
${contact ? `For: ${contact.firstname || ''} ${contact.lastname || ''} at ${contact.company || ''}` : ''}

${keyMessages ? `Key messages: ${Array.isArray(keyMessages) ? keyMessages.join(', ') : keyMessages}` : ''}

Generate:
1. Primary content piece
2. 5 headline variations
3. Key takeaways
4. Call-to-action suggestions
5. Social media snippets

Return JSON with "content", "headlines" (array), "keyTakeaways" (array), "callToAction", "socialSnippets" (array).${prefsBlock}`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      content: '',
      headlines: [],
      keyTakeaways: [],
      callToAction: '',
      socialSnippets: [],
    });

    log.info('Content created', { contactId, contentType, gtmPromptUsed: !!gtmPrompt });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        contentType: contentType || 'outreach',
        targetAudience: targetAudience || 'B2B decision makers',
        ...parsed,
        gtmPromptUsed: !!gtmPrompt,
      }),
    };
  } catch (error) {
    log.error('Content creation failed', { contactId, contentType, error: error.message });
    return errorResponse(500, 'Content creation failed');
  }
});
