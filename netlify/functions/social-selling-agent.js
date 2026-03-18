const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('social-selling-agent');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, platform, campaignType } = body;
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
    const maxTokens = resolveMaxTokens(prefs, 2000);
    const contactName = `${contact.firstname || ''} ${contact.lastname || ''}`.trim() || 'there';
    const company = contact.company || 'their company';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const gtmPrompt = await getGTMPrompt('social-selling-agent', contact.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven social selling framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    const prompt = `${gtmBlock}Generate personalized social selling content for ${contactName} at ${company}.

Contact details: ${JSON.stringify({
  name: contactName, company, title: contact.title, industry: contact.industry, 
  linkedin: contact.social_profiles?.linkedin, notes: contact.notes,
})}

Platform: ${platform || 'LinkedIn'}
Campaign type: ${campaignType || 'connection_request'}

Generate:
1. Connection request message
2. Follow-up message
3. Content engagement ideas
4. Profile comment suggestions
5. Timing recommendations

Make it highly personalized and professional${prefsBlock}

Return JSON with "connectionRequest", "followUpMessage", "engagementIdeas", "profileComments", "timingRecommendations".`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      connectionRequest: '',
      followUpMessage: '',
      engagementIdeas: '',
      profileComments: '',
      timingRecommendations: '',
    });

    log.info('Social selling content generated', { contactId, platform, gtmPromptUsed: !!gtmPrompt });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        platform: platform || 'linkedin',
        campaignType: campaignType || 'connection_request',
        ...parsed,
        gtmPromptUsed: !!gtmPrompt,
      }),
    };
  } catch (error) {
    log.error('Social selling generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Social selling generation failed');
  }
});
