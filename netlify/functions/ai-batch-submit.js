/**
 * POST { kind: 'enrich' | 'embed', contactIds: uuid[] (max 500) } -> { batch: {...}, skipped: [...] }
 * Creates one OpenAI Batch API job (50% cost, 24h window) for the caller's own contacts.
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { isValidUUID, parseBody } = require('./_validation');
const { createBatch } = require('./_responses');
const { buildRequests, MAX_CONTACTS_PER_BATCH } = require('./_batch');

exports.handler = withAuth(async (event, user) => {
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');
  if (!['enrich', 'embed'].includes(body.kind)) return errorResponse(400, 'kind must be "enrich" or "embed"');
  const ids = Array.isArray(body.contactIds) ? [...new Set(body.contactIds)].filter(isValidUUID) : [];
  if (!ids.length) return errorResponse(400, 'contactIds is required');
  if (ids.length > MAX_CONTACTS_PER_BATCH) return errorResponse(400, `At most ${MAX_CONTACTS_PER_BATCH} contacts per batch`);
  if (!process.env.OPENAI_API_KEY) return errorResponse(503, 'OPENAI_API_KEY is not configured');

  try {
    const { data: contacts, error } = await supabase.from('contacts').select('*').in('id', ids).eq('user_id', user.id).is('deleted_at', null);
    if (error) throw new Error(error.message);
    if (!contacts || !contacts.length) return errorResponse(404, 'No matching contacts');

    const { endpoint, requests, skipped } = buildRequests(body.kind, contacts, user.id);
    if (!requests.length) return errorResponse(422, 'None of the selected contacts has enough data', { skipped });

    const batch = await createBatch(endpoint, requests.map(({ customId, body: b }) => ({ customId, body: b })), { metadata: { user_id: user.id, kind: body.kind } });
    const row = {
      user_id: user.id, kind: body.kind, openai_batch_id: batch.id, input_file_id: batch.inputFileId,
      status: batch.status, total: requests.length, contact_ids: requests.map((r) => r.customId),
    };
    const { data: saved, error: insErr } = await supabase.from('ai_batches').insert(row).select('id,kind,status,total,completed,failed,created_at').maybeSingle();
    if (insErr) throw new Error(insErr.message);

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ batch: saved, skipped }) };
  } catch (err) {
    return errorResponse(500, 'Could not start the batch');
  }
});
