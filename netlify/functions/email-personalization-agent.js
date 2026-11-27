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

const OUTPUT_SCHEMA = S.obj({ subjectLines: S.strArr, emailBody: S.str, callToAction: S.str, sendTimeRecommendations: S.strArr, followUpSequence: S.strArr });

const log = createLogger('email-personalization-agent');

exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, emailType } = body;
  const idErr = validateContactId(contactId);
  if (idErr) return errorResponse(400, idErr);

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

    const sdrModel = resolveModel(prefs, 'default', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 2000);
    const contactName = `${contact.firstname || ''} ${contact.lastname || ''}`.trim() || 'there';
    const company = contact.company || 'their company';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('email-personalization-agent', contact.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven email personalization framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate personalized email content for ${contactName} at ${company}.

Contact details: ${JSON.stringify({
  name: contactName, company, title: contact.title, industry: contact.industry, 
  email: contact.email, notes: contact.notes,
})}

Email type: ${emailType || 'outreach'}

Generate:
1. 5 subject line variants for A/B testing
2. Personalized email body
3. Call-to-action suggestions
4. Optimal send time recommendations
5. Follow-up sequence ideas

Make it conversion-focused${prefsBlock}

Return JSON with "subjectLines" (array), "emailBody", "callToAction", "sendTimeRecommendations" (array), "followUpSequence" (array).`;

    return await runDual({
      event,
      body,
      options: callOptions([{ role: 'user', content: prompt }], { model: sdrModel, temperature, maxTokens, schema: OUTPUT_SCHEMA, schemaName: 'email_personalization' }),
      finalize: (content) => {
        const parsed = parseJSONResponse(content, {
          subjectLines: [],
          emailBody: '',
          callToAction: '',
          sendTimeRecommendations: [],
          followUpSequence: [],
        });

        log.info('Email personalization generated', { contactId, emailType, gtmPromptUsed: !!gtmPrompt });

        return {
          contactId,
          emailType: emailType || 'outreach',
          ...parsed,
          gtmPromptUsed: !!gtmPrompt,
        };
      },
    });
  } catch (error) {
    log.error('Email personalization failed', { contactId, error: error.message });
    return errorResponse(500, 'Email personalization failed');
  }
}));
