/**
 * Netlify Function: browser -> OpenAI Responses proxy (non-streaming).
 * POST { role|model, effort?, instructions?, input, schema?, schemaName?, tools?, maxOutputTokens?, previousResponseId? }
 * -> { id, text, json, citations, usage }
 * The API key stays on the server; models are restricted to the configured roles, tools to
 * web_search / file_search, and each user is rate limited.
 */
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createResponse } = require('./_responses');
const { buildOptions, underRateLimit, logUsage } = require('./_aiProxy');

exports.handler = withAuth(async (event, user) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }

  const { options, error } = buildOptions(body);
  if (error) return errorResponse(400, error);
  if (!(await underRateLimit(user.id))) return errorResponse(429, 'Too many AI requests. Please wait a moment.');

  try {
    const r = await createResponse({ ...options, user: user.id });
    await logUsage(user.id, 'ai-respond', options, r.usage);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ id: r.id, status: r.status, text: r.text, json: r.json, citations: r.citations, usage: r.usage }),
    };
  } catch (err) {
    await logUsage(user.id, 'ai-respond', options, null, 'error');
    const status = err && err.status === 429 ? 429 : 502;
    return errorResponse(status, status === 429 ? 'AI provider is busy, try again shortly' : 'AI request failed');
  }
});
