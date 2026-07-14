const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createResponse, MODEL_CONFIG } = require('./_openaiClient');
const { parseJsonResponse } = require('./_streamingUtils');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('openai-contact-analysis');

// Safe fallbacks so the UI never breaks if OpenAI is unreachable.
const FALLBACK = {
  score: 50,
  insights: ['Analysis currently unavailable'],
  recommendations: ['Try again later'],
  riskFactors: ['Analysis incomplete'],
  opportunities: [],
};

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

  const { contact, analysisType = 'full' } = body;
  if (!contact) return errorResponse(400, 'Contact object is required');

  // Deep reasoning model for analysis per ai.ts routing.
  const model = MODEL_CONFIG.thinking;
  const isResearch = analysisType === 'research';

  const systemPrompt = `You are SmartCRM's AI contact analyst powered by GPT-5.2.
${isResearch
    ? 'You are researching a contact from limited information (e.g. an email address). Infer a plausible company, role, and enrichment, and clearly mark confidence.'
    : 'You analyze a contact record and output a fit/engagement score plus structured insights.'}

Always return ONLY valid JSON. Use exactly this shape:
{
  "score": <number 0-100>,
  "insights": [<string>],
  "recommendations": [<string>],
  "riskFactors": [<string>],
  "opportunities": [<string>]
}`;

  const userInput = `Analyze this contact and return JSON only:
${JSON.stringify(contact, null, 2)}`;

  try {
    const content = await createResponse({
      instructions: systemPrompt,
      input: userInput,
      model,
      temperature: 0.4,
      maxTokens: 1200,
    });

    const parsed = parseJsonResponse(content, FALLBACK);
    const result = {
      score: typeof parsed.score === 'number' ? parsed.score : FALLBACK.score,
      insights: Array.isArray(parsed.insights) ? parsed.insights : FALLBACK.insights,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : FALLBACK.recommendations,
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : FALLBACK.riskFactors,
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : FALLBACK.opportunities,
      provider: 'openai',
      model,
      timestamp: new Date().toISOString(),
    };

    log.info('Contact analysis completed', {
      contact: contact.email || contact.name,
      analysisType,
      score: result.score,
      model,
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result),
    };
  } catch (error) {
    log.error('Contact analysis failed', {
      contact: contact.email || contact.name,
      error: error.message,
    });
    return errorResponse(500, 'Contact analysis failed');
  }
});
