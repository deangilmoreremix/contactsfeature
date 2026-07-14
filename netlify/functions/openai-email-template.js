const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createResponse, MODEL_CONFIG } = require('./_openaiClient');
const { parseJsonResponse } = require('./_streamingUtils');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('openai-email-template');

const fallback = (contact, purpose) => ({
  subject: `Following up on ${purpose} - ${contact?.company || 'your company'}`,
  body: `Hi ${contact?.firstName || contact?.name?.split(' ')[0] || 'there'},\n\nI hope this email finds you well. I wanted to follow up on our recent conversation regarding ${purpose}.`,
});

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

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

  const { contact, purpose, templateType = 'professional' } = body;
  if (!contact) return errorResponse(400, 'Contact object is required');
  if (!purpose) return errorResponse(400, 'Purpose is required');

  const model = MODEL_CONFIG.default;

  const systemPrompt = `You are an expert B2B email copywriter powered by GPT-5.2.
Generate a ${templateType} follow-up email.
Return ONLY valid JSON with "subject" and "body" fields.
The subject must be under 60 characters. The body must be personalized, concise (under 150 words), and include a clear soft call-to-action.`;

  const userInput = `Generate an email template.
Contact: ${JSON.stringify({
    name: contact.name,
    firstName: contact.firstName,
    company: contact.company,
    title: contact.title,
    industry: contact.industry,
    email: contact.email,
  })}
Purpose: ${purpose}
Tone: ${templateType}`;

  try {
    const content = await createResponse({
      instructions: systemPrompt,
      input: userInput,
      model,
      temperature: 0.7,
      maxTokens: 800,
    });

    const parsed = parseJsonResponse(content, fallback(contact, purpose));
    const result = {
      subject: parsed.subject || fallback(contact, purpose).subject,
      body: parsed.body || fallback(contact, purpose).body,
      provider: 'openai',
      model,
      timestamp: new Date().toISOString(),
    };

    log.info('Email template generated', {
      contact: contact.email || contact.name,
      purpose,
      model,
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result),
    };
  } catch (error) {
    log.error('Email template generation failed', {
      contact: contact.email || contact.name,
      error: error.message,
    });
    return errorResponse(500, 'Email template generation failed');
  }
});
