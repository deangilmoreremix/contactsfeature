/**
 * Shared request handling for the browser-facing AI proxy (ai-respond, ai-stream).
 * The browser never sees OPENAI_API_KEY and cannot pick arbitrary models or tools.
 */
const { supabase } = require('./_supabaseClient');
const { normalizeModel } = require('./_validation');

const MAX_INPUT_CHARS = 120000;
const MAX_OUTPUT_TOKENS = 8000;
const MAX_PER_MINUTE = Number(process.env.AI_PROXY_MAX_PER_MINUTE || 30);
const ALLOWED_TOOL_TYPES = new Set(['web_search', 'file_search']);
const { CONVERSATION_ID_RE } = require('./_conversations');
const ALLOWED_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high']);

/** Validate + sanitise the browser payload into createResponse()/streamResponse() options. */
function buildOptions(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid JSON body' };

  const { input, instructions } = body;
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input ?? '');
  if (!input || !inputStr.trim()) return { error: '"input" is required' };
  if (inputStr.length + String(instructions || '').length > MAX_INPUT_CHARS) return { error: 'Input is too large' };

  const modelOrRole = normalizeModel(body.model) || normalizeModel(body.role) || 'default';
  const effort = ALLOWED_EFFORTS.has(body.effort) ? body.effort : undefined;

  const tools = [];
  for (const t of Array.isArray(body.tools) ? body.tools : []) {
    if (t && ALLOWED_TOOL_TYPES.has(t.type)) {
      // pass through only documented, non-secret options
      const safe = { type: t.type };
      if (t.type === 'web_search') {
        if (['low', 'medium', 'high'].includes(t.search_context_size)) safe.search_context_size = t.search_context_size;
        if (t.user_location && typeof t.user_location === 'object') safe.user_location = t.user_location;
        if (t.filters && Array.isArray(t.filters.allowed_domains)) safe.filters = { allowed_domains: t.filters.allowed_domains.slice(0, 20).map(String) };
      }
      tools.push(safe);
    } else if (t) {
      return { error: `Tool type not allowed from the browser: ${String(t.type)}` };
    }
  }

  const conversationId = typeof body.conversationId === 'string' && CONVERSATION_ID_RE.test(body.conversationId) ? body.conversationId : undefined;
  if (body.conversationId !== undefined && body.conversationId !== null && !conversationId) {
    return { error: '"conversationId" must be a conversation id starting with conv_' };
  }

  return {
    options: {
      model: modelOrRole,
      effort,
      instructions: instructions ? String(instructions) : undefined,
      input,
      schema: body.schema && typeof body.schema === 'object' ? body.schema : undefined,
      schemaName: body.schemaName ? String(body.schemaName) : undefined,
      tools: tools.length ? tools : undefined,
      toolChoice: tools.length && body.toolChoice === 'required' ? 'required' : undefined,
      maxOutputTokens: Math.min(Number(body.maxOutputTokens) || 2000, MAX_OUTPUT_TOKENS),
      // A server-side conversation wins over previous_response_id (the API rejects both together).
      conversationId,
      previousResponseId: !conversationId && typeof body.previousResponseId === 'string' ? body.previousResponseId : undefined,
      store: conversationId || body.previousResponseId || body.store === true ? true : false,
    },
  };
}

/** Per-user per-minute limit backed by ai_usage_log. Returns true when the call may proceed. */
async function underRateLimit(userId) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabase
    .from('ai_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if (error) return true; // never block on a logging outage
  return (count || 0) < MAX_PER_MINUTE;
}

/** Per-user per-minute limit for one endpoint (e.g. realtime-token), same ai_usage_log table. */
async function underEndpointLimit(userId, endpoint, max, windowMs = 60_000) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from('ai_usage_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', since);
  if (error) return true;
  return (count || 0) < max;
}

async function logUsage(userId, endpoint, options, usage, status = 'ok') {
  try {
    await supabase.from('ai_usage_log').insert({
      user_id: userId,
      endpoint,
      role: typeof options.model === 'string' ? options.model : null,
      model: null,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
      status,
    });
  } catch (_) { /* best effort */ }
}

const MAX_INPUT_TOKENS = Number(process.env.AI_PROXY_MAX_INPUT_TOKENS || 100000);
const TOKEN_CHECK_CHARS = 20000; // only large inputs pay for a token-count round trip

/**
 * Exact input-token guard (POST /v1/responses/input_tokens) for large prompts.
 * Returns { ok:true } or { ok:false, tokens }. Fails open if the count call itself errors.
 */
async function withinTokenBudget(options, deps = {}) {
  const size = JSON.stringify(options.input ?? '').length + String(options.instructions || '').length;
  if (size < TOKEN_CHECK_CHARS) return { ok: true };
  try {
    const count = deps.countInputTokens || require('./_responses').countInputTokens;
    const tokens = await count({ role: options.model, input: options.input, instructions: options.instructions });
    return tokens > MAX_INPUT_TOKENS ? { ok: false, tokens } : { ok: true, tokens };
  } catch (_) {
    return { ok: true };
  }
}

const RESPONSE_ID_RE = /^resp_[A-Za-z0-9_-]{8,}$/;

/** Metadata stamped on every STORED proxy response so `previousResponseId` can later be tied back to its owner. */
function ownerMetadata(userId, purpose) {
  return { user_id: userId, purpose };
}

/**
 * True only when `responseId` is a response THIS user created through the proxy (metadata.user_id matches).
 * The proxy uses one shared OpenAI key, so without this check a caller who knew another user's response id could continue
 * that user's stored context. Unknown, malformed, foreign or unretrievable ids are all "not owned".
 */
async function userOwnsResponse(userId, responseId, deps = {}) {
  if (typeof responseId !== 'string' || !RESPONSE_ID_RE.test(responseId)) return false;
  try {
    const retrieve = deps.retrieveResponse || require('./_responses').retrieveResponse;
    const run = await retrieve(responseId);
    return !!(run && run.metadata && run.metadata.user_id === userId);
  } catch (_) {
    return false;
  }
}

module.exports = { withinTokenBudget, MAX_INPUT_TOKENS, buildOptions, underRateLimit, underEndpointLimit, logUsage, MAX_PER_MINUTE, CONVERSATION_ID_RE, ownerMetadata, userOwnsResponse };
