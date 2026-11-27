/**
 * POST /.netlify/functions/generate-image-stream   (Server-Sent Events)
 * Body: { prompt, size?, quality?, fast?, outputFormat?, partialImages? (0-3, default 2), variant? }
 *
 * ONE stream per image variant (the browser opens up to 4 in parallel). Uses the Responses API hosted
 * `image_generation` tool with `stream:true` + `partial_images`, so the client sees the picture sharpen:
 *   status  { phase, label, id }   first status carries the response id (usable with generate-image-status)
 *   image   { index, b64, partial:true }  progressive previews
 *   image   { index, b64, partial:false } the final image
 *   result  { image: { b64_json, mime_type }, model, size, quality, responseId }
 *   done | error
 * The request runs with `background:true`, so if the connection drops the job still finishes and the
 * client can fetch it with generate-image-status (metadata.user_id guards ownership).
 * Reference-image edits are not streamable and keep using generate-image.
 */
const { stream } = require('@netlify/functions');
const { withAuth, CORS_HEADERS } = require('./_auth');
const responses = require('./_responses');
const { SSE_HEADERS, toSseReadable } = require('./_stream/sse');
const models = require('../../src/config/models.json');

const SIZES = new Set(['auto', '1024x1024', '1536x1024', '1024x1536']);
const QUALITIES = new Set(['auto', 'low', 'medium', 'high']);
const FORMATS = new Set(['png', 'jpeg', 'webp']);
const MAX_PROMPT = 4000;

function plain(statusCode, message) {
  return { statusCode, headers: { ...CORS_HEADERS }, body: JSON.stringify({ error: message }) };
}

/** Exported for tests: handler factory accepting injected deps ({ streamResponse }). */
function createHandler(deps = {}) {
  const streamIt = deps.streamResponse || responses.streamResponse;
  return async function handle(event, user) {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return plain(400, 'Invalid JSON body'); }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return plain(400, 'prompt is required');
    if (prompt.length > MAX_PROMPT) return plain(400, `prompt must be ${MAX_PROMPT} characters or fewer`);
    const size = body.size === undefined ? '1024x1024' : body.size;
    if (!SIZES.has(size)) return plain(400, `size must be one of ${[...SIZES].join(', ')}`);
    const quality = body.quality === undefined ? 'medium' : body.quality;
    if (!QUALITIES.has(quality)) return plain(400, `quality must be one of ${[...QUALITIES].join(', ')}`);
    const outputFormat = body.outputFormat === undefined ? 'png' : body.outputFormat;
    if (!FORMATS.has(outputFormat)) return plain(400, `outputFormat must be one of ${[...FORMATS].join(', ')}`);
    const partialImages = body.partialImages === undefined ? 2 : body.partialImages;
    if (!Number.isInteger(partialImages) || partialImages < 0 || partialImages > 3) return plain(400, 'partialImages must be an integer between 0 and 3');
    if (body.referenceImages !== undefined) return plain(400, 'Reference images cannot be streamed; use generate-image');

    const model = body.fast === true ? models.image.fast : models.image.default;
    const mime = `image/${outputFormat}`;
    const tool = { type: 'image_generation', model, quality, size, output_format: outputFormat };
    if (partialImages > 0) tool.partial_images = partialImages;

    let responseId = null;
    let final = null;
    async function* events() {
      for await (const ev of streamIt({
        client: deps.client,
        role: 'default',
        input: prompt,
        tools: [tool],
        toolChoice: { type: 'image_generation' },
        background: true,
        metadata: { user_id: user.id, purpose: 'image_generation', variant: String(body.variant || 0), output_format: outputFormat },
        user: user.id,
      })) {
        if (ev.type === 'status' && ev.id) responseId = ev.id;
        if (ev.type === 'image' && !ev.partial) final = ev;
        if (ev.type === 'done') {
          if (!final) { yield { type: 'error', message: 'No image was returned. Try adjusting the prompt.' }; return; }
          yield { type: 'result', data: { image: { b64_json: final.b64, mime_type: mime }, model, size, quality, responseId: responseId || ev.id } };
        }
        yield ev;
        if (ev.type === 'error') return;
      }
    }
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, ...SSE_HEADERS },
      body: toSseReadable(events(), { publicError: 'Image generation failed' }),
    };
  };
}

exports.createHandler = createHandler;
exports.handler = stream(withAuth(createHandler()));
