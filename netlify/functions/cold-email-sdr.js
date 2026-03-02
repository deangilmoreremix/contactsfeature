const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('cold-email-sdr');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId } = body;
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

    const sdrModel = resolveModel(prefs, 'gpt-5.2', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1000);
    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'your company';
    const title = contact.title || '';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const prompt = `Generate a personalized cold email to ${contactName}${title ? ` (${title})` : ''} at ${company}.

Contact details: ${JSON.stringify({
  name: contactName, company, title, email: contact.email, industry: contact.industry, notes: contact.notes,
})}

The cold email should:
- Have an attention-grabbing subject line
- Open with something relevant to them or their company
- Clearly articulate value proposition
- Include a soft call-to-action (not pushy)
- Be concise (under 150 words)
- Sound human, not templated${prefsBlock}

Return JSON with "subject" and "body" fields.`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      subject: `Quick question for ${contactName} at ${company}`,
      body: content,
    });

    log.info('Cold email generated', { contactId });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        sent: true,
      }),
    };
  } catch (error) {
    log.error('Cold email generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Cold email generation failed');
  }
});
