/**
 * Deal health analysis (OpenAI Responses API, strict JSON schema).
 * POST { dealId }  ->  { success, data: { healthScore, riskLevel, indicators, risks, recommendations, nextActions, dataGaps }, model }
 * POST { dealId, background: true } -> { success, background: true, responseId, status }   (ai_jobs row; finished by openai-webhook)
 * POST { action: 'status', responseId } -> { success, status, data? }  (reads ai_jobs, polls OpenAI as the fallback)
 *
 * The deal and its contact are re-read with the caller's own Supabase session (RLS), so the client
 * cannot ask for an analysis of someone else's deal or feed the model made-up facts.
 */
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { getUserClient, supabase } = require('./_supabaseClient');
const { createResponse, retrieveResponse } = require('./_responses');
const { createJob, resolveJob } = require('./_aiJobs');

const DAY_MS = 86400000;

const HEALTH_SCHEMA = {
  type: 'object',
  properties: {
    healthScore: { type: 'number', description: '0-100, higher is healthier' },
    riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    indicators: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          score: { type: 'number', description: '0-100' },
          status: { type: 'string', enum: ['good', 'warning', 'critical'] },
          rationale: { type: 'string', description: 'One sentence citing the supplied facts' },
        },
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          factor: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          mitigation: { type: 'string' },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
    nextActions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          timeline: { type: 'string' },
        },
      },
    },
    dataGaps: { type: 'array', items: { type: 'string' }, description: 'Important facts that are missing and would change the assessment' },
  },
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(n)) ? Number(n) : lo));

/** Facts handed to the model; computed from DB rows only. */
function buildDealFacts(deal, contact, now = new Date()) {
  const t = (v) => { const x = v ? Date.parse(v) : NaN; return Number.isNaN(x) ? null : x; };
  const created = t(deal.created_at);
  const updated = t(deal.updated_at);
  const expected = t(deal.expected_close_date);
  const days = (ms) => (ms === null ? null : Math.round(ms / DAY_MS));
  return {
    title: deal.title || null,
    stage: deal.stage || null,
    value: Number(deal.value) || 0,
    ageDays: created === null ? null : days(now.getTime() - created),
    daysSinceLastUpdate: updated === null ? null : days(now.getTime() - updated),
    daysUntilExpectedClose: expected === null ? null : days(expected - now.getTime()),
    stageStagnationDays: deal.stage_stagnation ?? null,
    daysSinceContactReplied: deal.days_since_reply ?? null,
    objectionLevel0to10: deal.objection_level ?? null,
    storedRiskScore: deal.risk_score ?? null,
    contact: contact
      ? {
          name: contact.name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null,
          company: contact.company || null,
          title: contact.title || null,
          status: contact.status || null,
          interestLevel: contact.interest_level || contact.interestLevel || null,
        }
      : null,
  };
}

/** Clamp model output into the ranges the UI expects. */
function normalizeHealth(raw) {
  const r = raw || {};
  const score = clamp(r.healthScore, 0, 100);
  return {
    healthScore: Math.round(score),
    riskLevel: ['low', 'medium', 'high', 'critical'].includes(r.riskLevel) ? r.riskLevel : (score >= 75 ? 'low' : score >= 55 ? 'medium' : score >= 35 ? 'high' : 'critical'),
    indicators: (r.indicators || []).slice(0, 8).map((i) => ({
      name: String(i.name || ''), score: Math.round(clamp(i.score, 0, 100)),
      status: ['good', 'warning', 'critical'].includes(i.status) ? i.status : 'warning', rationale: String(i.rationale || ''),
    })),
    risks: (r.risks || []).slice(0, 8),
    recommendations: (r.recommendations || []).slice(0, 8).map(String),
    nextActions: (r.nextActions || []).slice(0, 8),
    dataGaps: (r.dataGaps || []).slice(0, 8).map(String),
  };
}

const INSTRUCTIONS =
  'You are a sales deal-health analyst. Assess ONLY from the JSON facts provided. ' +
  'Never invent stakeholders, competitors, budgets, meetings or emails. If a fact is null or missing, do not guess it: ' +
  'list it under dataGaps and lower your confidence instead. Cite the supplied numbers in each indicator rationale. ' +
  'Give 3-5 indicators, concrete recommendations and next actions the seller can do this week.';

const handler = withAuth(async (event, user) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }
  if (body.action === 'status') {
    if (typeof body.responseId !== 'string' || !/^resp_[A-Za-z0-9]+$/.test(body.responseId)) return errorResponse(400, 'responseId is required');
    try {
      const job = await resolveJob(supabase, user.id, body.responseId, retrieveResponse);
      if (!job || job.kind !== 'deal_health') return errorResponse(404, 'Analysis run not found');
      if (job.status === 'completed' && job.result && job.result.health) {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: 'completed', data: job.result.health, facts: job.result.context && job.result.context.facts, analyzedAt: job.completed_at }) };
      }
      if (job.status === 'queued' || job.status === 'in_progress') return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: job.status }) };
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: false, status: 'failed', error: job.error || `Run ${job.status}` }) };
    } catch (err) {
      console.error('deal-health-analysis status failed:', err && err.message);
      return errorResponse(502, 'Could not check the analysis status');
    }
  }

  const dealId = typeof body.dealId === 'string' ? body.dealId : '';
  if (!/^[0-9a-f-]{36}$/i.test(dealId)) return errorResponse(400, 'dealId is required');

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const db = getUserClient(authHeader);

  const { data: deal, error: dealErr } = await db.from('deals').select('*').eq('id', dealId).maybeSingle();
  if (dealErr) return errorResponse(500, 'Could not load deal');
  if (!deal) return errorResponse(404, 'Deal not found');

  let contact = null;
  if (deal.contact_id) {
    const { data } = await db.from('contacts').select('*').eq('id', deal.contact_id).maybeSingle();
    contact = data || null;
  }

  const facts = buildDealFacts(deal, contact);

  const request = {
    role: 'thinking',
    effort: 'low',
    schemaName: 'deal_health_analysis',
    schema: HEALTH_SCHEMA,
    user: user.id,
    instructions: INSTRUCTIONS,
    input: `Deal facts (JSON):\n${JSON.stringify(facts)}`,
  };

  if (body.background === true) {
    try {
      const started = await createResponse({ ...request, background: true, metadata: { user_id: user.id, deal_id: deal.id, purpose: 'deal_health' } });
      await createJob(supabase, { userId: user.id, kind: 'deal_health', responseId: started.id, status: started.status || 'queued', context: { dealId: deal.id, facts } });
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, background: true, responseId: started.id, status: started.status || 'queued' }) };
    } catch (err) {
      console.error('deal-health-analysis background start failed:', err && err.message);
      return errorResponse(502, 'AI analysis is unavailable right now. Please try again.');
    }
  }

  let result;
  try {
    const out = await createResponse(request);
    if (!out.json) throw new Error('Model returned no structured output');
    result = normalizeHealth(out.json);
  } catch (err) {
    console.error('deal-health-analysis failed:', err && err.message);
    return errorResponse(502, 'AI analysis is unavailable right now. Please try again.');
  }

  const { error: saveErr } = await db.from('deal_health_analyses').insert({
    user_id: user.id,
    deal_id: deal.id,
    analysis_depth: 'standard',
    health_score: result.healthScore,
    risk_level: result.riskLevel,
    result,
  });
  if (saveErr) console.warn('deal-health-analysis: could not store analysis:', saveErr.message);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, data: result, facts, analyzedAt: new Date().toISOString() }),
  };
});

module.exports = { handler, buildDealFacts, normalizeHealth, HEALTH_SCHEMA };
