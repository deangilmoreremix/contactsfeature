/**
 * Shared factory for the panel endpoints (memory-get, skills-api, mood-preview, playbooks-ai, deal-heatmap,
 * video-agent, voice-agent). Same contract as ai-task / the other dual-mode functions:
 *   POST JSON            -> the payload as plain JSON
 *   Accept: text/event-stream | body.stream:true | ?stream=true
 *                        -> SSE (status/delta/partial ..., `result` = the same payload, `done`)
 * Every loader reads ONLY the caller's rows (user_id filter, 404 otherwise); outbound copy is moderated; the same
 * rate limit / token budget / ai_usage_log helpers as ai-task are used.
 *
 * spec: {
 *   endpoint,                                   // log + rate-limit label
 *   parse(body, user) -> params                 // validate input, throw TaskError(400)
 *   action?(params, user, deps) -> payload|null // non-AI sub-action (e.g. list skills); handled before any model call
 *   load({ user, params, deps }) -> ctx | { shortCircuit: payload }
 *   build(ctx, params) -> { role, effort, instructions, input, schema?, schemaName, tools?, maxOutputTokens? }
 *   finalize({ parsed, text, citations, ctx, params }) -> payload   // parsed = JSON when schema, else null
 *   outboundText?(payload) -> string[]          // moderated before the payload leaves
 *   afterModeration?({ payload, ctx, params, deps }) -> payload   // e.g. text-to-speech
 * }
 */
const { CORS_HEADERS, errorResponse } = require('../_auth');
const { runDual, isStreamRequested } = require('../_stream/dual');
const { SSE_HEADERS, toSseReadable } = require('../_stream/sse');
const { resolveModel } = require('../_responses');
const { underRateLimit, logUsage, withinTokenBudget } = require('../_aiProxy');
const { TaskError } = require('../_tasks/_ctx');
const { checkOutbound, flaggedResponse } = require('../_moderation');

/** A result that needs no model call, delivered in whichever mode the client asked for. */
function immediate(event, body, payload) {
  if (!isStreamRequested(event, body)) return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(payload) };
  async function* events() {
    yield { type: 'result', data: payload };
    yield { type: 'done', id: null, text: '', usage: null, citations: [], json: payload };
  }
  return { statusCode: 200, headers: { ...CORS_HEADERS, ...SSE_HEADERS }, body: toSseReadable(events(), { heartbeatMs: 0 }) };
}

function createPanelHandler(spec) {
  return function createHandler(deps = {}) {
    const dual = deps.runDual || runDual;
    return async function handle(event, user) {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return errorResponse(400, 'Invalid JSON body');

      let params;
      try { params = spec.parse(body, user); } catch (err) {
        if (err instanceof TaskError) return errorResponse(err.status, err.message);
        return errorResponse(400, 'Invalid request');
      }

      try {
        if (spec.action) {
          const out = await spec.action(params, user, deps);
          if (out) return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(out) };
        }
      } catch (err) {
        if (err instanceof TaskError) return errorResponse(err.status, err.message);
        return errorResponse(500, 'Request failed');
      }

      if (!(await (deps.underRateLimit || underRateLimit)(user.id))) return errorResponse(429, 'Too many AI requests. Please wait a moment.');

      let ctx;
      try {
        ctx = await spec.load({ user, params, deps });
      } catch (err) {
        if (err instanceof TaskError) return errorResponse(err.status, err.message);
        return errorResponse(500, 'Could not load the data for this request');
      }
      if (ctx && ctx.shortCircuit) return immediate(event, body, ctx.shortCircuit);

      const req = spec.build(ctx, params);
      const options = {
        role: req.role || 'default',
        effort: req.effort || 'low',
        instructions: req.instructions,
        input: req.input,
        schema: req.schema,
        schemaName: String(req.schemaName || spec.endpoint).replace(/[^a-zA-Z0-9_-]/g, '_'),
        tools: req.tools,
        toolChoice: undefined,
        maxOutputTokens: req.maxOutputTokens || 3000,
        store: false,
        user: user.id,
      };
      const budget = await (deps.withinTokenBudget || withinTokenBudget)({ ...options, model: options.role });
      if (!budget.ok) return errorResponse(413, `Input is too long (${budget.tokens} tokens).`);

      let usage = null;
      let status = 'ok';
      try {
        return await dual({
          event, body, options, deps: deps.responses, headers: CORS_HEADERS,
          finalize: async (text, meta) => {
            let parsed = null;
            if (options.schema) {
              try { parsed = JSON.parse(text); } catch { throw new Error('The AI did not return a valid result'); }
            }
            const citations = (meta && meta.citations) || [];
            let payload = await spec.finalize({ parsed, text: String(text || '').trim(), citations, ctx, params });
            if (spec.outboundText) {
              const verdict = await (deps.checkOutbound || checkOutbound)({ texts: spec.outboundText(payload), userId: user.id, endpoint: spec.endpoint });
              if (!verdict.ok) {
                const e = new Error(`Blocked by content moderation: ${verdict.categories.join(', ')}`);
                e.code = 'CONTENT_FLAGGED';
                e.categories = verdict.categories;
                throw e;
              }
            }
            if (spec.afterModeration) payload = await spec.afterModeration({ payload, ctx, params, deps });
            return payload;
          },
          onEvent: (ev) => { if (ev.type === 'done') usage = ev.usage; if (ev.type === 'error') status = 'error'; },
          onEnd: () => (deps.logUsage || logUsage)(user.id, spec.endpoint, { model: options.role }, usage, status),
        });
      } catch (err) {
        if (err && err.code === 'CONTENT_FLAGGED') return flaggedResponse(err.categories || [], CORS_HEADERS);
        return errorResponse(502, 'The AI request failed');
      }
    };
  };
}

module.exports = { createPanelHandler, immediate, resolveModel };
