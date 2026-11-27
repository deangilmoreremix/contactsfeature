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

const OUTPUT_SCHEMA = S.obj({ content: S.str, headlines: S.strArr, keyTakeaways: S.strArr, callToAction: S.str, socialSnippets: S.strArr });

const log = createLogger('content-creation-agent');

exports.handler = stream(withAuth(async (event, user) => {
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

    const sdrModel = resolveModel(prefs, 'default', 'SMARTCRM_MODEL');
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

    return await runDual({
      event,
      body,
      options: callOptions([{ role: 'user', content: prompt }], { model: sdrModel, temperature, maxTokens, schema: OUTPUT_SCHEMA, schemaName: 'content_creation' }),
      finalize: (content) => {
        const parsed = parseJSONResponse(content, {
          content: '',
          headlines: [],
          keyTakeaways: [],
          callToAction: '',
          socialSnippets: [],
        });

        log.info('Content created', { contactId, contentType, gtmPromptUsed: !!gtmPrompt });

        return {
          contactId,
          contentType: contentType || 'outreach',
          targetAudience: targetAudience || 'B2B decision makers',
          ...parsed,
          gtmPromptUsed: !!gtmPrompt,
        };
      },
    });
  } catch (error) {
    log.error('Content creation failed', { contactId, contentType, error: error.message });
    return errorResponse(500, 'Content creation failed');
  }
}));
