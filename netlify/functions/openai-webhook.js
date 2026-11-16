/**
 * Netlify Function: OpenAI webhook receiver (background Responses completion).
 * POST (from OpenAI, no user auth). Authenticity = signature check over the RAW body
 * (`webhook-id`, `webhook-timestamp`, `webhook-signature` with OPENAI_WEBHOOK_SECRET); bad signature -> 400.
 *
 * Handles response.completed / response.failed / response.cancelled / response.incomplete: looks up the
 * ai_jobs row for the response id, retrieves the response and stores status/result. Unknown response ids
 * (not started by this app) are acknowledged and ignored. Redeliveries are idempotent.
 * Any other event type is acknowledged with 200 so OpenAI does not retry it.
 *
 * Configure in the OpenAI dashboard: https://<site>/.netlify/functions/openai-webhook, events response.*
 */
const { supabase } = require('./_supabaseClient');
const { unwrapWebhook, retrieveResponse } = require('./_responses');
const { getJobByResponseId, completeJob } = require('./_aiJobs');

const HEADERS = { 'Content-Type': 'application/json' };
const RESPONSE_EVENTS = new Set(['response.completed', 'response.failed', 'response.cancelled', 'response.incomplete']);
const reply = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });

/** The exact bytes OpenAI signed (Netlify may base64-encode the body). */
function rawBody(event) {
  const body = event.body || '';
  return event.isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
}

/** Lower-case header map (Netlify already lower-cases, but be safe for other runtimes). */
function lowerHeaders(headers) {
  return Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [String(k).toLowerCase(), v]));
}

/** deps: { unwrap, retrieve, db } injectable for tests. */
async function process(event, deps = {}) {
  const unwrap = deps.unwrap || unwrapWebhook;
  const retrieve = deps.retrieve || retrieveResponse;
  const db = deps.db || supabase;

  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

  let evt;
  try {
    evt = await unwrap(rawBody(event), lowerHeaders(event.headers));
  } catch (err) {
    const msg = String((err && err.message) || '');
    if (/OPENAI_WEBHOOK_SECRET is not configured/.test(msg)) {
      console.error('[openai-webhook] OPENAI_WEBHOOK_SECRET is not configured');
      return reply(500, { error: 'Webhook is not configured' });
    }
    return reply(400, { error: 'Invalid webhook signature' });
  }

  if (!evt || !RESPONSE_EVENTS.has(evt.type)) return reply(200, { ok: true, ignored: true });
  const responseId = evt.data && evt.data.id;
  if (typeof responseId !== 'string' || !/^resp_[A-Za-z0-9]+$/.test(responseId)) return reply(200, { ok: true, ignored: true });

  try {
    const job = await getJobByResponseId(db, responseId);
    if (!job) return reply(200, { ok: true, ignored: true });
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled' || job.status === 'incomplete') {
      return reply(200, { ok: true, duplicate: true });
    }
    const run = await retrieve(responseId, { parseJson: true });
    const { changed } = await completeJob(db, job, run);
    return reply(200, { ok: true, changed });
  } catch (err) {
    // 500 -> OpenAI retries the delivery with backoff
    console.error('[openai-webhook] processing failed:', err && err.message);
    return reply(500, { error: 'Webhook processing failed' });
  }
}

exports.handler = (event) => process(event);
exports._internals = { process, rawBody, RESPONSE_EVENTS };
