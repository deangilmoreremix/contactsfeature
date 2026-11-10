/**
 * Contact enrichment via the OpenAI Responses API `web_search` tool.
 *
 * POST { action: 'start', contactId | contact }  -> { responseId, status }
 * POST { action: 'status', responseId }          -> { status, result?, citations?, suggestedUpdates? }
 *
 * Web research with a reasoning model can exceed Netlify's sync function limit, so the
 * run is started in Responses background mode and polled by the client.
 * Only publicly available professional information is requested; nothing is guessed.
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { isValidUUID, parseBody, sanitizeString } = require('./_validation');
const { createLogger, generateCorrelationId } = require('./_logger');
const { createResponse, retrieveResponse, parseJson, resolveModel } = require('./_responses');

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

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());
  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  try {
    if (body.action === 'status') {
      if (typeof body.responseId !== 'string' || !/^resp_[A-Za-z0-9]+$/.test(body.responseId)) {
        return errorResponse(400, 'responseId is required');
      }
      const run = await retrieveResponse(body.responseId, { parseJson: true });
      if (!run.metadata || run.metadata.user_id !== user.id) return errorResponse(404, 'Enrichment run not found');

      if (run.status === 'queued' || run.status === 'in_progress') {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ status: run.status }) };
      }
      if (run.status !== 'completed') {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ status: 'failed', error: (run.error && run.error.message) || `Run ${run.status}` }) };
      }

      const result = run.json;
      if (!result) return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ status: 'failed', error: 'Model returned no structured result' }) };

      const contactId = run.metadata.contact_id && isValidUUID(run.metadata.contact_id) ? run.metadata.contact_id : null;
      let contact = body.contact || {};
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
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'completed',
          persisted: !!contactId,
          result,
          citations: run.citations,
          sources: run.sources,
          suggestedUpdates,
        }),
      };
    }

    // action === 'start' (default)
    const { contact, persisted } = await loadContact(user.id, body);
    if (!contact) return errorResponse(404, 'Contact not found');
    const hasClue = contact.email || contact.name || contact.firstName || contact.firstname || contact.company;
    if (!hasClue) return errorResponse(400, 'Contact needs at least a name, email or company to research');

    const started = await createResponse({
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
    });

    log.info('Enrichment started', { contactId: persisted ? contact.id : null, responseId: started.id, model: resolveModel('thinking').model });
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ responseId: started.id, status: started.status || 'queued' }) };
  } catch (error) {
    log.error('Contact enrichment failed', { error: error.message });
    return errorResponse(500, 'Contact enrichment failed');
  }
});

// exported for tests
exports._internals = { suggestUpdates, clue, ENRICHMENT_SCHEMA, parseJson };
