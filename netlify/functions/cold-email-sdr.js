const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createStreamingHandler, buildSdrSystemPrompt, parseJsonResponse, MODEL_CONFIG } = require('./_streamingUtils');
const { createStreamingResponse } = require('./_openaiClient');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const log = createLogger('cold-email-sdr');

// Main handler - supports both streaming and non-streaming
exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  // Check if streaming is requested
  const isStreaming = event.headers?.accept?.includes('text/event-stream') || 
                      event.queryStringParameters?.stream === 'true';

  // Parse body - handle both JSON and form-encoded
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

    const prefs = extractPreferences({ preferences });
    const sdrModel = resolveModel(prefs, 'gpt-5.2', 'SMARTCRM_MODEL');
    const temperature = resolveTemperature(prefs, 0.7);
    const maxTokens = resolveMaxTokens(prefs, 1000);
    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'your company';
    const title = contact.title || '';

    // Get GTM prompt for framework guidance
    const gtmPrompt = await getGTMPrompt('cold-email-sdr', contact.industry);
    const gtmBlock = gtmPrompt ? `${gtmPrompt}\n\n---\n\n` : '';

    // Build system prompt using the new builder
    const systemPrompt = buildSdrSystemPrompt({
      agentType: 'Cold Email SDR',
      persona: prefs.personaId || 'cold_saas_founder',
      contact,
      preferences: prefs,
    });

    // Build user input for Responses API
    const userInput = `${gtmBlock}Generate a personalized cold email for ${contactName}${title ? ` (${title})` : ''} at ${company}.

Contact details:
- Name: ${contactName}
- Company: ${company}
- Title: ${title}
- Email: ${contact.email || 'N/A'}
- Industry: ${contact.industry || 'Not specified'}
- Notes: ${contact.notes || 'None'}

Requirements:
- Attention-grabbing subject line (under 60 characters)
- Personalized opening referencing them or their company
- Clear value proposition
- Soft call-to-action (not pushy)
- Concise body (under 150 words)
- Human, conversational tone${buildPreferencesPromptBlock(prefs)}

Return ONLY valid JSON with "subject" and "body" fields. Example: {"subject": "Quick question about ${company}", "body": "Hi ${contactName}..."}`;

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
                // Send token with partial content for real-time display
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

            // Parse the complete response
            const parsed = parseJsonResponse(fullContent, {
              subject: `Quick question for ${contactName} at ${company}`,
              body: fullContent,
            });

            log.info('Cold email generated (streaming)', { contactId, model: sdrModel });

            // Send complete event with parsed data
            const completeData = JSON.stringify({ type: 'complete', data: parsed });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            log.error('Streaming cold email failed', { contactId, error: error.message });
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

    // Non-streaming response - collect all content
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
      subject: `Quick question for ${contactName} at ${company}`,
      body: fullContent,
    });

    log.info('Cold email generated', { contactId, gtmPromptUsed: !!gtmPrompt, model: sdrModel });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        sent: true,
        gtmPromptUsed: !!gtmPrompt,
        model: sdrModel,
      }),
    };
  } catch (error) {
    log.error('Cold email generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Cold email generation failed');
  }
});
