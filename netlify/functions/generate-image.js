/**
 * POST /.netlify/functions/generate-image
 * Body: { prompt, size?, quality?, n?, fast?, outputFormat?, referenceImages?: string[] (data URLs) }
 * Returns: { images: [{ b64_json, mime_type }], model, size, quality }
 *
 * Uses OpenAI Images (models from src/config/models.json: image.default / image.fast) through the
 * shared _responses helper. When referenceImages are supplied the Images edit endpoint is used.
 */
const { withAuth, CORS_HEADERS } = require('./_auth');
const responses = require('./_responses');
const models = require('../../src/config/models.json');

const SIZES = new Set(['auto', '1024x1024', '1536x1024', '1024x1536']);
const QUALITIES = new Set(['auto', 'low', 'medium', 'high']);
const FORMATS = new Set(['png', 'jpeg', 'webp']);
const MAX_PROMPT = 4000;
const MAX_N = 4;
const MAX_REFS = 4;
const MAX_REF_BYTES = 4 * 1024 * 1024;
const DATA_URL = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/;

function json(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function parseRefs(refs) {
  const out = [];
  for (const ref of refs) {
    const m = typeof ref === 'string' ? DATA_URL.exec(ref) : null;
    if (!m) return { error: 'referenceImages must be base64 png/jpeg/webp data URLs' };
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_REF_BYTES) return { error: 'Each reference image must be 4MB or smaller' };
    out.push({ mime: m[1].replace('jpg', 'jpeg'), buf });
  }
  return { refs: out };
}

/** Exported for tests: handler factory accepting an injected OpenAI client. */
function createHandler(deps = {}) {
  const generate = deps.generateImage || responses.generateImage;
  return async function handle(event) {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return json(400, { error: 'prompt is required' });
    if (prompt.length > MAX_PROMPT) return json(400, { error: `prompt must be ${MAX_PROMPT} characters or fewer` });

    const size = body.size === undefined ? '1024x1024' : body.size;
    if (!SIZES.has(size)) return json(400, { error: `size must be one of ${[...SIZES].join(', ')}` });
    const quality = body.quality === undefined ? 'medium' : body.quality;
    if (!QUALITIES.has(quality)) return json(400, { error: `quality must be one of ${[...QUALITIES].join(', ')}` });
    const outputFormat = body.outputFormat === undefined ? 'png' : body.outputFormat;
    if (!FORMATS.has(outputFormat)) return json(400, { error: `outputFormat must be one of ${[...FORMATS].join(', ')}` });
    const n = body.n === undefined ? 1 : body.n;
    if (!Number.isInteger(n) || n < 1 || n > MAX_N) return json(400, { error: `n must be an integer between 1 and ${MAX_N}` });

    let refs = [];
    if (body.referenceImages !== undefined) {
      if (!Array.isArray(body.referenceImages) || body.referenceImages.length > MAX_REFS) {
        return json(400, { error: `referenceImages must be an array of at most ${MAX_REFS} images` });
      }
      const parsed = parseRefs(body.referenceImages);
      if (parsed.error) return json(400, { error: parsed.error });
      refs = parsed.refs;
    }

    const fast = body.fast === true;
    const model = fast ? models.image.fast : models.image.default;

    try {
      let results;
      if (refs.length) {
        const client = deps.client || responses.getClient();
        const toFile = deps.toFile || require('openai').toFile;
        const files = await Promise.all(refs.map((r, i) =>
          toFile(r.buf, `reference-${i}.${r.mime.split('/')[1]}`, { type: r.mime })));
        const res = await client.images.edit({
          model, image: files, prompt, n, size, quality, output_format: outputFormat,
        });
        results = (res.data || []).map((d) => d.b64_json).filter(Boolean);
      } else {
        results = await generate({ client: deps.client, model, prompt, n, size, quality, outputFormat });
      }
      const images = results
        .filter((v) => typeof v === 'string' && !/^https?:/.test(v))
        .map((b64) => ({ b64_json: b64, mime_type: `image/${outputFormat}` }));
      if (!images.length) return json(502, { error: 'No image was returned. Try adjusting the prompt.' });
      return json(200, { images, model, size, quality });
    } catch (err) {
      const status = err && err.status === 400 ? 400 : 502;
      const message = status === 400 && err.message ? err.message : 'Image generation failed';
      console.error('[generate-image]', err && err.message);
      return json(status, { error: message });
    }
  };
}

exports.createHandler = createHandler;
exports.handler = withAuth(createHandler());
