/**
 * Netlify Function: semantic contact search with pgvector.
 * POST { query, limit?: 20 } -> { results: [{ contact, score }], embedded: n, pending: n }
 * Embeds missing/stale contacts (content_hash) in small batches per call, so large databases
 * converge over a few searches; `pending` tells the client how many are still not indexed.
 */
const crypto = require('crypto');
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const responses = require('./_responses');

const BATCH = 64;
const MAX_CONTACTS = 2000;

/** Text used to embed a contact (tolerates both name/firstname schemas). */
function contactContent(c) {
  const name = c.name || `${c.firstname || c.firstName || ''} ${c.lastname || c.lastName || ''}`.trim();
  const tags = Array.isArray(c.tags) ? c.tags.join(', ') : c.tags;
  return [name, c.title || c.job_title, c.company, c.industry, c.email, tags, c.notes, c.status]
    .filter((v) => v && String(v).trim())
    .map((v) => String(v).trim())
    .join('\n')
    .slice(0, 6000);
}
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');

exports.contactContent = contactContent;

exports.handler = withAuth(async (event, user) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }
  const query = String(body.query || '').trim();
  if (query.length < 2) return errorResponse(400, 'query is required');
  const limit = Math.min(Math.max(parseInt(body.limit, 10) || 20, 1), 50);

  if (!process.env.OPENAI_API_KEY) return errorResponse(503, 'Semantic search is unavailable: OPENAI_API_KEY is not configured');

  try {
    const { data: contacts, error: cErr } = await supabase.from('contacts').select('*').eq('user_id', user.id).limit(MAX_CONTACTS);
    if (cErr) throw new Error(cErr.message);
    const list = contacts || [];
    const byId = new Map(list.map((c) => [c.id, c]));

    const { data: existing, error: eErr } = await supabase.from('contact_embeddings').select('contact_id, content_hash').eq('user_id', user.id).limit(MAX_CONTACTS);
    if (eErr) throw new Error(eErr.message);
    const have = new Map((existing || []).map((r) => [r.contact_id, r.content_hash]));

    const stale = [];
    for (const c of list) {
      const content = contactContent(c);
      if (!content) continue;
      const h = hash(content);
      if (have.get(c.id) !== h) stale.push({ id: c.id, content, h });
    }
    const todo = stale.slice(0, BATCH);
    if (todo.length) {
      const vectors = await responses.embed(todo.map((t) => t.content));
      const rows = todo.map((t, i) => ({
        contact_id: t.id, user_id: user.id, embedding: JSON.stringify(vectors[i]), content_hash: t.h, updated_at: new Date().toISOString(),
      }));
      const { error: uErr } = await supabase.from('contact_embeddings').upsert(rows, { onConflict: 'contact_id' });
      if (uErr) throw new Error(uErr.message);
    }

    const [qVec] = await responses.embed([query]);
    // Service client has no auth.uid(); rank in SQL via owner-scoped client instead.
    const { getUserClient } = require('./_supabaseClient');
    const userClient = getUserClient(event.headers.authorization || event.headers.Authorization);
    const { data: matches, error: mErr } = await userClient.rpc('match_contacts', {
      query_embedding: JSON.stringify(qVec), match_count: limit,
    });
    if (mErr) throw new Error(mErr.message);

    const results = (matches || [])
      .filter((m) => byId.has(m.contact_id))
      .map((m) => ({ contact: byId.get(m.contact_id), score: m.similarity }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ results, embedded: todo.length, pending: Math.max(stale.length - todo.length, 0) }),
    };
  } catch (e) {
    return errorResponse(500, `Semantic search failed: ${e.message}`);
  }
});
