/**
 * Pure builders/appliers for OpenAI Batch API runs (bulk enrichment + embeddings).
 * Kept free of I/O so they can be unit-tested; the handlers inject supabase/clients.
 */
const crypto = require('crypto');
const responses = require('./_responses');
const models = require('../../src/config/models.json');

const MAX_CONTACTS_PER_BATCH = 500;
const MIN_APPLY_CONFIDENCE = 60;
const nullable = { type: ['string', 'null'] };

const ENRICH_SCHEMA = {
  type: 'object',
  properties: {
    matched: { type: 'boolean' },
    confidence: { type: 'integer', description: '0-100 confidence the findings describe this exact person' },
    summary: nullable,
    jobTitle: nullable,
    company: nullable,
    industry: nullable,
    businessPhone: nullable,
    linkedinUrl: nullable,
    websiteUrl: nullable,
    evidence: { type: 'array', items: { type: 'string' }, description: 'Source URLs supporting the non-null fields' },
  },
};

const ENRICH_INSTRUCTIONS = `You enrich a CRM contact using PUBLIC web sources only (web_search).
Never guess or invent anything: unknown values must be null. Do not collect sensitive personal data.
If several people could match and you cannot tell which, set matched=false. Put the URLs you relied on in evidence.`;

function contactName(c) {
  return c.name || `${c.firstname || c.firstName || ''} ${c.lastname || c.lastName || ''}`.trim();
}

function contactClue(c) {
  const domain = String(c.email || '').split('@')[1] || '';
  return [
    `Name: ${contactName(c) || 'unknown'}`,
    c.email ? `Email: ${c.email} (domain: ${domain})` : null,
    c.company ? `Company: ${c.company}` : null,
    c.title ? `Title: ${c.title}` : null,
    c.industry ? `Industry: ${c.industry}` : null,
  ].filter(Boolean).join('\n');
}

/** Text embedded for semantic search (same shape as semantic-search.js contactContent). */
function embedText(c) {
  const tags = Array.isArray(c.tags) ? c.tags.join(', ') : c.tags;
  return [contactName(c), c.title || c.job_title, c.company, c.industry, c.email, tags, c.notes, c.status]
    .filter((v) => v && String(v).trim())
    .map((v) => String(v).trim())
    .join('\n')
    .slice(0, 6000);
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Returns { endpoint, requests: [{ customId, body }], skipped: [{ id, reason }] } */
function buildRequests(kind, contacts, userId) {
  const requests = [];
  const skipped = [];
  if (kind === 'enrich') {
    for (const c of contacts) {
      if (!(c.email || contactName(c) || c.company)) { skipped.push({ id: c.id, reason: 'needs a name, email or company' }); continue; }
      requests.push({
        customId: c.id,
        body: responses.buildParams({
          role: 'thinking', effort: 'medium', instructions: ENRICH_INSTRUCTIONS,
          input: `Research this CRM contact and return the structured findings.\n\n${contactClue(c)}`,
          schema: ENRICH_SCHEMA, schemaName: 'batch_contact_enrichment',
          tools: [{ type: 'web_search', search_context_size: 'low' }], toolChoice: 'required',
          maxOutputTokens: 4000, store: false, metadata: { user_id: userId, contact_id: c.id },
        }),
      });
    }
    return { endpoint: '/v1/responses', requests, skipped };
  }
  if (kind === 'embed') {
    for (const c of contacts) {
      const text = embedText(c);
      if (!text) { skipped.push({ id: c.id, reason: 'nothing to embed' }); continue; }
      const hash = sha(text);
      // The submission-time content hash rides in the custom id (`<contactId>~<hash prefix>`) so a contact edited while the
      // batch is pending is detected when results are applied (see applyResults).
      requests.push({ customId: `${c.id}~${hash.slice(0, 16)}`, contactId: c.id, body: { model: process.env.SMARTCRM_EMBEDDING_MODEL || models.embedding.model, input: text }, hash });
    }
    return { endpoint: '/v1/embeddings', requests, skipped };
  }
  throw new Error(`Unknown batch kind: ${kind}`);
}

/** Fill only EMPTY scalar fields from a batch enrichment result, when matched with enough confidence. */
function enrichmentFills(result, contact) {
  const fills = {};
  if (!result || !result.matched || (result.confidence || 0) < MIN_APPLY_CONFIDENCE) return fills;
  if (!contact.title && result.jobTitle) fills.title = result.jobTitle;
  if (!contact.company && result.company) fills.company = result.company;
  if (!contact.industry && result.industry) fills.industry = result.industry;
  if (!contact.phone && result.businessPhone) fills.phone = result.businessPhone;
  return fills;
}

/**
 * Apply parsed batch results. deps: { supabase, now? }. Returns { applied, failed, fills }.
 * enrich: writes empty-field fills to contacts + a contact_enrichments row; embed: upserts contact_embeddings.
 */
async function applyResults(kind, results, ctx) {
  const { supabase, userId, contactsById, hashes = {} } = ctx;
  let applied = 0;
  let failed = 0;
  const fills = {};
  const now = new Date().toISOString();

  for (const r of results) {
    // custom ids are `<contactId>` (enrich, or older embed batches) or `<contactId>~<submission hash prefix>` (embed)
    const [customContactId, submittedHash] = String(r.customId).split('~');
    const contact = contactsById.get(customContactId);
    if (!contact || !r.ok) { failed++; continue; }
    try {
      if (kind === 'enrich') {
        const text = responses.extractText(r.body);
        const result = responses.parseJson(text);
        if (!result) { failed++; continue; }
        const f = enrichmentFills(result, contact);
        if (Object.keys(f).length) {
          const { error } = await supabase.from('contacts').update(f).eq('id', contact.id).eq('user_id', userId);
          if (error) throw new Error(error.message);
          fills[contact.id] = f;
        }
        await supabase.from('contact_enrichments').upsert({
          contact_id: contact.id, user_id: userId, response_id: r.body.id || `batch_${contact.id}_${Date.now()}`,
          status: 'completed', matched: !!result.matched,
          confidence: Math.max(0, Math.min(100, Math.round(result.confidence || 0))),
          result, citations: (result.evidence || []).map((url) => ({ url })), applied_fields: Object.keys(f), model: r.body.model || null,
        }, { onConflict: 'response_id' });
        applied++;
      } else {
        const vec = r.body && r.body.data && r.body.data[0] && r.body.data[0].embedding;
        if (!vec) { failed++; continue; }
        // The contact changed after submission: this vector describes the OLD text, so do not store it as current.
        // Leaving the row alone means the next index pass re-embeds the edited contact.
        const currentHash = hashes[contact.id] || sha(embedText(contact));
        if (submittedHash && !String(currentHash).startsWith(submittedHash)) { failed++; continue; }
        const { error } = await supabase.from('contact_embeddings').upsert({
          contact_id: contact.id, user_id: userId, embedding: JSON.stringify(vec), content_hash: currentHash, updated_at: now,
        }, { onConflict: 'contact_id' });
        if (error) throw new Error(error.message);
        applied++;
      }
    } catch (_) {
      failed++;
    }
  }
  return { applied, failed, fills };
}

module.exports = { MAX_CONTACTS_PER_BATCH, ENRICH_SCHEMA, buildRequests, enrichmentFills, applyResults, embedText, contactClue };
