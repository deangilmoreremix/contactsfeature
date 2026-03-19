const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('discovery-sdr');

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

    const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_THINKING_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1500);
    const contactName = contact.firstname || contact.name || 'Unknown';
    const company = contact.company || 'Unknown Company';
    const title = contact.title || '';
    const prefsBlock = buildPreferencesPromptBlock(prefs);

    const prompt = `You are a Sales Development Representative performing discovery research on a prospect.

Contact: ${contactName}
Title: ${title || 'Not specified'}
Company: ${company}
Email: ${contact.email || 'Not specified'}
Industry: ${contact.industry || 'Not specified'}
Notes: ${contact.notes || 'None'}

Recent activities: ${JSON.stringify((activities || []).slice(0, 5))}

Perform comprehensive discovery research and return JSON with:
1. "research": {
   "linkedin": "Summary of what we can infer about their LinkedIn presence and role",
   "company": "Key insights about their company, size, funding, recent news",
   "triggers": ["List of 3-5 potential trigger events or pain points"]
}
2. "qualification": {
   "score": number from 1-10 based on fit,
   "reasons": ["3-4 reasons for the score"]
}
3. "nextActions": ["List of 3-5 recommended next actions for the SDR"]

Be specific and actionable in your analysis.${prefsBlock}`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const fallback = {
      research: { linkedin: `${contactName} at ${company}`, company: `${company} - further research needed`, triggers: ['Initial outreach recommended'] },
      qualification: { score: 5, reasons: ['Unable to fully analyze - manual review needed'] },
      nextActions: ['Perform manual research', 'Visit company website', 'Schedule discovery call'],
    };

    const parsed = parseJSONResponse(content, fallback);

    log.info('Discovery research completed', { contactId });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        research: parsed.research || fallback.research,
        qualification: parsed.qualification || fallback.qualification,
        nextActions: parsed.nextActions || fallback.nextActions,
      }),
    };
  } catch (error) {
    log.error('Discovery research failed', { contactId, error: error.message });
    return errorResponse(500, 'Discovery research failed');
  }
});
