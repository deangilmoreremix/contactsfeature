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

const OUTPUT_SCHEMA = S.obj({ opening: S.str, valueProposition: S.str, discoveryQuestions: S.strArr, objections: S.arr(S.obj({ objection: S.str, response: S.str })), close: S.str, voicemail: S.str });

const log = createLogger('cold-call-sdr');

exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, dealId } = body;
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

    let deal = null;
    if (dealId) {
      const { data: dealData } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .eq('user_id', user.id)
        .maybeSingle();
      deal = dealData;
    }

    const sdrModel = resolveModel(prefs, 'default', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1500);
    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'their company';
    const title = contact.title || '';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('cold-call-sdr', contact.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven cold call framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate a personalized cold call script for calling ${contactName}${title ? ` (${title})` : ''} at ${company}.

Contact details: ${JSON.stringify({
  name: contactName, company, title, email: contact.email, industry: contact.industry, notes: contact.notes,
})}

${deal ? `Deal context: ${JSON.stringify({ value: deal.value, stage: deal.stage, notes: deal.notes })}` : ''}

The cold call script should include:
1. Opening - Hook that captures attention (first 15 seconds)
2. Value proposition - Why they should care
3. Discovery questions - 3-5 questions to uncover needs
4. Common objections with responses - Price, timing, not interested
5. Close - How to schedule next step
6. Voicemail message - If they don't answer

Keep it conversational and natural${prefsBlock}

Return JSON with "opening", "valueProposition", "discoveryQuestions" (array), "objections" (array with "objection" and "response"), "close", and "voicemail" fields.`;

    return await runDual({
      event,
      body,
      options: callOptions([{ role: 'user', content: prompt }], { model: sdrModel, temperature, maxTokens, schema: OUTPUT_SCHEMA, schemaName: 'cold_call_script' }),
      finalize: (content) => {
        const parsed = parseJSONResponse(content, {
          opening: `Hi ${contactName}, this is [Your Name] from [Your Company]...`,
          valueProposition: 'I help companies like yours...',
          discoveryQuestions: ['What challenges are you facing?', 'What are your goals?'],
          objections: [{ objection: 'Not interested', response: 'I understand, let me ask you a quick question...' }],
          close: 'Could we schedule 15 minutes to discuss?',
          voicemail: 'Hi ${contactName}, this is [Your Name] calling from [Your Company]...',
        });

        log.info('Cold call script generated', { contactId, dealId, gtmPromptUsed: !!gtmPrompt });

        return {
          contactId,
          dealId,
          ...parsed,
          gtmPromptUsed: !!gtmPrompt,
        };
      },
    });
  } catch (error) {
    log.error('Cold call script generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Cold call script generation failed');
  }
}));
