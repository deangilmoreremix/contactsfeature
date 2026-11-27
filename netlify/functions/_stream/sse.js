/**
 * SSE helpers shared by every streaming Netlify function.
 *  - frame(event): one SSE frame, `id:` = Responses sequence number (for resume), `data:` = JSON
 *  - toSseReadable(events, opts): Node Readable (for @netlify/functions stream()) that
 *    interleaves `: ping` heartbeats so proxies never close an idle-looking stream
 *  - SSE_HEADERS: unbuffered, uncached
 */
const { PassThrough } = require('stream');

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
};

function frame(event) {
  const id = event && typeof event.seq === 'number' ? `id: ${event.seq}\n` : '';
  return `${id}data: ${JSON.stringify(event)}\n\n`;
}

/**
 * events: async iterable of UI events. opts: { heartbeatMs = 15000, onEvent(ev), onEnd(), signal }
 * Always ends with `data: [DONE]`. A thrown error becomes a final `error` event.
 */
function toSseReadable(events, opts = {}) {
  const out = new PassThrough();
  const heartbeatMs = opts.heartbeatMs === undefined ? 15000 : opts.heartbeatMs;
  const timer = heartbeatMs > 0 ? setInterval(() => out.write(': ping\n\n'), heartbeatMs) : null;
  let closed = false; // client went away
  let ended = false;  // onEnd already ran
  const finish = async () => {
    if (ended) return;
    ended = true;
    if (timer) clearInterval(timer);
    try { if (opts.onEnd) await opts.onEnd(); } catch (_) { /* never break the stream on cleanup */ }
    if (closed) return;
    out.write('data: [DONE]\n\n');
    out.end();
  };
  out.on('close', () => { if (timer) clearInterval(timer); closed = true; });

  (async () => {
    try {
      for await (const ev of events) {
        if (closed) break;
        if (opts.onEvent) opts.onEvent(ev);
        out.write(frame(ev));
      }
    } catch (err) {
      if (!closed) out.write(frame({ type: 'error', message: (opts.publicError || 'AI request failed') }));
    }
    await finish();
  })();
  return out;
}

module.exports = { SSE_HEADERS, frame, toSseReadable };
