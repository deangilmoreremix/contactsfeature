const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('win-back-sdr');

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
      .limit(20);

    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(5);

    const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_THINKING_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1200);
    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'your company';

    const dealList = deals || [];
    const activityList = activities || [];
    const lostDeal = dealList.find(d => d.status === 'lost' || d.stage === 'lost');
    const churnIndicators = activityList.filter(a =>
      a.type === 'cancellation' || a.type === 'churn' || a.outcome === 'lost'
    );

    const prompt = `You are creating a win-back campaign email for a churned or lost customer.

Contact: ${contactName} at ${company}
Title: ${contact.title || 'Not specified'}
Industry: ${contact.industry || 'Not specified'}

Deal history: ${JSON.stringify(dealList.slice(0, 3))}
Recent activities: ${JSON.stringify(activityList.slice(0, 5))}
Lost deal info: ${lostDeal ? JSON.stringify(lostDeal) : 'No specific lost deal found'}
Churn indicators: ${JSON.stringify(churnIndicators)}

Analyze the context and:
1. Identify the likely churn reason
2. Craft a personalized win-back offer
3. Write a compelling win-back email

Return JSON with:
- "subject": Email subject line
- "body": Full email body
- "churnReason": Your analysis of why they churned (1-2 sentences)
- "winBackOffer": The specific offer you're making to win them back

The email should:
- Acknowledge the past relationship
- Show you understand their potential concerns
- Present a compelling reason to return
- Include a special offer or incentive
- Have a clear, low-friction call to action${buildPreferencesPromptBlock(prefs)}`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      subject: `We'd love to have you back, ${contactName}`,
      body: content,
      churnReason: 'Analysis unavailable',
      winBackOffer: 'Contact us for a special returning customer offer',
    });

    log.info('Win-back email generated', { contactId });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        sent: true,
        churnReason: parsed.churnReason || 'Unable to determine specific churn reason',
        winBackOffer: parsed.winBackOffer || 'Special returning customer offer',
      }),
    };
  } catch (error) {
    log.error('Win-back email generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Win-back email generation failed');
  }
});
