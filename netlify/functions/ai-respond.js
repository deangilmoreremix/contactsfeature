/**
 * Netlify Function: browser -> OpenAI Responses proxy (non-streaming).
 * POST { role|model, effort?, instructions?, input, schema?, schemaName?, tools?, maxOutputTokens?, previousResponseId?,
 *        conversationId? (conv_..., must belong to one of the caller's SDR threads) }
 * -> { id, text, json, citations, usage }
 * The API key stays on the server; models are restricted to the configured roles, tools to
 * web_search / file_search, and each user is rate limited.
 */
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createResponse } = require('./_responses');
const { buildOptions, underRateLimit, logUsage, withinTokenBudget, ownerMetadata, userOwnsResponse } = require('./_aiProxy');
const { userOwnsConversation } = require('./_conversations');

exports.handler = withAuth(async (event, user) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }

  const { options, error } = buildOptions(body);
  if (error) return errorResponse(400, error);
  if (options.conversationId && !(await userOwnsConversation(user.id, options.conversationId))) return errorResponse(404, 'Conversation not found');
  if (options.previousResponseId && !(await userOwnsResponse(user.id, options.previousResponseId))) return errorResponse(404, 'Previous response not found');
  if (!(await underRateLimit(user.id))) return errorResponse(429, 'Too many AI requests. Please wait a moment.');
  const budget = await withinTokenBudget(options);
  if (!budget.ok) return errorResponse(413, `Input is too long (${budget.tokens} tokens). Shorten it and try again.`);

  try {
    // stored responses carry their owner so a later previousResponseId can be verified (see userOwnsResponse)
    const r = await createResponse({ ...options, user: user.id, ...(options.store ? { metadata: ownerMetadata(user.id, 'ai_respond') } : {}) });
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
