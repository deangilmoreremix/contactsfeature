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

const ANALYSIS = S.obj({ score: S.num, issues: S.strArr, recommendations: S.strArr });
const OUTPUT_SCHEMA = S.obj({ spamScore: S.num, spamTriggersFound: S.strArr, subjectAnalysis: ANALYSIS, contentAnalysis: ANALYSIS, overallScore: S.num, recommendations: S.strArr, optimizedSubject: S.str, tips: S.strArr });

const log = createLogger('email-deliverability-agent');

const SPAM_TRIGGER_WORDS = [
  'free', 'act now', 'limited time', 'urgent', 'guarantee', 'winner', 'prize',
  'risk-free', 'no obligation', 'click here', 'buy now', 'order now', 'special promotion',
  '100%', 'cash bonus', 'earn money', 'income', 'investment', 'credit', 'loan',
  'cheap', 'discount', 'save', 'deal', 'offer', 'bonus', 'exclusive'
];

const SPAM_TRIGGER_PHRASES = [
  'act now!', 'limited time offer', 'don\'t miss out', 'hurry!', 'last chance',
  'once in a lifetime', 'no strings attached', '100% free', 'no questions asked',
  'will not believe', 'shocking', 'unbelievable', 'miracle', 'secret'
];

exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, subject, body: emailBody } = body;
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
    const temperature = resolveTemperature(prefs, 0.5);
    const maxTokens = resolveMaxTokens(prefs, 1200);
    const contactName = contact.firstname || contact.name || 'there';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('email-deliverability-agent', contact.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven email deliverability framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Analyze this email for deliverability and provide optimization recommendations.

Contact: ${contactName} at ${contact.company || 'their company'}
Industry: ${contact.industry || 'not specified'}

${subject ? `Subject: ${subject}` : ''}
${emailBody ? `Email body:\n${emailBody}` : ''}

Check for:
1. Spam trigger words and phrases - identify any that appear
2. Subject line optimization - length, capitalization, punctuation
3. Content structure - paragraph length, readability
4. Personalization - name usage, company references
5. Technical factors - link-to-text ratio, image usage
6. Sender reputation tips

Return JSON with:
1. "spamScore" - Risk of being marked spam (0-100, higher = more risky)
2. "spamTriggersFound" - Array of trigger words/phrases found
3. "subjectAnalysis" - Object with "score", "issues", "recommendations"
4. "contentAnalysis" - Object with "score", "issues", "recommendations"
5. "overallScore" - Overall deliverability score (0-100)
6. "recommendations" - Array of specific improvements
7. "optimizedSubject" - Improved subject line suggestion
8. "tips" - General best practices for this contact's industry${prefsBlock}`;

    return await runDual({
      event,
      body,
      options: callOptions([{ role: 'user', content: prompt }], { model: sdrModel, temperature, maxTokens, schema: OUTPUT_SCHEMA, schemaName: 'email_deliverability' }),
      finalize: (content) => {
        const parsed = parseJSONResponse(content, {
          spamScore: 0,
          spamTriggersFound: [],
          subjectAnalysis: { score: 50, issues: [], recommendations: [] },
          contentAnalysis: { score: 50, issues: [], recommendations: [] },
          overallScore: 50,
          recommendations: [],
          optimizedSubject: subject || '',
          tips: [],
        });

        log.info('Email deliverability analyzed', { contactId, overallScore: parsed.overallScore, gtmPromptUsed: !!gtmPrompt });

        return {
          contactId,
          originalSubject: subject,
          originalBody: emailBody,
          ...parsed,
          gtmPromptUsed: !!gtmPrompt,
        };
      },
    });
  } catch (error) {
    log.error('Email deliverability analysis failed', { contactId, error: error.message });
    return errorResponse(500, 'Email deliverability analysis failed');
  }
}));
