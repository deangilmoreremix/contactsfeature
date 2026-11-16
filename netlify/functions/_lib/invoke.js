/**
 * In-process call of another streaming function. Every legacy function exports `stream(withAuth(fn))`, i.e. the
 * Lambda response-streaming wrapper `(event, responseStream, context)`. We load such a module while
 * `awslambda.streamifyResponse` is an identity shim (so we get the wrapper back), then call it with a PassThrough and
 * a shim `HttpResponseStream.from` that hands us the status/headers. The caller returns `{ statusCode, headers, body }`
 * through its own `stream()` so the SSE bytes flow straight to the browser.
 */
const { PassThrough } = require('stream');
const path = require('path');

const cache = new Map();

/** Load a target module (once) with the shim active; drops any copy that was cached with the real wrapper. */
function loadShimmed(name, loadFn) {
  if (cache.has(name)) return cache.get(name);
  const dir = __dirname.replace(/[\\/]_lib$/, '');
  for (const k of Object.keys(require.cache)) {
    if (path.dirname(k) === dir && path.basename(k, '.js') === name) delete require.cache[k];
  }
  const prev = globalThis.awslambda;
  globalThis.awslambda = {
    ...(prev || {}),
    streamifyResponse: (fn) => { fn.__directStream = true; return fn; },
    HttpResponseStream: { from: (s) => s },
  };
  let mod;
  try { mod = loadFn(); } finally { globalThis.awslambda = prev; }
  cache.set(name, mod);
  return mod;
}

/** -> { statusCode, headers, body: Readable } */
async function invokeStreamed(mod, event, context) {
  const wrapped = mod && mod.handler;
  if (typeof wrapped !== 'function' || !wrapped.__directStream) throw new Error('Agent handler cannot be invoked in-process');
  const out = new PassThrough();
  const prev = globalThis.awslambda;
  let restored = false;
  const restore = () => { if (!restored) { restored = true; globalThis.awslambda = prev; } };
  let gotMeta;
  const meta = new Promise((resolve) => { gotMeta = resolve; });
  globalThis.awslambda = {
    ...(prev || {}),
    HttpResponseStream: { from: (s, m) => { restore(); gotMeta(m || {}); return s; } },
  };
  const run = Promise.resolve().then(() => wrapped(event, out, context));
  const failed = run.then(() => ({ statusCode: 200, headers: {} }), (err) => { restore(); throw err; });
  const m = await Promise.race([meta, failed]);
  run.catch(() => { if (!out.destroyed) out.destroy(); });
  return { statusCode: m.statusCode || 200, headers: m.headers || {}, body: out };
}

module.exports = { loadShimmed, invokeStreamed };
