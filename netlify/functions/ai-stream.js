/**
 * Netlify Function: browser -> OpenAI Responses proxy with Server-Sent Events.
 * Same payload as ai-respond; emits `data: {"type":"delta","text":"…"}` events, then
 * `{"type":"done","id","text","citations"}` and `[DONE]`. Uses Netlify's stream() wrapper so tokens
 * are flushed as they arrive.
 */
const { stream } = require('@netlify/functions');
const { authenticateRequest, CORS_HEADERS } = require('./_auth');
const { streamResponse, retrieveResponse } = require('./_responses');
const { buildOptions, underRateLimit, logUsage, withinTokenBudget } = require('./_aiProxy');
const { userOwnsConversation } = require('./_conversations');

const { SSE_HEADERS: BASE_SSE, toSseReadable } = require('./_stream/sse');
const SSE_HEADERS = { ...CORS_HEADERS, ...BASE_SSE };

function plain(statusCode, message) {
  return { statusCode, headers: { ...CORS_HEADERS }, body: JSON.stringify({ error: message }) };
}

exports.handler = stream(async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return plain(405, 'Method not allowed');

  const { user, error: authError } = await authenticateRequest(event);
  if (authError) return plain(authError.statusCode, 'Unauthorized');

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return plain(400, 'Invalid JSON body'); }
  const { options, error } = buildOptions(body);
  if (error) return plain(400, error);
  if (options.conversationId && !(await userOwnsConversation(user.id, options.conversationId))) return plain(404, 'Conversation not found');
  if (!(await underRateLimit(user.id))) return plain(429, 'Too many AI requests. Please wait a moment.');
  const budget = await withinTokenBudget(options);
  if (!budget.ok) return plain(413, `Input is too long (${budget.tokens} tokens). Shorten it and try again.`);

  const wantsBackground = body.background === true;
  const streamOpts = {
    ...options,
    user: user.id,
    reasoningSummary: body.reasoningSummary === true,
    ...(wantsBackground ? { background: true, metadata: { user_id: user.id, purpose: 'ai_stream' } } : {}),
  };

  // Resume an earlier background stream (ownership verified through the response metadata).
  if (body.resume && typeof body.resume.responseId === 'string') {
    if (!/^resp_[A-Za-z0-9]+$/.test(body.resume.responseId)) return plain(400, 'Invalid responseId');
    try {
      const run = await retrieveResponse(body.resume.responseId);
      if (!run.metadata || run.metadata.user_id !== user.id) return plain(404, 'Run not found');
    } catch (_) {
      return plain(404, 'Run not found');
    }
    streamOpts.resume = { responseId: body.resume.responseId, startingAfter: Number.isInteger(body.resume.startingAfter) ? body.resume.startingAfter : undefined };
  }

  let usage = null;
  let status = 'ok';
  const events = streamResponse(streamOpts);
  const readable = toSseReadable(events, {
    onEvent: (ev) => { if (ev.type === 'done') usage = ev.usage; if (ev.type === 'error') status = 'error'; },
    onEnd: () => logUsage(user.id, 'ai-stream', options, usage, status),
  });
  return { statusCode: 200, headers: SSE_HEADERS, body: readable };
});
