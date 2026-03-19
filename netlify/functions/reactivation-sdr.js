const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('reactivation-sdr');

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

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    const activityList = activities || [];
    const lastActivity = activityList[0];
    const daysSinceLastContact = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 90;

    const sdrModel = resolveModel(prefs, 'gpt-5.2', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1000);
    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'your company';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('reactivation-sdr', contact.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven reactivation framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate a reactivation email to re-engage a dormant lead.

Contact: ${contactName} at ${company}
Days since last contact: ${daysSinceLastContact}
Previous interactions: ${JSON.stringify(activityList.slice(0, 3))}
Contact details: ${JSON.stringify({
      title: contact.title,
      email: contact.email,
      industry: contact.industry,
      notes: contact.notes,
    })}

The reactivation email should:
- Acknowledge the time gap without being guilt-tripping
- Mention something that might have changed (industry trends, new features, etc.)
- Provide a compelling reason to re-engage
- Be warm and non-pushy
- Include a simple call-to-action${prefsBlock}

Return JSON with "subject" and "body" fields.`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      subject: `It's been a while, ${contactName}`,
      body: content,
    });

    log.info('Reactivation email generated', { contactId, daysSinceLastContact, gtmPromptUsed: !!gtmPrompt });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        sent: true,
        daysSinceLastContact,
        gtmPromptUsed: !!gtmPrompt,
      }),
    };
  } catch (error) {
    log.error('Reactivation email generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Reactivation email generation failed');
  }
});
