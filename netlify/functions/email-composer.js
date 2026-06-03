const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createStreamingResponse, parseJsonResponse, MODEL_CONFIG } = require('./_streamingUtils');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('email-composer');

// Email type configurations
const EMAIL_TYPES = {
  introduction: {
    systemPrompt: `You are an expert B2B email copywriter specializing in cold outreach and introductions. Your emails are personalized, value-driven, and create genuine interest. You focus on the recipient's needs, not your product pitch.`,
    temperature: 0.7,
  },
  'follow-up': {
    systemPrompt: `You are an expert B2B email copywriter specializing in follow-up sequences. Your follow-ups acknowledge previous contact, provide new value, and create urgency without being pushy.`,
    temperature: 0.7,
  },
  proposal: {
    systemPrompt: `You are an expert B2B email copywriter specializing in proposals and offers. Your proposals are clear, compelling, and focus on ROI and value delivery.`,
    temperature: 0.5,
  },
  nurturing: {
    systemPrompt: `You are an expert B2B email copywriter specializing in nurture campaigns. Your emails provide ongoing value, educate the recipient, and maintain engagement over time.`,
    temperature: 0.6,
  },
  reengagement: {
    systemPrompt: `You are an expert B2B email copywriter specializing in win-back campaigns. Your reengagement emails acknowledge the gap, provide new value, and make it easy to reconnect.`,
    temperature: 0.7,
  },
  meeting_request: {
    systemPrompt: `You are an expert B2B email copywriter specializing in meeting requests. Your emails are concise, clear about the value of meeting, and make scheduling easy.`,
    temperature: 0.5,
  },
};

// Tone configurations
const TONE_CONFIG = {
  professional: 'Professional, polished, and business-appropriate. Formal but personable.',
  casual: 'Casual, relaxed, and conversational. Like a friendly colleague reaching out.',
  friendly: 'Warm, approachable, and personable. Building rapport through friendliness.',
  enthusiastic: 'Energetic, excited, and passionate. Showing genuine excitement about possibilities.',
  formal: 'Very professional, traditional business tone. Proper formatting and language.',
  direct: 'Concise, to-the-point, and action-oriented. No fluff, clear ask.',
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

  const {
    contact,
    type = 'introduction',
    context,
    tone = 'professional',
    length = 'medium',
    includeSignature = true,
    aiProvider = 'openai',
  } = body;

  if (!contact || !contact.id) {
    return errorResponse(400, 'Contact object with id is required');
  }

  const emailConfig = EMAIL_TYPES[type] || EMAIL_TYPES.introduction;
  const model = MODEL_CONFIG.default;

  try {
    // Fetch contact for full data
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contact.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contactData) return errorResponse(404, 'Contact not found');

    const contactName = contactData.firstname || contactData.name || 'there';
    const company = contactData.company || 'their company';

    // Build system prompt
    const systemPrompt = `${emailConfig.systemPrompt}

Current task: Generate a ${tone} ${type} email.
Tone guidance: ${TONE_CONFIG[tone] || TONE_CONFIG.professional}

Email length: ${length === 'short' ? 'Under 100 words' : length === 'long' ? '200-300 words' : '120-180 words'}`;

    // Build user input
    const userInput = `Generate a ${tone} ${type} email for this contact:

Contact Details:
- Name: ${contactName}
- Title: ${contactData.title || 'Not specified'}
- Company: ${company}
- Industry: ${contactData.industry || 'Not specified'}
- Email: ${contactData.email || 'N/A'}
- Notes: ${contactData.notes || 'None'}

Email Type: ${type}
Tone: ${tone}
Context: ${context || 'Standard business communication'}

Requirements:
- Compelling subject line (under 60 characters)
- Personalized greeting using their name
- Clear value proposition or purpose
- Specific, clear call-to-action
${includeSignature ? '- Professional sign-off' : ''}
- ${length === 'short' ? 'Very concise (under 100 words)' : length === 'long' ? 'Detailed (200-300 words)' : 'Moderate length (120-180 words)'}
- Natural, human-sounding (not templated)

Return ONLY valid JSON with "subject" and "body" fields. Example: {"subject": "Quick question about ${company}", "body": "Hi ${contactName},..."}`;

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
              model,
              temperature: emailConfig.temperature,
              maxTokens: 1500,
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
              subject: `Following up with ${company}`,
              body: fullContent,
            });

            // Store email template in database
            await supabase.from('email_templates').insert({
              contact_id: contact.id,
              user_id: user.id,
              email_type: type,
              subject: parsed.subject,
              body: parsed.body,
              tone,
              ai_provider: 'openai',
              created_at: new Date().toISOString(),
            });

            log.info('Email composed (streaming)', { contactId: contact.id, type, tone, model });

            const completeData = JSON.stringify({ 
              type: 'complete', 
              data: {
                ...parsed,
                tone,
                type,
                generated: new Date().toISOString(),
              }
            });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            log.error('Streaming email composition failed', { contactId: contact.id, error: error.message });
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
      model,
      temperature: emailConfig.temperature,
      maxTokens: 1500,
    })) {
      if (chunk.type === 'token') {
        fullContent += chunk.token;
      } else if (chunk.type === 'complete') {
        fullContent = chunk.content;
      }
    }

    const parsed = parseJsonResponse(fullContent, {
      subject: `Following up with ${company}`,
      body: fullContent,
    });

    // Store email template in database
    await supabase.from('email_templates').insert({
      contact_id: contact.id,
      user_id: user.id,
      email_type: type,
      subject: parsed.subject,
      body: parsed.body,
      tone,
      ai_provider: 'openai',
      created_at: new Date().toISOString(),
    });

    log.info('Email composed', { contactId: contact.id, type, tone, model });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: {
          subject: parsed.subject,
          body: parsed.body,
          tone,
          type,
          generated: new Date().toISOString(),
        },
        provider: aiProvider,
        model,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    log.error('Email composition failed', { contactId: contact?.id, error: error.message });
    return errorResponse(500, 'Email composition failed');
  }
});
