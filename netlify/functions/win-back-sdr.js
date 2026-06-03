const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { buildSdrSystemPrompt, parseJsonResponse } = require('./_streamingUtils');
const { createStreamingResponse } = require('./_openaiClient');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const log = createLogger('win-back-sdr');

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

  const { contactId, preferences = {} } = body;

  if (!contactId) {
    return errorResponse(400, 'Contact ID is required');
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
      .limit(20);

    // Fetch deals
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

    // Get GTM prompt
    const gtmPrompt = await getGTMPrompt('win-back-sdr', contact.industry);
    const gtmBlock = gtmPrompt ? `${gtmPrompt}\n\n---\n\n` : '';

    // Build system prompt
    const systemPrompt = buildSdrSystemPrompt({
      agentType: 'Win-Back SDR',
      persona: 'churn_winback',
      contact,
      preferences: prefs,
    });

    // Build user input for Responses API
    const userInput = `${gtmBlock}You are creating a win-back campaign email for a churned or lost customer.

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
3. Write a compelling win-back email${buildPreferencesPromptBlock(prefs)}

Return ONLY valid JSON with these fields:
- "subject": Email subject line
- "body": Full email body
- "churnReason": Your analysis of why they churned (1-2 sentences)
- "winBackOffer": The specific offer you're making

Email requirements:
- Acknowledge the past relationship warmly
- Show you understand their potential concerns
- Present a compelling reason to return
- Include a special offer or incentive
- Have a clear, low-friction call to action
- Warm, empathetic tone`;

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
              subject: `We'd love to have you back, ${contactName}`,
              body: fullContent,
              churnReason: 'Analysis unavailable',
              winBackOffer: 'Contact us for a special returning customer offer',
            });

            log.info('Win-back email generated (streaming)', { contactId, model: sdrModel });

            const completeData = JSON.stringify({ type: 'complete', data: parsed });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            log.error('Streaming win-back failed', { contactId, error: error.message });
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
      subject: `We'd love to have you back, ${contactName}`,
      body: fullContent,
      churnReason: 'Analysis unavailable',
      winBackOffer: 'Contact us for a special returning customer offer',
    });

    log.info('Win-back email generated', { contactId, gtmPromptUsed: !!gtmPrompt, model: sdrModel });

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
        gtmPromptUsed: !!gtmPrompt,
        model: sdrModel,
      }),
    };
  } catch (error) {
    log.error('Win-back email generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Win-back email generation failed');
  }
});
