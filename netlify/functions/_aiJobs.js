/**
 * ai_jobs helpers: track OpenAI background responses so openai-webhook can finish them and the
 * status endpoints can read the stored result (falling back to polling when no webhook arrived).
 *
 * Every function takes the (service-role) Supabase client as `db` so tests can pass a stub.
 */
const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'incomplete']);
const KNOWN_STATUS = new Set(['queued', 'in_progress', ...TERMINAL]);

const isTerminal = (status) => TERMINAL.has(status);

/** Insert (or refresh) the job row for a freshly started background response. */
async function createJob(db, { userId, kind, responseId, status = 'queued', context }) {
  if (!userId || !kind || !responseId) return null;
  const { data, error } = await db.from('ai_jobs').upsert({
    user_id: userId,
    kind,
    response_id: responseId,
    status: KNOWN_STATUS.has(status) ? status : 'queued',
    ...(context ? { result: { context } } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'response_id', ignoreDuplicates: true }).select('*').maybeSingle();
  if (error) {
    console.warn('[ai_jobs] could not create job:', error.message);
    return null;
  }
  return data || null;
}

/** The caller's job row for a response id (null when none / not theirs). */
async function getJob(db, userId, responseId) {
  const { data, error } = await db.from('ai_jobs').select('*')
    .eq('response_id', responseId).eq('user_id', userId).maybeSingle();
  return error ? null : data || null;
}

/** Job row by response id regardless of owner (webhook path). */
async function getJobByResponseId(db, responseId) {
  const { data, error } = await db.from('ai_jobs').select('*').eq('response_id', responseId).maybeSingle();
  if (error) throw new Error(`ai_jobs lookup failed: ${error.message}`);
  return data || null;
}

/** Default result shape for a finished run. */
function defaultResult(run) {
  return {
    json: run.json || null,
    ...(run.json ? {} : { text: run.text || '' }),
    citations: run.citations || [],
    sources: run.sources || [],
    model: (run.response && run.response.model) || null,
    metadata: run.metadata || {},
  };
}

/**
 * Per-kind completion hooks. `transform(run, job)` returns the stored result (pure);
 * `onComplete(db, job, result)` runs once, only for the caller that actually completed the row.
 * Required lazily to avoid a require cycle with the function modules.
 */
const KINDS = {
  contact_enrichment: {},
  deal_health: {
    transform(run) {
      const { normalizeHealth } = require('./_dealHealth');
      return run.json ? { health: normalizeHealth(run.json) } : null;
    },
    async onComplete(db, job, result) {
      const health = result && result.health;
      const dealId = job.result && job.result.context && job.result.context.dealId;
      if (!health || !dealId) return;
      const { error } = await db.from('deal_health_analyses').insert({
        user_id: job.user_id, deal_id: dealId, analysis_depth: 'standard',
        health_score: health.healthScore, risk_level: health.riskLevel, result: health,
      });
      if (error) console.warn('[ai_jobs] could not store deal health analysis:', error.message);
    },
  },
  sales_forecast: {
    transform(run) { return run.json ? { forecast: run.json } : null; },
    async onComplete(db, job, result) {
      const stats = job.result && job.result.context && job.result.context.stats;
      if (!result || !result.forecast || !stats) return;
      const { error } = await db.from('sales_forecasts').insert({
        user_id: job.user_id, timeframe: '90d', deal_count: stats.dealCount, result: { stats, forecast: result.forecast },
      });
      if (error) console.warn('[ai_jobs] could not store sales forecast:', error.message);
    },
  },
};

/**
 * Idempotently finish a job from a retrieved response (`run` from _responses.retrieveResponse).
 * Only the caller whose conditional UPDATE flips the row out of queued/in_progress runs onComplete,
 * so webhook redeliveries and poll/webhook races never double-write.
 * Returns { job, changed }.
 */
async function completeJob(db, job, run) {
  if (!job) return { job: null, changed: false };
  if (isTerminal(job.status)) return { job, changed: false };

  const status = KNOWN_STATUS.has(run.status) ? run.status : 'failed';
  if (!isTerminal(status)) {
    // still running: just record progress
    if (status !== job.status) {
      await db.from('ai_jobs').update({ status, updated_at: new Date().toISOString() })
        .eq('response_id', job.response_id).in('status', ['queued', 'in_progress']);
    }
    return { job: { ...job, status }, changed: false };
  }

  const kind = KINDS[job.kind] || {};
  let result = null;
  let error = null;
  let finalStatus = status;
  if (status === 'completed') {
    const base = defaultResult(run);
    const extra = kind.transform ? kind.transform(run, job) : null;
    if (kind.transform && !extra) { finalStatus = 'failed'; error = 'Model returned no structured result'; }
    else result = { ...base, ...(extra || {}), context: job.result && job.result.context };
  } else {
    error = (run.error && run.error.message)
      || (run.response && run.response.incomplete_details && run.response.incomplete_details.reason)
      || `Run ${status}`;
  }

  const now = new Date().toISOString();
  const { data: won, error: updErr } = await db.from('ai_jobs').update({
    status: finalStatus, result, error, updated_at: now, completed_at: now,
  }).eq('response_id', job.response_id).in('status', ['queued', 'in_progress']).select('*');
  if (updErr) throw new Error(`ai_jobs update failed: ${updErr.message}`);

  const updated = Array.isArray(won) ? won[0] : won;
  if (!updated) {
    // someone else finished it first
    return { job: (await getJobByResponseId(db, job.response_id)) || job, changed: false };
  }
  if (finalStatus === 'completed' && kind.onComplete) {
    try { await kind.onComplete(db, job, result); } catch (e) { console.warn('[ai_jobs] onComplete failed:', e && e.message); }
  }
  return { job: updated, changed: true };
}

/**
 * Resolve a job for a status endpoint: read the ai_jobs row (kept fresh by openai-webhook) and, when it
 * is still open, poll the response once and finish the row (the fallback when no webhook arrived).
 * Returns the up-to-date row or null when the caller has no such job.
 */
async function resolveJob(db, userId, responseId, retrieve) {
  let job = await getJob(db, userId, responseId);
  if (!job || isTerminal(job.status)) return job;
  const run = await retrieve(responseId, { parseJson: true });
  if (run.metadata && run.metadata.user_id && run.metadata.user_id !== userId) return null;
  const out = await completeJob(db, job, run);
  return out.job || job;
}

module.exports = { resolveJob, createJob, getJob, getJobByResponseId, completeJob, isTerminal, defaultResult, KINDS, TERMINAL };
