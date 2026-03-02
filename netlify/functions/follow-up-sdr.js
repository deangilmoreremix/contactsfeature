const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { callOpenAI, parseJSONResponse } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('follow-up-sdr');

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, followUpNumber: rawFollowUp } = body;
  const idErr = validateContactId(contactId);
  if (idErr) return errorResponse(400, idErr);

  const followUpNum = parseInt(rawFollowUp) || 1;
  if (followUpNum < 1 || followUpNum > 10) {
    return errorResponse(400, 'followUpNumber must be between 1 and 10');
  }

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
    const maxTokens = resolveMaxTokens(prefs, 1000);

    const activityList = activities || [];
    const hasReplied = activityList.some(a => a.type === 'email_reply' || a.type === 'email_received');
    const lastActivity = activityList[0];
    const daysSinceLastActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    const prefsBlock = buildPreferencesPromptBlock(prefs);
    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'your company';

    const contextBlock = `Contact details: ${JSON.stringify({
      name: contactName, company, title: contact.title, email: contact.email, industry: contact.industry, notes: contact.notes,
    })}
Last activity: ${lastActivity ? JSON.stringify({ type: lastActivity.type, created_at: lastActivity.created_at }) : 'No recent activity'}
Days since last contact: ${daysSinceLastActivity}
Has replied before: ${hasReplied}`;

    let instructions = '';
    switch (followUpNum) {
      case 1:
        instructions = `Generate a gentle first follow-up email to ${contactName} at ${company}.\n\n${contextBlock}\n\nThe follow-up should:\n- Reference any previous conversation\n- Provide additional value or resources\n- Ask a specific question to encourage response\n- Keep it concise and friendly`;
        break;
      case 2:
        instructions = `Generate a second follow-up email to ${contactName} at ${company}.\n\n${contextBlock}\n\nThe follow-up should:\n- Acknowledge that this is a second attempt\n- Offer something new or different value\n- Create urgency or scarcity if appropriate\n- Be more direct about next steps`;
        break;
      case 3:
        instructions = `Generate a third follow-up email to ${contactName} at ${company}.\n\n${contextBlock}\n\nThe follow-up should:\n- Be more assertive about the value proposition\n- Include social proof or case studies if relevant\n- Give them an easy out if they're not interested\n- Consider this might be the last attempt`;
        break;
      default:
        instructions = `Generate a follow-up email (attempt #${followUpNum}) to ${contactName} at ${company}.\n\n${contextBlock}\n\nCreate a compelling follow-up that re-engages the contact.`;
    }

    const prompt = `${instructions}${prefsBlock}\n\nReturn JSON with "subject" and "body" fields.`;

    const content = await callOpenAI(
      [{ role: 'user', content: prompt }],
      { model: sdrModel, temperature, maxTokens }
    );

    const parsed = parseJSONResponse(content, {
      subject: `Follow-up #${followUpNum} - ${company}`,
      body: content,
    });

    log.info('Follow-up email generated', { contactId, followUpNum });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        sent: true,
        followUpNumber: followUpNum,
      }),
    };
  } catch (error) {
    log.error('Follow-up generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Follow-up generation failed');
  }
});
