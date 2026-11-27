/**
 * Contact enrichment via the OpenAI Responses API `web_search` tool.
 *
 * POST { action: 'start', contactId | contact }  -> { responseId, status }
 * POST { action: 'start', stream: true, ... }    -> SSE (docs/STREAMING.md): status ("Searching the web…"), delta/partial
 *                                                  (the structured findings filling in), then `result` = exactly what
 *                                                  `status` returns when completed, then done.
 * POST { action: 'start', stream: true, resume: { responseId, startingAfter } } -> re-attach after a dropped connection
 * POST { action: 'status', responseId }          -> { status, result?, citations?, suggestedUpdates? }
 *
 * Web research with a reasoning model can exceed Netlify's sync function limit, so the run always uses
 * Responses background mode: the client either streams it (and resumes with `starting_after` if the connection
 * drops) or polls `status`.
 * An ai_jobs row is written when the run starts so openai-webhook can finish it; `status` prefers that
 * row and falls back to polling the response (also finishing the row) when no webhook has arrived.
 * Only publicly available professional information is requested; nothing is guessed.
 */
const { stream } = require('@netlify/functions');
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { isStreamRequested } = require('./_stream/dual');
const { SSE_HEADERS, toSseReadable } = require('./_stream/sse');
const { streamBackgroundJob, loadOwnedRun } = require('./_stream/backgroundJob');
const { isValidUUID, parseBody, sanitizeString } = require('./_validation');
const { createLogger, generateCorrelationId } = require('./_logger');
const { createResponse, retrieveResponse, parseJson, resolveModel } = require('./_responses');
const { createJob, getJob, completeJob, isTerminal } = require('./_aiJobs');

const log = createLogger('contact-enrich');

const nullableString = { type: ['string', 'null'] };

const ENRICHMENT_SCHEMA = {
  type: 'object',
  properties: {
    matched: { type: 'boolean', description: 'true only if you are confident the public results describe this exact person' },
    confidence: { type: 'integer', description: '0-100 confidence that the findings are about this person' },
    summary: { ...nullableString, description: 'Two-sentence professional summary' },
    profile: {
      type: 'object',
      properties: {
        jobTitle: nullableString,
        company: nullableString,
        industry: nullableString,
        location: nullableString,
        bio: nullableString,
        website: nullableString,
        linkedinUrl: nullableString,
        twitterUrl: nullableString,
        instagramUrl: nullableString,
        facebookUrl: nullableString,
        businessPhone: nullableString,
      },
    },
    company: {
      type: 'object',
      properties: {
        name: nullableString,
        website: nullableString,
        description: nullableString,
        industry: nullableString,
        sizeEstimate: nullableString,
        headquarters: nullableString,
      },
    },
    recentNews: {
      type: 'array',
      items: {
        type: 'object',
        properties: { headline: { type: 'string' }, url: { type: 'string' }, date: nullableString },
      },
    },
    talkingPoints: { type: 'array', items: { type: 'string' } },
    evidence: {
      type: 'array',
      description: 'One entry per non-null profile/company field naming the public page it came from',
      items: {
        type: 'object',
        properties: { field: { type: 'string' }, value: { type: 'string' }, sourceUrl: { type: 'string' } },
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
};

const INSTRUCTIONS = `You are a sales-research analyst enriching a CRM contact using public web search.
Rules:
- Use the web_search tool. Identify the person using ALL provided clues (name, email domain, company, title, existing profile links). If several different people match and you cannot tell which, set matched=false and explain in warnings.
- Collect only PUBLIC PROFESSIONAL information: role, employer, industry, public profile/website URLs, company facts, recent news relevant to selling to them.
- NEVER guess or fabricate. If a value is not found on a page you actually saw, return null. Never invent email addresses, phone numbers or social handles.
- Do not collect sensitive personal data (home address, family, health, political or religious views, finances).
- Every non-null profile/company field must have an evidence entry with the source URL.
- Prefer first-party sources (company site, official profiles) and reputable news. Keep text concise.`;

function clue(contact) {
  const first = contact.firstName || contact.firstname || '';
  const last = contact.lastName || contact.lastname || '';
  const name = sanitizeString(contact.name || `${first} ${last}`.trim(), 200);
  const social = contact.socialProfiles || contact.social_profiles || {};
  const domain = String(contact.email || '').split('@')[1] || '';
  const lines = [
    `Name: ${name || 'unknown'}`,
    contact.email ? `Email: ${sanitizeString(contact.email, 200)} (domain: ${domain})` : null,
    contact.company ? `Company: ${sanitizeString(contact.company, 200)}` : null,
    contact.title ? `Title: ${sanitizeString(contact.title, 200)}` : null,
    contact.industry ? `Industry: ${sanitizeString(contact.industry, 120)}` : null,
    social.linkedin ? `LinkedIn: ${sanitizeString(social.linkedin, 300)}` : null,
    social.twitter ? `Twitter/X: ${sanitizeString(social.twitter, 300)}` : null,
    social.website ? `Website: ${sanitizeString(social.website, 300)}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

const URL_RE = /^https?:\/\//i;
const cleanUrl = (u) => (typeof u === 'string' && URL_RE.test(u) ? u : null);

/**
 * Convert findings into field fills for EMPTY contact fields only (never overwrite user data),
 * only when the model matched the person with reasonable confidence.
 */
function suggestUpdates(result, contact) {
  const updates = {};
  if (!result || !result.matched || (result.confidence || 0) < 60) return updates;
  const p = result.profile || {};
  const social = contact.socialProfiles || contact.social_profiles || {};
  if (!contact.title && p.jobTitle) updates.title = p.jobTitle;
  if (!contact.company && (p.company || (result.company && result.company.name))) updates.company = p.company || result.company.name;
  if (!contact.industry && (p.industry || (result.company && result.company.industry))) updates.industry = p.industry || result.company.industry;
  if (!contact.phone && p.businessPhone) updates.phone = p.businessPhone;
  const socialUpdates = {};
  if (!social.linkedin && cleanUrl(p.linkedinUrl)) socialUpdates.linkedin = p.linkedinUrl;
  if (!social.twitter && cleanUrl(p.twitterUrl)) socialUpdates.twitter = p.twitterUrl;
  if (!social.website && cleanUrl(p.website)) socialUpdates.website = p.website;
  if (!social.instagram && cleanUrl(p.instagramUrl)) socialUpdates.instagram = p.instagramUrl;
  if (!social.facebook && cleanUrl(p.facebookUrl)) socialUpdates.facebook = p.facebookUrl;
  if (Object.keys(socialUpdates).length) updates.socialProfiles = { ...social, ...socialUpdates };
  return updates;
}

async function loadContact(userId, body) {
  if (isValidUUID(body.contactId)) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', body.contactId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`Database error: ${error.message}`);
    return { contact: data, persisted: !!data };
  }
  // Non-persisted contact (e.g. unsaved/sample): research from the supplied clues only.
  if (body.contact && typeof body.contact === 'object') return { contact: body.contact, persisted: false };
  return { contact: null, persisted: false };
}

/**
 * Turn a completed run into the client payload: validates the structured result, computes the empty-fields-only
 * fill and stores the enrichment row. Shared by the polling `status` action and the streamed run.
 */
async function finishRun(user, run, fallbackContact) {
  const result = run.json;
  if (!result) return { status: 'failed', error: 'Model returned no structured result' };

  const meta = run.metadata || {};
  const contactId = meta.contact_id && isValidUUID(meta.contact_id) ? meta.contact_id : null;
  let contact = fallbackContact || {};
  if (contactId) {
    const { data } = await supabase.from('contacts').select('*').eq('id', contactId).eq('user_id', user.id).maybeSingle();
    if (data) contact = data;
  }
  const suggestedUpdates = suggestUpdates(result, contact);

  if (contactId) {
    const { error: insertError } = await supabase.from('contact_enrichments').upsert({
      contact_id: contactId,
      user_id: user.id,
      response_id: run.id,
      status: 'completed',
      matched: !!result.matched,
      confidence: Math.max(0, Math.min(100, Math.round(result.confidence || 0))),
      result,
      citations: run.citations,
      applied_fields: Object.keys(suggestedUpdates),
      model: run.response && run.response.model,
    }, { onConflict: 'response_id' });
    if (insertError) log.warn('Could not persist enrichment', { error: insertError.message });
  }

  return {
    status: 'completed',
    persisted: !!contactId,
    result,
    citations: run.citations,
    sources: run.sources,
    suggestedUpdates,
  };
}

/** Run request shared by the poll and stream paths. */
function runOptions(user, contact, persisted) {
  return {
    role: 'thinking',
    effort: 'medium',
    instructions: INSTRUCTIONS,
    input: `Research this CRM contact and return the structured findings.\n\n${clue(contact)}`,
    schema: ENRICHMENT_SCHEMA,
    schemaName: 'contact_enrichment',
    tools: [{ type: 'web_search', search_context_size: 'medium' }],
    toolChoice: 'required',
    background: true,
    metadata: { user_id: user.id, contact_id: persisted ? contact.id : '', purpose: 'contact_enrichment' },
    user: user.id,
  };
}

/**
 * Streamed enrichment: background run + live events (see _stream/backgroundJob.js). Ends with a `result` event
 * holding exactly what the `status` action returns when completed.
 * opts: { user, contact, persisted, fallbackContact, resume?: { responseId, startingAfter }, deps? }
 */
function enrichmentEvents(opts) {
  const { user, resume } = opts;
  const options = runOptions(user, opts.contact || {}, opts.persisted);
  return streamBackgroundJob({
    user,
    kind: 'contact_enrichment',
    options,
    resume,
    deps: opts.deps,
    warn: (m, e) => log.warn(m, { error: e && e.message }),
    finalize: async (run) => {
      const out = await ((opts.deps && opts.deps.finishRun) || finishRun)(user, run, opts.fallbackContact);
      return out.status === 'completed' ? out : { error: out.error };
    },
  });
}

const handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  try {
    if (body.action === 'status') {
      if (typeof body.responseId !== 'string' || !/^resp_[A-Za-z0-9]+$/.test(body.responseId)) {
        return errorResponse(400, 'responseId is required');
      }
      let job = await getJob(supabase, user.id, body.responseId);
      let run;
      if (job && job.status === 'completed' && job.result && job.result.json) {
        // finished by the webhook: no need to call OpenAI
        run = { id: job.response_id, status: 'completed', json: job.result.json, citations: job.result.citations || [], sources: job.result.sources || [], metadata: job.result.metadata || {}, response: { model: job.result.model } };
      } else if (job && isTerminal(job.status) && job.status !== 'completed') {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ status: 'failed', error: job.error || `Run ${job.status}` }) };
      } else {
        run = await retrieveResponse(body.responseId, { parseJson: true });
        if (!run.metadata || run.metadata.user_id !== user.id) return errorResponse(404, 'Enrichment run not found');
        if (job) await completeJob(supabase, job, run).catch((e) => log.warn('Could not update ai_jobs', { error: e.message }));
      }

      if (run.status === 'queued' || run.status === 'in_progress') {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ status: run.status }) };
      }
      if (run.status !== 'completed') {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ status: 'failed', error: (run.error && run.error.message) || `Run ${run.status}` }) };
      }

      const out = await finishRun(user, run, body.contact);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(out) };
    }

    // action === 'start' (default)
    if (isStreamRequested(event, body) && body.resume && typeof body.resume.responseId === 'string') {
      if (!/^resp_[A-Za-z0-9]+$/.test(body.resume.responseId)) return errorResponse(400, 'responseId is required');
      if (!(await loadOwnedRun(user, body.resume.responseId))) return errorResponse(404, 'Enrichment run not found');
      const startingAfter = Number.isInteger(body.resume.startingAfter) ? body.resume.startingAfter : undefined;
      const readable = toSseReadable(enrichmentEvents({ user, fallbackContact: body.contact, resume: { responseId: body.resume.responseId, startingAfter } }));
      return { statusCode: 200, headers: { ...CORS_HEADERS, ...SSE_HEADERS }, body: readable };
    }

    const { contact, persisted } = await loadContact(user.id, body);
    if (!contact) return errorResponse(404, 'Contact not found');
    const hasClue = contact.email || contact.name || contact.firstName || contact.firstname || contact.company;
    if (!hasClue) return errorResponse(400, 'Contact needs at least a name, email or company to research');

    if (isStreamRequested(event, body)) {
      const readable = toSseReadable(enrichmentEvents({ user, contact, persisted, fallbackContact: body.contact }));
      return { statusCode: 200, headers: { ...CORS_HEADERS, ...SSE_HEADERS }, body: readable };
    }

    const started = await createResponse(runOptions(user, contact, persisted));

    await createJob(supabase, { userId: user.id, kind: 'contact_enrichment', responseId: started.id, status: started.status || 'queued' });

    log.info('Enrichment started', { contactId: persisted ? contact.id : null, responseId: started.id, model: resolveModel('thinking').model });
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ responseId: started.id, status: started.status || 'queued' }) };
  } catch (error) {
    log.error('Contact enrichment failed', { error: error.message });
    return errorResponse(500, 'Contact enrichment failed');
  }
});

exports.handler = stream(handler);
// un-wrapped handler (plain event -> response) for tests and local callers
exports.rawHandler = handler;

// exported for tests
exports._internals = { suggestUpdates, clue, ENRICHMENT_SCHEMA, parseJson, enrichmentEvents, finishRun, runOptions };
