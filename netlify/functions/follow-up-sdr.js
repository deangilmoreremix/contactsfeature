const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { buildSdrSystemPrompt, parseJsonResponse } = require('./_streamingUtils');
const { createStreamingResponse } = require('./_openaiClient');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const log = createLogger('follow-up-sdr');

// Main handler - supports both streaming and non-streaming
exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  // Check if streaming is requested
  const isStreaming = event.headers?.accept?.includes('text/event-stream') || 
                      event.queryStringParameters?.stream === 'true';

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

    const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_THINKING_MODEL');
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

    // If streaming requested, return streaming response
    if (isStreaming) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            let fullContent = '';

            for await (const chunk of createStreamingResponse({
              instructions: systemPrompt,
              input: userInput,
              model: sdrModel,
              temperature,
              maxTokens,
            })) {
              if (chunk.type === 'token') {
                fullContent += chunk.token;
                const data = JSON.stringify({ 
                  type: 'token', 
                  token: chunk.token,
                  partial: fullContent 
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } else if (chunk.type === 'error') {
                const errorData = JSON.stringify({ type: 'error', error: chunk.error });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                controller.close();
                return;
              }
            }

            const parsed = parseJsonResponse(fullContent, {
              subject: `Follow-up #${followUpNum} - ${company}`,
              body: fullContent,
            });

            log.info('Follow-up email generated (streaming)', { contactId, followUpNum, model: sdrModel });

            const completeData = JSON.stringify({ type: 'complete', data: parsed });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            log.error('Streaming follow-up failed', { contactId, error: error.message });
            const errorData = JSON.stringify({ type: 'error', error: error.message });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        }
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: responseStream,
        isBase64Encoded: false,
      };
    }

    // Non-streaming response
    let fullContent = '';
    for await (const chunk of createStreamingResponse({
      instructions: systemPrompt,
      input: userInput,
      model: sdrModel,
      temperature,
      maxTokens,
    })) {
      if (chunk.type === 'token') {
        fullContent += chunk.token;
      } else if (chunk.type === 'complete') {
        fullContent = chunk.content;
      }
    }

    const parsed = parseJsonResponse(fullContent, {
      subject: `Follow-up #${followUpNum} - ${company}`,
      body: fullContent,
    });

    log.info('Follow-up email generated', { contactId, followUpNum, gtmPromptUsed: !!gtmPrompt, model: sdrModel });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        sent: true,
        followUpNumber: followUpNum,
        gtmPromptUsed: !!gtmPrompt,
        model: sdrModel,
      }),
    };
  } catch (error) {
    log.error('Follow-up generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Follow-up generation failed');
  }
});
