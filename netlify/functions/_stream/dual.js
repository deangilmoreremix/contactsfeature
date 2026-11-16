/**
 * Dual-mode response for legacy AI functions: the SAME handler returns plain JSON (as before)
 * or a live SSE stream when the client asks for one (Accept: text/event-stream, body.stream:true,
 * or ?stream=true). The stream carries status/delta/partial events and a final
 * `{type:'result', data}` event holding exactly what the JSON mode would have returned.
 *
 *   exports.handler = stream(withAuth(async (event, user) => {
 *     ...build options...
 *     return runDual({ event, body, options, finalize: (text) => ({ subject, body }) });
 *   }));
 */
const { CORS_HEADERS } = require('../_auth');
const { createResponse, streamResponse } = require('../_responses');
const { SSE_HEADERS, toSseReadable } = require('./sse');

function isStreamRequested(event, body) {
  const accept = (event.headers && (event.headers.accept || event.headers.Accept)) || '';
  return /text\/event-stream/i.test(accept) || (body && (body.stream === true || body.streaming === true)) ||
    (event.queryStringParameters && event.queryStringParameters.stream === 'true');
}

/**
 * opts: { event, body, options (createResponse/streamResponse options), finalize(text, result) -> payload,
 *         headers?, deps?: { createResponse, streamResponse } (tests), onEvent?, onEnd? }
 */
async function runDual(opts) {
  const { event, body, options, finalize } = opts;
  const create = (opts.deps && opts.deps.createResponse) || createResponse;
  const streamIt = (opts.deps && opts.deps.streamResponse) || streamResponse;
  const baseHeaders = opts.headers || CORS_HEADERS;

  if (!isStreamRequested(event, body)) {
    const r = await create(options);
    if (!r.text) throw new Error('AI returned no text');
    const data = await finalize(r.text, r);
    return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(data) };
  }

  async function* events() {
    for await (const ev of streamIt({ ...options, schema: options.schema })) {
      if (ev.type === 'done') {
        try {
          yield { type: 'result', data: await finalize(ev.text, ev) };
        } catch (err) {
          yield { type: 'error', message: err.message || 'Could not build the result' };
          return;
        }
      }
      yield ev;
      if (ev.type === 'error') return;
    }
  }
  return {
    statusCode: 200,
    headers: { ...baseHeaders, ...SSE_HEADERS },
    body: toSseReadable(events(), { onEvent: opts.onEvent, onEnd: opts.onEnd }),
  };
}

module.exports = { runDual, isStreamRequested };
