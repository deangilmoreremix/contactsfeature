const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { buildSdrSystemPrompt, parseJsonResponse } = require('./_streamingUtils');
const { createStreamingResponse } = require('./_openaiClient');
const { createLogger, generateCorrelationId } = require('./_logger');
const { resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const log = createLogger('reactivation-sdr');

// Reactivation agent system prompt
const REACTIVATION_SYSTEM_PROMPT = `You are SmartCRM's expert reactivation SDR agent, powered by GPT-5.2.

Your role: Re-engage dormant or inactive leads who haven't responded recently.

Guidelines:
- Reference the time gap without being apologetic about it
- Provide NEW value (updates, news, insights) not previously shared
- Show genuine interest in their current situation
- Acknowledge that priorities may have changed
- Make it easy for them to re-engage or opt out gracefully
- Be warm, friendly, and understanding
- Never guilt-trip or be passive-aggressive

Reactivation Strategies:
1. Reference past interactions positively
2. Share new value, updates, or insights
3. Ask about their current priorities
4. Offer a fresh start or new conversation
5. Provide an easy "out" if they're not interested`;

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

  const { contactId, preferences = {} } = body;

  if (!contactId) {
    return errorResponse(400, 'Contact ID is required');
  }

  const model = resolveModel({ model: preferences.model }, 'gpt-5.2', 'SMARTCRM_MODEL');
  const temperature = resolveTemperature({ temperature: preferences.temperature }, 0.7);
  const maxTokens = resolveMaxTokens({ maxTokens: preferences.maxTokens }, 1000);

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

    const activityList = activities || [];
    const lastActivity = activityList[0];
    const daysSinceLastActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'their company';

    // Determine reactivation urgency based on days inactive
    let reactivationTone = 'standard';
    if (daysSinceLastActivity && daysSinceLastActivity > 90) {
      reactivationTone = 'aggressive'; // Longer gap, more direct
    } else if (daysSinceLastActivity && daysSinceLastActivity > 60) {
      reactivationTone = 'warm'; // Moderate gap
    }

    // Build user input
    const userInput = `Generate a reactivation email to re-engage ${contactName} at ${company}.

Contact Details:
- Name: ${contactName}
- Title: ${contact.title || 'Not specified'}
- Company: ${company}
- Industry: ${contact.industry || 'Not specified'}
- Email: ${contact.email || 'N/A'}
- Status: ${contact.status || 'inactive'}
- Interest Level: ${contact.interestLevel || 'Not specified'}

Activity Context:
- Last activity: ${lastActivity ? `${lastActivity.type} on ${new Date(lastActivity.created_at).toLocaleDateString()}` : 'No recent activity'}
- Days since last contact: ${daysSinceLastActivity || 'Unknown'}
- Total past activities: ${activityList.length}

${preferences.companyName ? `You are writing on behalf of: ${preferences.companyName}` : ''}

Reactivation tone for this contact: ${reactivationTone}
${reactivationTone === 'aggressive' ? '- Acknowledge longer gap, be more direct about wanting to reconnect' : ''}
${reactivationTone === 'warm' ? '- Warm, friendly tone, acknowledge time has passed' : ''}

Create a reactivation message that:
- References the time gap in a positive, non-guilt-inducing way
- Provides NEW value, updates, or insights (not repeat of previous messages)
- Asks about their current situation or priorities
- Suggests reconnecting for a fresh conversation
- Is warm, friendly, and easy to respond to
- Gives them an easy "out" if they're no longer interested
- Subject line should be fresh and not reference previous emails

Return ONLY valid JSON with "subject" and "body" fields.`;

    // If streaming requested, return streaming response
    if (isStreaming) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            let fullContent = '';

            for await (const chunk of createStreamingResponse({
              instructions: REACTIVATION_SYSTEM_PROMPT,
              input: userInput,
              model,
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
              subject: `Checking in, ${contactName}`,
              body: fullContent,
            });

            log.info('Reactivation email generated (streaming)', { contactId, daysSinceLastActivity, model });

            const completeData = JSON.stringify({ 
              type: 'complete', 
              data: {
                ...parsed,
                daysSinceLastActivity,
              }
            });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            log.error('Streaming reactivation failed', { contactId, error: error.message });
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
      instructions: REACTIVATION_SYSTEM_PROMPT,
      input: userInput,
      model,
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
      subject: `Checking in, ${contactName}`,
      body: fullContent,
    });

    log.info('Reactivation email generated', { contactId, daysSinceLastActivity, model });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        sent: true,
        daysSinceLastActivity,
        model,
      }),
    };
  } catch (error) {
    log.error('Reactivation generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Reactivation generation failed');
  }
});
