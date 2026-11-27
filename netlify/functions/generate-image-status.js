/**
 * POST /.netlify/functions/generate-image-status
 * Body: { responseIds: string[] }   (1-4 ids returned by generate-image)
 * Returns: { jobs: [{ responseId, status, images?: [{ b64_json, mime_type }], error? }] }
 *   status: 'queued' | 'in_progress' | 'completed' | 'failed'
 *
 * Retrieves each background Responses job and extracts the base64 `result` of its
 * `image_generation_call` output item. A job is only visible to the user whose id was stored in
 * `metadata.user_id` at creation; anything else is reported as not found.
 *
 * Netlify responses are capped at ~6 MB, so the total base64 returned per call is budgeted: completed
 * jobs beyond the budget are reported as 'in_progress' and delivered on the next poll. (The browser
 * client polls one id at a time, which avoids this entirely.)
 */
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const responses = require('./_responses');

const MAX_IDS = 4;
const ID_RE = /^resp_[A-Za-z0-9]+$/;
const MAX_PAYLOAD_CHARS = 4.5 * 1024 * 1024;

/** base64 image results from a Responses object (`image_generation_call` items). */
function extractImageResults(response) {
  const out = [];
  for (const item of (response && response.output) || []) {
    if (item && item.type === 'image_generation_call' && typeof item.result === 'string' && item.result) {
      out.push({ b64: item.result, format: item.output_format || null });
    }
  }
  return out;
}

function createHandler(deps = {}) {
  const retrieve = deps.retrieveResponse || responses.retrieveResponse;
  return async function handle(event, user) {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }
    const ids = body.responseIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_IDS || !ids.every((i) => typeof i === 'string' && ID_RE.test(i))) {
      return errorResponse(400, `responseIds must be an array of 1-${MAX_IDS} response ids`);
    }

    let budget = MAX_PAYLOAD_CHARS;
    let first = true;
    const jobs = [];
    for (const responseId of [...new Set(ids)]) {
      try {
        const run = await retrieve(responseId, { client: deps.client });
        if (!run.metadata || run.metadata.user_id !== user.id || run.metadata.purpose !== 'image_generation') {
          jobs.push({ responseId, status: 'failed', error: 'Image job not found' });
          continue;
        }
        if (run.status === 'queued' || run.status === 'in_progress') {
          jobs.push({ responseId, status: run.status });
          continue;
        }
        if (run.status !== 'completed') {
          jobs.push({ responseId, status: 'failed', error: (run.error && run.error.message) || `Image generation ${run.status}` });
          continue;
        }
        const results = extractImageResults(run.response);
        if (!results.length) {
          jobs.push({ responseId, status: 'failed', error: 'No image was returned. Try adjusting the prompt.' });
          continue;
        }
        const size = results.reduce((n, r) => n + r.b64.length, 0);
        if (!first && size > budget) {
          jobs.push({ responseId, status: 'in_progress' }); // deliver on a later poll
          continue;
        }
        first = false;
        budget -= size;
        jobs.push({
          responseId,
          status: 'completed',
          images: results.map((r) => ({ b64_json: r.b64, mime_type: `image/${r.format || (['png', 'jpeg', 'webp'].includes(run.metadata.output_format) ? run.metadata.output_format : 'png')}` })),
        });
      } catch (err) {
        const notFound = err && err.status === 404;
        if (!notFound) console.error('[generate-image-status]', err && err.message);
        // A transient lookup failure is not a failed job: report it as still running; the client's cap bounds retries.
        jobs.push(notFound
          ? { responseId, status: 'failed', error: 'Image job not found' }
          : { responseId, status: 'in_progress', transient: true });
      }
    }
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ jobs }) };
  };
}

exports.createHandler = createHandler;
exports.extractImageResults = extractImageResults;
exports.handler = withAuth(createHandler());
