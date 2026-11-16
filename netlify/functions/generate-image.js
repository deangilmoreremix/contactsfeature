/**
 * POST /.netlify/functions/generate-image
 * Body: { prompt, size?, quality?, n?, fast?, outputFormat?, referenceImages?: string[] (data URLs) }
 *
 * Text-to-image (no referenceImages) is ASYNCHRONOUS so it can never hit Netlify's function timeout:
 * one Responses API call per variant (n <= 4, started in parallel) using the hosted `image_generation`
 * tool with `background: true`. Returns immediately:
 *   { jobs: [{ responseId }], model, size, quality, outputFormat }
 * The client then polls `generate-image-status` ({ responseIds }) for the base64 results. Each response
 * carries `metadata.user_id` so status can refuse other users' ids.
 *
 * With referenceImages the Images *edit* endpoint is used and it stays SYNCHRONOUS (it needs multipart
 * uploads, which the background Responses flow does not cover here). Response shape in that case:
 *   { images: [{ b64_json, mime_type }], model, size, quality }
 * Clients must handle both shapes; the browser service sends one image per request when references
 * are present to stay inside the function time limit.
 *
 * Tool params (Responses `image_generation`): model, quality, size, output_format, background
 * (transparency; unused here), partial_images (streaming only; not used in background polling).
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
  const create = deps.createResponse || responses.createResponse;
  return async function handle(event, user) {
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
      if (refs.length) {
        // Synchronous Images edit (reference images). See header note.
        const client = deps.client || responses.getClient();
        const toFile = deps.toFile || require('openai').toFile;
        const files = await Promise.all(refs.map((r, i) =>
          toFile(r.buf, `reference-${i}.${r.mime.split('/')[1]}`, { type: r.mime })));
        const res = await client.images.edit({
          model, image: files, prompt, n, size, quality, output_format: outputFormat,
        });
        const images = (res.data || [])
          .map((d) => d.b64_json)
          .filter((v) => typeof v === 'string' && !/^https?:/.test(v))
          .map((b64) => ({ b64_json: b64, mime_type: `image/${outputFormat}` }));
        if (!images.length) return json(502, { error: 'No image was returned. Try adjusting the prompt.' });
        return json(200, { images, model, size, quality });
      }

      const settled = await Promise.allSettled(Array.from({ length: n }, (_, i) => create({
        client: deps.client,
        role: 'default',
        input: prompt,
        tools: [{ type: 'image_generation', model, quality, size, output_format: outputFormat }],
        toolChoice: { type: 'image_generation' },
        background: true,
        store: true,
        metadata: { user_id: user.id, purpose: 'image_generation', variant: String(i), output_format: outputFormat },
        user: user.id,
      })));
      const jobs = settled
        .filter((r) => r.status === 'fulfilled' && r.value && r.value.id)
        .map((r) => ({ responseId: r.value.id }));
      if (!jobs.length) {
        const first = settled.find((r) => r.status === 'rejected');
        throw (first && first.reason) || new Error('Could not start image generation');
      }
      return json(200, { jobs, model, size, quality, outputFormat });
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
