/**
 * Netlify Function: streaming CRM chat over the Responses API + Conversations API (replaces the `streaming-chat` edge function).
 *   POST { action:'start' }                              -> { conversationId }   (creates a server-side conversation owned by the caller)
 *   POST { message, conversationId, context?:{contactId} } -> SSE (status/delta/…, `result`, `done`) or JSON when not streaming
 * Result (both modes): { content, suggestions[], actions[], conversationId, metadata{responseType,generatedAt} } — the old streaming-chat contract.
 * Ownership: the owner's user id is written into the conversation metadata at creation and checked on every turn; a foreign or unknown
 * conversation id is a 404. A contact in `context` must belong to the caller (404 otherwise).
 */
const { stream } = require('@netlify/functions');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { runDual } = require('./_stream/dual');
const { createConversation, getClient, resolveModel } = require('./_responses');
const { underRateLimit, logUsage, withinTokenBudget } = require('./_aiProxy');
const { CONVERSATION_ID_RE } = require('./_conversations');
const { loadContact, describeContact, TaskError } = require('./_tasks/_ctx');

const MAX_MESSAGE = 8000;
const INSTRUCTIONS = 'You are SmartCRM\'s assistant for a solo seller. Answer concisely and practically about their contacts, deals, outreach and pipeline. '
  + 'Use only facts given in this conversation or the contact context; if you do not know something say so, and never invent data. '
  + 'You cannot take actions yourself (send, update, delete): when the user wants one, say what to do in the app.';

/** True when the conversation exists and was created for this user. */
async function defaultOwns(userId, conversationId) {
  try {
    const conv = await getClient().conversations.retrieve(conversationId);
    return !!conv && !!conv.metadata && conv.metadata.owner === userId && conv.metadata.kind === 'chat';
  } catch (_) {
    return false;
  }
}

/** Exported for tests: handler factory with injectable deps. */
function createHandler(deps = {}) {
  const dual = deps.runDual || runDual;
  return async function handle(event, user) {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }

    if (!(await (deps.underRateLimit || underRateLimit)(user.id))) return errorResponse(429, 'Too many AI requests. Please wait a moment.');

    if (body.action === 'start') {
      try {
        const { id } = await (deps.createConversation || createConversation)({ metadata: { owner: user.id, kind: 'chat' } });
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ conversationId: id }) };
      } catch (_) {
        return errorResponse(502, 'Could not start the chat');
      }
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return errorResponse(400, 'message is required');
    if (message.length > MAX_MESSAGE) return errorResponse(413, 'Message is too long');
    const conversationId = body.conversationId;
    if (typeof conversationId !== 'string' || !CONVERSATION_ID_RE.test(conversationId)) return errorResponse(400, 'conversationId is required (start a chat first)');
    if (!(await (deps.ownsConversation || defaultOwns)(user.id, conversationId))) return errorResponse(404, 'Conversation not found');

    const context = body.context && typeof body.context === 'object' ? body.context : {};
    let contact = null;
    if (context.contactId) {
      try { contact = await loadContact(user, { contactId: context.contactId }, { allowInline: false }); } catch (err) {
        if (err instanceof TaskError) return errorResponse(err.status, err.message);
        return errorResponse(500, 'Could not load the contact');
      }
    }

    const options = {
      role: 'default', effort: 'low',
      instructions: contact ? `${INSTRUCTIONS}\n\nContact the user is looking at:\n${describeContact(contact)}` : INSTRUCTIONS,
      input: message,
      conversationId,
      maxOutputTokens: 1500,
      store: true,
      user: user.id,
    };
    const budget = await (deps.withinTokenBudget || withinTokenBudget)({ ...options, model: options.role });
    if (!budget.ok) return errorResponse(413, `Input is too long (${budget.tokens} tokens).`);

    let usage = null;
    let status = 'ok';
    try {
      return await dual({
        event, body, options, deps: deps.responses, headers: CORS_HEADERS,
        finalize: async (text) => ({
          content: text, suggestions: [], actions: [], conversationId,
          metadata: { responseType: 'text', model: resolveModel(options.role).model, generatedAt: new Date().toISOString() },
        }),
        onEvent: (ev) => { if (ev.type === 'done') usage = ev.usage; if (ev.type === 'error') status = 'error'; },
        onEnd: () => (deps.logUsage || logUsage)(user.id, 'chat', { model: options.role }, usage, status),
      });
    } catch (_) {
      return errorResponse(502, 'The AI request failed');
    }
  };
}

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
