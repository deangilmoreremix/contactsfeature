const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { buildSdrSystemPrompt, parseJsonResponse } = require('./_streamingUtils');
const { createStreamingResponse } = require('./_openaiClient');
const { createLogger, generateCorrelationId } = require('./_logger');
const { resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const log = createLogger('discovery-sdr');

// Discovery agent system prompt
const DISCOVERY_SYSTEM_PROMPT = `You are SmartCRM's expert discovery SDR agent, powered by GPT-5.2.

Your role: Help qualify leads and understand their needs through strategic questioning.

Guidelines:
- Ask open-ended questions that reveal pain points and needs
- Show genuine interest in their business challenges
- Build rapport through relevant industry insights
- Focus on understanding, not selling
- Ask probing questions about their current situation
- Explore goals, challenges, and timeline
- Never be pushy or aggressive

Discovery Focus Areas:
1. Business Challenges - What problems are they trying to solve?
2. Current Solutions - What are they using now? What's working/not working?
3. Decision Process - Who else is involved? What's the timeline?
4. Goals & Success - What would success look like?
5. Budget & Authority - Do they have budget? Who approves?`;

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
  const maxTokens = resolveMaxTokens({ maxTokens: preferences.maxTokens }, 1200);

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

    // Fetch any deals
    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(3);

    const contactName = contact.firstname || contact.name || 'there';
    const company = contact.company || 'their company';
    const activityList = activities || [];
    const dealList = deals || [];

    // Build user input
    const userInput = `Generate discovery questions and a discovery message for ${contactName} at ${company}.

Contact Details:
- Name: ${contactName}
- Title: ${contact.title || 'Not specified'}
- Company: ${company}
- Industry: ${contact.industry || 'Not specified'}
- Email: ${contact.email || 'N/A'}
- Status: ${contact.status || 'new'}
- Interest Level: ${contact.interestLevel || 'Not specified'}

Recent Activities: ${activityList.length > 0 ? activityList.slice(0, 3).map(a => `${a.type} on ${new Date(a.created_at).toLocaleDateString()}`).join(', ') : 'No recent activities'}

Deal History: ${dealList.length > 0 ? dealList.map(d => `${d.name} (${d.stage || d.status})`).join(', ') : 'No active deals'}

${preferences.companyName ? `You are writing on behalf of: ${preferences.companyName}` : ''}

Create a discovery message that:
- Opens with a personalized hook relevant to their role/industry
- Asks 3-5 thoughtful discovery questions about their business challenges
- Shows understanding of their situation
- Builds rapport and establishes credibility
- Creates curiosity about potential solutions
- Soft, consultative tone (not salesy)
- Include specific questions about: current solutions, pain points, goals, timeline

Return ONLY valid JSON with:
- "subject": Email subject line (curiosity-driven)
- "body": Discovery email with questions
- "discoveryQuestions": Array of 3-5 key questions to ask`;

    // If streaming requested, return streaming response
    if (isStreaming) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            let fullContent = '';

            for await (const chunk of createStreamingResponse({
              instructions: DISCOVERY_SYSTEM_PROMPT,
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
              subject: `Quick question about ${company}`,
              body: fullContent,
              discoveryQuestions: [],
            });

            log.info('Discovery questions generated (streaming)', { contactId, model });

            const completeData = JSON.stringify({ type: 'complete', data: parsed });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            log.error('Streaming discovery failed', { contactId, error: error.message });
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
      instructions: DISCOVERY_SYSTEM_PROMPT,
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
      subject: `Quick question about ${company}`,
      body: fullContent,
      discoveryQuestions: [],
    });

    log.info('Discovery questions generated', { contactId, model });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        contactId,
        subject: parsed.subject,
        body: parsed.body,
        discoveryQuestions: parsed.discoveryQuestions || [],
        sent: true,
        model,
      }),
    };
  } catch (error) {
    log.error('Discovery generation failed', { contactId, error: error.message });
    return errorResponse(500, 'Discovery generation failed');
  }
});
