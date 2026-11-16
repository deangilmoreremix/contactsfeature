/**
 * Netlify Function: streaming AI task gateway.
 * POST { task, params, stream? } -> JSON `{ success, data, task, model }`, or (Accept: text/event-stream | stream:true)
 * a live SSE stream (status/delta/partial…, then `result` = the same JSON, then `done`).
 * Tasks live in ./_tasks (registry). Context is always loaded for the CALLER only; outbound copy is moderated.
 */
const { stream } = require('@netlify/functions');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { runDual } = require('./_stream/dual');
const { resolveModel } = require('./_responses');
const { underRateLimit, logUsage, withinTokenBudget } = require('./_aiProxy');
const { getTask } = require('./_tasks');
const { TaskError } = require('./_tasks/_ctx');
const { checkOutbound, flaggedResponse } = require('./_moderation');

function jsonError(status, message) {
  return errorResponse(status, message);
}

/** Exported for tests: handler factory with injectable deps. */
function createHandler(deps = {}) {
  const dual = deps.runDual || runDual;
  return async function handle(event, user) {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return jsonError(400, 'Invalid JSON body'); }

    const task = getTask(String(body.task || ''));
    if (!task) return jsonError(400, 'Unknown task');
    const params = body.params && typeof body.params === 'object' ? body.params : {};

    if (!(await (deps.underRateLimit || underRateLimit)(user.id))) return jsonError(429, 'Too many AI requests. Please wait a moment.');

    let ctx;
    try {
      ctx = await task.load({ user, params });
    } catch (err) {
      if (err instanceof TaskError) return jsonError(err.status, err.message);
      return jsonError(500, 'Could not load the data for this task');
    }

    const { instructions, input } = task.buildInput(ctx, params);
    const options = {
      role: task.role || 'default',
      effort: task.effort || 'low',
      instructions,
      input,
      schema: task.schema,
      schemaName: String(task.id).replace(/[^a-zA-Z0-9_-]/g, '_'),
      tools: task.tools,
      toolChoice: task.tools && task.tools.length && task.requireTools ? 'required' : undefined,
      maxOutputTokens: task.maxOutputTokens || 3000,
      store: false,
      user: user.id,
    };
    const budget = await (deps.withinTokenBudget || withinTokenBudget)({ ...options, model: options.role });
    if (!budget.ok) return jsonError(413, `Input is too long (${budget.tokens} tokens).`);

    let usage = null;
    let status = 'ok';
    try {
      return await dual({
        event, body, options, deps: deps.responses,
        headers: CORS_HEADERS,
        finalize: async (text) => {
          let parsed;
          try { parsed = JSON.parse(text); } catch { throw new Error('The AI did not return a valid result'); }
          const payload = task.finalize ? await task.finalize(parsed, ctx, params) : parsed;
          if (task.moderate && task.outboundText) {
            const verdict = await (deps.checkOutbound || checkOutbound)({ texts: task.outboundText(payload), userId: user.id, endpoint: `ai-task:${task.id}` });
            if (!verdict.ok) {
              const e = new Error(`Blocked by content moderation: ${verdict.categories.join(', ')}`);
              e.code = 'CONTENT_FLAGGED';
              e.categories = verdict.categories;
              throw e;
            }
          }
          return { success: true, data: payload, task: task.id, model: resolveModel(options.role).model };
        },
        onEvent: (ev) => { if (ev.type === 'done') usage = ev.usage; if (ev.type === 'error') status = 'error'; },
        onEnd: () => (deps.logUsage || logUsage)(user.id, `ai-task:${task.id}`, { model: options.role }, usage, status),
      });
    } catch (err) {
      if (err && err.code === 'CONTENT_FLAGGED') return flaggedResponse(err.categories || [], CORS_HEADERS);
      return jsonError(502, 'The AI request failed');
    }
  };
}

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
