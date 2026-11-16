const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { buildSdrSystemPrompt, parseJsonResponse } = require('./_streamingUtils');
const { createStreamingResponse } = require('./_openaiClient');
const { createLogger, generateCorrelationId } = require('./_logger');
const { resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const log = createLogger('objection-handler-sdr');

// Objection handling prompts
const OBJECTION_SYSTEM_PROMPT = `You are SmartCRM's expert objection handler, powered by GPT-5.2.

Your role: Handle prospect objections with empathy, professionalism, and strategic responses.

Guidelines:
- Acknowledge the objection with empathy first
- Never argue or be defensive
- Reframe the objection as an opportunity
- Provide evidence or alternatives
- Include a clear, low-friction next step
- Keep responses concise but thorough
- Use a helpful, consultative tone`;

const OBJECTION_TYPES = {
  price: 'Price/Budget objection - acknowledge concern, present ROI, offer alternatives',
  timing: 'Timing objection - acknowledge timing, create light urgency, offer flexibility',
  competition: 'Competition objection - acknowledge competitor, highlight unique strengths',
  no_authority: 'No authority/need to check with others - offer to provide materials, suggest next steps',
  not_interested: 'Not interested - ask questions to understand concerns, offer value first',
  default: 'General objection - acknowledge, empathize, and redirect to value',
};

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

  const { contactId, objection, preferences = {} } = body;

  if (!contactId) {
    return errorResponse(400, 'Contact ID is required');
  }

  if (!objection || objection.trim().length === 0) {
    return errorResponse(400, 'Objection text is required');
  }

  const model = resolveModel({ model: preferences.model }, 'gpt-5.2-thinking', 'SMARTCRM_THINKING_MODEL');
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

    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'their company';
    const activityList = activities || [];

    // Categorize the objection
    const objectionLower = objection.toLowerCase();
    let objectionType = 'default';
    if (objectionLower.includes('price') || objectionLower.includes('cost') || objectionLower.includes('budget') || objectionLower.includes('expensive')) {
      objectionType = 'price';
    } else if (objectionLower.includes('timing') || objectionLower.includes('later') || objectionLower.includes('busy') || objectionLower.includes('when')) {
      objectionType = 'timing';
    } else if (objectionLower.includes('competitor') || objectionLower.includes('other') || objectionLower.includes('using')) {
      objectionType = 'competition';
    } else if (objectionLower.includes('check') || objectionLower.includes('team') || objectionLower.includes('authority') || objectionLower.includes('boss')) {
      objectionType = 'no_authority';
    } else if (objectionLower.includes('not interested') || objectionLower.includes('dont') || objectionLower.includes("don't") || objectionLower.includes('no thanks')) {
      objectionType = 'not_interested';
    }

    // Build user input
    const userInput = `Handle this objection from ${contactName} at ${company}:

Objection: "${objection}"
Objection Type: ${objectionType} - ${OBJECTION_TYPES[objectionType]}

Contact Details:
- Name: ${contactName}
- Title: ${contact.title || 'Not specified'}
- Company: ${company}
- Industry: ${contact.industry || 'Not specified'}
- Email: ${contact.email || 'N/A'}

Recent Activities: ${activityList.length > 0 ? activityList.slice(0, 3).map(a => `${a.type} on ${new Date(a.created_at).toLocaleDateString()}`).join(', ') : 'No recent activities'}

${preferences.companyName ? `You are writing on behalf of: ${preferences.companyName}` : ''}

Create a response that:
- Acknowledges the objection with genuine empathy
- Addresses the specific concern with evidence or alternatives
- Reframes the objection positively
- Includes a clear, easy next step
- Maintains a helpful, non-defensive tone

Return ONLY valid JSON with "subject" and "body" fields. Example: {"subject": "Re: Your concern about pricing", "body": "Hi ${contactName}, I completely understand..."}`;

    // If streaming requested, return streaming response
    if (isStreaming) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            let fullContent = '';

            for await (const chunk of createStreamingResponse({
              instructions: OBJECTION_SYSTEM_PROMPT,
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
              subject: `Re: Handling your concern`,
              body: fullContent,
            });

            log.info('Objection response generated (streaming)', { contactId, objectionType, model });

            const completeData = JSON.stringify({ 
              type: 'complete', 
              data: {
                ...parsed,
                objectionType,
              }
            });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            log.error('Streaming objection handler failed', { contactId, error: error.message });
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
      instructions: OBJECTION_SYSTEM_PROMPT,
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
      subject: `Re: Handling your concern`,
      body: fullContent,
    });

    log.info('Objection response generated', { contactId, objectionType, model });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        sent: true,
        objection,
        objectionType,
        model,
      }),
    };
  } catch (error) {
    log.error('Objection handling failed', { contactId, error: error.message });
    return errorResponse(500, 'Objection handling failed');
  }
});
