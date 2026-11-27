const { supabase } = require('./_supabaseClient');
const { withAuth, errorResponse } = require('./_auth');
const { parseJsonResponse, MODEL_CONFIG } = require('./_streamingUtils');
const { runDual } = require('./_stream/dual');
const { sdrOptions, EMAIL_DRAFT_SCHEMA } = require('./_stream/helpers');
const { stream } = require('@netlify/functions');
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

    return await runDual({
      event,
      body,
      options: sdrOptions({
        instructions: systemPrompt,
        input: userInput,
        model,
        temperature: emailConfig.temperature,
        maxTokens: 1500,
        schema: EMAIL_DRAFT_SCHEMA,
        schemaName: 'email_composer',
      }),
      // Template row is written here (after the model finished), exactly once per request.
      finalize: async (text) => {
        const parsed = parseJsonResponse(text, {
          subject: `Following up with ${company}`,
          body: text,
        });

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
        };
      },
    });
  } catch (error) {
    log.error('Email composition failed', { contactId: contact?.id, error: error.message });
    return errorResponse(500, 'Email composition failed');
  }
}));
