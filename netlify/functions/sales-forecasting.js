/**
 * Pipeline forecast narrative (OpenAI Responses API, strict JSON schema).
 * POST { deals: [{id,stage,value,created_at,updated_at,closed_at}], timeframe? }
 *
 * Numbers (pipeline value, weighted value, win rate, cycle, monthly won revenue) are computed
 * deterministically here from the supplied deals; the model only interprets them and proposes
 * a projection range + insights. With too little data it is not called at all.
 * { background: true } starts a Responses background run tracked in ai_jobs (finished by openai-webhook) and
 * returns { responseId }; { action: 'status', responseId } reads the job (polling OpenAI as the fallback).
 *
 * Dual mode (docs/STREAMING.md): `stream:true` (or Accept: text/event-stream) answers with SSE, the projection range,
 * insights and actions filling in as the model writes them, then a `result` event with exactly the JSON the plain mode
 * returns. `background:true` + `stream:true` streams a background run (ai_jobs row), `resume:{responseId,startingAfter}`
 * re-attaches after a dropped connection. With too little data the AI is not called and the JSON reply is returned.
 */
const { stream } = require('@netlify/functions');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { getUserClient, supabase } = require('./_supabaseClient');
const { createResponse, retrieveResponse, parseJson } = require('./_responses');
const { createJob, resolveJob } = require('./_aiJobs');
const { runDual, isStreamRequested } = require('./_stream/dual');
const { SSE_HEADERS, toSseReadable } = require('./_stream/sse');
const { streamBackgroundJob, loadOwnedRun } = require('./_stream/backgroundJob');

const MAX_DEALS = 500;
const MIN_CLOSED_FOR_FORECAST = 3;
const DAY_MS = 86400000;
const STAGE_PROB = { lead: 0.1, prospect: 0.1, new: 0.1, contacted: 0.15, qualified: 0.25, discovery: 0.25, meeting: 0.35, demo: 0.4, proposal: 0.5, negotiation: 0.75, contract: 0.85 };

const FORECAST_SCHEMA = {
  type: 'object',
  properties: {
    projectedWonNext90Days: {
      type: 'object',
      properties: { low: { type: 'number' }, expected: { type: 'number' }, high: { type: 'number' } },
    },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    insights: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    recommendedActions: { type: 'array', items: { type: 'string' } },
    caveats: { type: 'array', items: { type: 'string' } },
  },
};

const num = (v) => { const n = typeof v === 'string' ? parseFloat(v) : v; return Number.isFinite(n) && n > 0 ? n : 0; };
const time = (v) => { const t = v ? Date.parse(v) : NaN; return Number.isNaN(t) ? null : t; };

function kindOf(stage) {
  const k = String(stage || 'lead').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (/(^|_)lost($|_)/.test(k)) return { key: 'lost', kind: 'lost' };
  if (/(^|_)won($|_)/.test(k) || k === 'customer') return { key: 'won', kind: 'won' };
  return { key: k.replace(/^closed_/, ''), kind: 'open' };
}

/** Deterministic pipeline statistics from deal rows. */
function summarizeDeals(deals, now = new Date()) {
  let openCount = 0, openValue = 0, weighted = 0, won = 0, lost = 0, wonValue = 0;
  const cycles = [];
  const byMonth = {};
  const stages = {};
  for (const d of deals) {
    const { key, kind } = kindOf(d.stage);
    const v = num(d.value);
    if (kind === 'open') {
      openCount++; openValue += v; weighted += v * (STAGE_PROB[key] ?? 0.1);
      stages[key] = stages[key] || { count: 0, value: 0 };
      stages[key].count++; stages[key].value += v;
    } else if (kind === 'lost') lost++;
    else {
      won++; wonValue += v;
      const start = time(d.created_at); const end = time(d.closed_at) ?? time(d.updated_at);
      if (start !== null && end !== null && end >= start) cycles.push((end - start) / DAY_MS);
      if (end !== null) {
        const dt = new Date(end);
        const m = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
        byMonth[m] = (byMonth[m] || 0) + v;
      }
    }
  }
  const closed = won + lost;
  return {
    asOf: now.toISOString().slice(0, 10),
    dealCount: deals.length,
    openCount, openValue: Math.round(openValue), weightedOpenValue: Math.round(weighted),
    wonCount: won, lostCount: lost, wonValue: Math.round(wonValue),
    winRate: closed ? Math.round((won / closed) * 1000) / 1000 : null,
    avgCycleDays: cycles.length ? Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10 : null,
    openByStage: stages,
    wonRevenueByMonth: byMonth,
  };
}

const INSTRUCTIONS =
  'You are a sales forecasting analyst. Use ONLY the pipeline statistics provided; do not invent deals, customers or historical months. ' +
  'Project revenue won over the next 90 days as a low/expected/high range in the deal currency, grounded in weightedOpenValue, winRate, avgCycleDays and wonRevenueByMonth. ' +
  'State caveats whenever data is thin (few closed deals, null win rate or cycle).';

const handler = withAuth(async (event, user) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }

  if (body.action === 'status') {
    if (typeof body.responseId !== 'string' || !/^resp_[A-Za-z0-9]+$/.test(body.responseId)) return errorResponse(400, 'responseId is required');
    try {
      const job = await resolveJob(supabase, user.id, body.responseId, retrieveResponse);
      if (!job || job.kind !== 'sales_forecast') return errorResponse(404, 'Forecast run not found');
      if (job.status === 'completed' && job.result && job.result.forecast) {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: 'completed', data: { stats: job.result.context && job.result.context.stats, forecast: job.result.forecast, reason: null }, generatedAt: job.completed_at }) };
      }
      if (job.status === 'queued' || job.status === 'in_progress') return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: job.status }) };
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: false, status: 'failed', error: job.error || `Run ${job.status}` }) };
    } catch (err) {
      console.error('sales-forecasting status failed:', err && err.message);
      return errorResponse(502, 'Could not check the forecast status');
    }
  }
  const wantsStream = isStreamRequested(event, body);
  const sse = (events) => ({ statusCode: 200, headers: { ...CORS_HEADERS, ...SSE_HEADERS }, body: toSseReadable(events) });
  const finalizeRun = (run, ctx) => {
    if (!run.json) return { error: 'Model returned no structured output' };
    return { success: true, data: { stats: ctx && ctx.stats, forecast: run.json, reason: null }, generatedAt: new Date().toISOString() };
  };
  if (wantsStream && body.resume && typeof body.resume.responseId === 'string') {
    if (!(await loadOwnedRun(user, body.resume.responseId))) return errorResponse(404, 'Forecast run not found');
    const startingAfter = Number.isInteger(body.resume.startingAfter) ? body.resume.startingAfter : undefined;
    return sse(streamBackgroundJob({
      user, kind: 'sales_forecast', options: { schema: FORECAST_SCHEMA }, resume: { responseId: body.resume.responseId, startingAfter }, finalize: finalizeRun,
    }));
  }

  if (!Array.isArray(body.deals)) return errorResponse(400, 'deals array is required');
  if (body.deals.length > MAX_DEALS) return errorResponse(413, `Too many deals (max ${MAX_DEALS})`);

  // Re-read ownership-checked ids so a client can only forecast deals it can see.
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const db = getUserClient(authHeader);
  const ids = body.deals.map((d) => d && d.id).filter((id) => typeof id === 'string');
  let deals = body.deals;
  if (ids.length) {
    const { data, error } = await db.from('deals').select('id,stage,value,created_at,updated_at,closed_at').in('id', ids);
    if (error) return errorResponse(500, 'Could not verify deals');
    deals = data || [];
  }

  const stats = summarizeDeals(deals);
  const closed = stats.wonCount + stats.lostCount;

  if (stats.dealCount === 0 || closed < MIN_CLOSED_FOR_FORECAST) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: { stats, forecast: null, reason: `At least ${MIN_CLOSED_FOR_FORECAST} closed (won or lost) deals are needed for a meaningful AI forecast; you have ${closed}.` },
      }),
    };
  }

  const request = {
    role: 'thinking',
    effort: 'low',
    schemaName: 'sales_forecast',
    schema: FORECAST_SCHEMA,
    user: user.id,
    instructions: INSTRUCTIONS,
    input: `Pipeline statistics (JSON):\n${JSON.stringify(stats)}`,
  };

  if (body.background === true && wantsStream) {
    return sse(streamBackgroundJob({
      user, kind: 'sales_forecast',
      options: { ...request, metadata: { user_id: user.id, purpose: 'sales_forecast' } },
      context: { stats },
      finalize: finalizeRun, // ai_jobs onComplete (kind sales_forecast) stores the forecast row
    }));
  }

  if (body.background === true) {
    try {
      const started = await createResponse({ ...request, background: true, metadata: { user_id: user.id, purpose: 'sales_forecast' } });
      await createJob(supabase, { userId: user.id, kind: 'sales_forecast', responseId: started.id, status: started.status || 'queued', context: { stats } });
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, background: true, responseId: started.id, status: started.status || 'queued' }) };
    } catch (err) {
      console.error('sales-forecasting background start failed:', err && err.message);
      return errorResponse(502, 'AI forecast is unavailable right now. Please try again.');
    }
  }

  try {
    return await runDual({
      event, body, options: request,
      finalize: async (text) => {
        const forecast = parseJson(text);
        if (!forecast) throw new Error('Model returned no structured output');
        const { error: saveErr } = await db.from('sales_forecasts').insert({
          user_id: user.id, timeframe: '90d', deal_count: stats.dealCount, result: { stats, forecast },
        });
        if (saveErr) console.warn('sales-forecasting: could not store forecast:', saveErr.message);
        return { success: true, data: { stats, forecast, reason: null }, generatedAt: new Date().toISOString() };
      },
    });
  } catch (err) {
    console.error('sales-forecasting failed:', err && err.message);
    return errorResponse(502, 'AI forecast is unavailable right now. Please try again.');
  }
});

module.exports = { handler: stream(handler), rawHandler: handler, summarizeDeals, FORECAST_SCHEMA };
