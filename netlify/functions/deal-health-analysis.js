/**
 * Deal health analysis (OpenAI Responses API, strict JSON schema).
 * POST { dealId }  ->  { success, data: { healthScore, riskLevel, indicators, risks, recommendations, nextActions, dataGaps }, model }
 * POST { dealId, background: true } -> { success, background: true, responseId, status }   (ai_jobs row; finished by openai-webhook)
 * POST { action: 'status', responseId } -> { success, status, data? }  (reads ai_jobs, polls OpenAI as the fallback)
 *
 * Dual mode (docs/STREAMING.md): add `stream:true` (or Accept: text/event-stream) to any start request and the same
 * handler answers with SSE: the health score / indicators / recommendations fill in as the model writes them, then a
 * `result` event carries exactly the JSON the plain mode returns. `background:true` + `stream:true` streams a
 * background run (ai_jobs row written when the response id is known); `resume:{responseId,startingAfter}` re-attaches.
 *
 * The deal and its contact are re-read with the caller's own Supabase session (RLS), so the client
 * cannot ask for an analysis of someone else's deal or feed the model made-up facts.
 */
const { stream } = require('@netlify/functions');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { getUserClient, supabase } = require('./_supabaseClient');
const { createResponse, retrieveResponse, parseJson } = require('./_responses');
const { createJob, resolveJob } = require('./_aiJobs');
const { runDual, isStreamRequested } = require('./_stream/dual');
const { SSE_HEADERS, toSseReadable } = require('./_stream/sse');
const { streamBackgroundJob, loadOwnedRun } = require('./_stream/backgroundJob');
const { buildDealFacts, normalizeHealth, HEALTH_SCHEMA, INSTRUCTIONS } = require('./_dealHealth');

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

  const wantsStream = isStreamRequested(event, body);
  const sse = (events) => ({ statusCode: 200, headers: { ...CORS_HEADERS, ...SSE_HEADERS }, body: toSseReadable(events) });
  const finalizeRun = (run, ctx) => {
    if (!run.json) return { error: 'Model returned no structured output' };
    return { success: true, data: normalizeHealth(run.json), facts: ctx && ctx.facts, analyzedAt: new Date().toISOString() };
  };

  if (wantsStream && body.resume && typeof body.resume.responseId === 'string') {
    if (!(await loadOwnedRun(user, body.resume.responseId))) return errorResponse(404, 'Analysis run not found');
    const startingAfter = Number.isInteger(body.resume.startingAfter) ? body.resume.startingAfter : undefined;
    return sse(streamBackgroundJob({
      user, kind: 'deal_health', options: { schema: HEALTH_SCHEMA }, resume: { responseId: body.resume.responseId, startingAfter }, finalize: finalizeRun,
    }));
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

  if (body.background === true && wantsStream) {
    return sse(streamBackgroundJob({
      user, kind: 'deal_health',
      options: { ...request, metadata: { user_id: user.id, deal_id: deal.id, purpose: 'deal_health' } },
      context: { dealId: deal.id, facts },
      finalize: finalizeRun, // ai_jobs onComplete (kind deal_health) stores the analysis row
    }));
  }

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

  try {
    return await runDual({
      event, body, options: request,
      finalize: async (text) => {
        const json = parseJson(text);
        if (!json) throw new Error('Model returned no structured output');
        const result = normalizeHealth(json);
        const { error: saveErr } = await db.from('deal_health_analyses').insert({
          user_id: user.id,
          deal_id: deal.id,
          analysis_depth: 'standard',
          health_score: result.healthScore,
          risk_level: result.riskLevel,
          result,
        });
        if (saveErr) console.warn('deal-health-analysis: could not store analysis:', saveErr.message);
        return { success: true, data: result, facts, analyzedAt: new Date().toISOString() };
      },
    });
  } catch (err) {
    console.error('deal-health-analysis failed:', err && err.message);
    return errorResponse(502, 'AI analysis is unavailable right now. Please try again.');
  }
});

module.exports = { handler: stream(handler), rawHandler: handler, buildDealFacts, normalizeHealth, HEALTH_SCHEMA };
