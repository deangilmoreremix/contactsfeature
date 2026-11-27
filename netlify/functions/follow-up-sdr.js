const { supabase } = require('./_supabaseClient');
const { withAuth, errorResponse } = require('./_auth');
const { buildSdrSystemPrompt, parseJsonResponse } = require('./_streamingUtils');
const { runDual } = require('./_stream/dual');
const { sdrOptions, EMAIL_DRAFT_SCHEMA } = require('./_stream/helpers');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const log = createLogger('follow-up-sdr');

// Main handler - supports both streaming and non-streaming
const { stream } = require('@netlify/functions');

exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  // Parse body
  let body = {};
  if (event.body) {
    if (typeof event.body === 'string') {
      try {
        body = JSON.parse(event.body);
      } catch {
        return errorResponse(400, 'Invalid JSON body');
      }
    } else {
      body = event.body;
    }
  }

  const { contactId, followUpNumber: rawFollowUp, preferences = {} } = body;

  if (!contactId) {
    return errorResponse(400, 'Contact ID is required');
  }

  const followUpNum = parseInt(rawFollowUp) || 1;
  if (followUpNum < 1 || followUpNum > 10) {
    return errorResponse(400, 'followUpNumber must be between 1 and 10');
  }

  const prefs = extractPreferences({ preferences });

  try {
    // Fetch contact with proper user filtering
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contact) return errorResponse(404, 'Contact not found');

    // Fetch recent activities
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    const sdrModel = resolveModel(prefs, 'thinking', 'SMARTCRM_THINKING_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1000);

    const activityList = activities || [];
    const hasReplied = activityList.some(a => a.type === 'email_reply' || a.type === 'email_received');
    const lastActivity = activityList[0];
    const daysSinceLastActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'your company';

    // Get GTM prompt for framework guidance
    const gtmPrompt = await getGTMPrompt('follow-up-sdr', contact.industry);
    const gtmBlock = gtmPrompt ? `${gtmPrompt}\n\n---\n\n` : '';

    // Build context from activities
    const contextBlock = `Contact details:
- Name: ${contactName}
- Company: ${company}
- Title: ${contact.title || 'Not specified'}
- Email: ${contact.email || 'N/A'}
- Industry: ${contact.industry || 'Not specified'}
- Notes: ${contact.notes || 'None'}

Activity context:
- Last activity: ${lastActivity ? `${lastActivity.type} on ${new Date(lastActivity.created_at).toLocaleDateString()}` : 'No recent activity'}
- Days since last contact: ${daysSinceLastActivity}
- Has replied before: ${hasReplied ? 'Yes' : 'No'}`;

    // Build follow-up specific instructions based on follow-up number
    let followUpInstructions = '';
    switch (followUpNum) {
      case 1:
        followUpInstructions = `This is the FIRST follow-up email. Requirements:
- Reference any previous conversation or initial outreach
- Provide additional value or helpful resources
- Ask a specific question to encourage response
- Keep it gentle and friendly, not pushy`;
        break;
      case 2:
        followUpInstructions = `This is the SECOND follow-up email. Requirements:
- Acknowledge this is a second attempt gracefully
- Offer something new or different value
- Create light urgency or scarcity if appropriate
- Be more direct about next steps`;
        break;
      case 3:
        followUpInstructions = `This is the THIRD follow-up email. Requirements:
- Be more assertive about the value proposition
- Include social proof or case studies if relevant
- Give them an easy out if they're not interested
- Consider this might be the final attempt`;
        break;
      default:
        followUpInstructions = `This is follow-up #${followUpNum}. Create a compelling follow-up that re-engages the contact.`;
    }

    // Build system prompt
    const systemPrompt = buildSdrSystemPrompt({
      agentType: `Follow-Up SDR (${followUpNum}/10)`,
      persona: prefs.personaId || 'b2b_saas_sdr',
      contact,
      preferences: prefs,
    });

    // Build user input for Responses API
    const userInput = `${gtmBlock}${followUpInstructions}

${contextBlock}
${buildPreferencesPromptBlock(prefs)}

Requirements:
- Subject line that references previous communication
- Warm, persistent tone
- Clear but soft call-to-action
- Under 120 words

Return ONLY valid JSON with "subject" and "body" fields. Example: {"subject": "Re: Quick question about ${company}", "body": "Hi ${contactName}, I wanted to follow up..."}`;

    // One code path for both modes: JSON (as before) or SSE status/delta/partial events followed by
    // `result` (exactly the JSON payload) when the client asks for a stream.
    return await runDual({
      event,
      body,
      options: sdrOptions({
        instructions: systemPrompt,
        input: userInput,
        model: sdrModel,
        temperature,
        maxTokens,
        schema: EMAIL_DRAFT_SCHEMA,
        schemaName: 'follow_up',
      }),
      finalize: (text) => {
        const parsed = parseJsonResponse(text, {
          subject: `Follow-up #${followUpNum} - ${company}`,
          body: text,
        });

        log.info('Follow-up email generated', { contactId, followUpNum, gtmPromptUsed: !!gtmPrompt, model: sdrModel });

        return {
          contactId,
          subject: parsed.subject,
          body: parsed.body,
          sent: false, // drafts only: nothing is emailed until the user saves or sends it
          followUpNumber: followUpNum,
          gtmPromptUsed: !!gtmPrompt,
          model: sdrModel,
        };
      },
    });
  } catch (error) {
    log.error('Follow-up generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Follow-up generation failed');
  }
}));
