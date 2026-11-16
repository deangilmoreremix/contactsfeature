/**
 * Netlify Function: browser -> OpenAI Responses proxy with Server-Sent Events.
 * Same payload as ai-respond; emits `data: {"type":"delta","text":"…"}` events, then
 * `{"type":"done","id","text","citations"}` and `[DONE]`. Uses Netlify's stream() wrapper so tokens
 * are flushed as they arrive.
 */
const { stream } = require('@netlify/functions');
const { Readable } = require('stream');
const { authenticateRequest, CORS_HEADERS } = require('./_auth');
const { streamResponse } = require('./_responses');
const { buildOptions, underRateLimit, logUsage, withinTokenBudget } = require('./_aiProxy');
const { userOwnsConversation } = require('./_conversations');

const SSE_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
};

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

  async function* events() {
    let usage = null;
    let status = 'ok';
    try {
      for await (const ev of streamResponse({ ...options, user: user.id })) {
        if (ev.type === 'done') usage = ev.usage;
        if (ev.type === 'error') status = 'error';
        yield `data: ${JSON.stringify(ev)}\n\n`;
      }
    } catch (err) {
      status = 'error';
      yield `data: ${JSON.stringify({ type: 'error', message: 'AI request failed' })}\n\n`;
    }
    await logUsage(user.id, 'ai-stream', options, usage, status);
    yield 'data: [DONE]\n\n';
  }

  return { statusCode: 200, headers: SSE_HEADERS, body: Readable.from(events()) };
});
