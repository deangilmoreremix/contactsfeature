/**
 * Streamed background run with ai_jobs bookkeeping (docs/STREAMING.md "Long jobs").
 *
 * The run is created with `background:true` and streamed; the ai_jobs row is written as soon as the response id is
 * known, so openai-webhook can finish the run (and its onComplete hook) even if the browser disconnects. If the
 * client drops, it re-POSTs with `resume:{responseId,startingAfter}` and this generator re-attaches
 * (`GET /v1/responses/{id}?stream=true&starting_after=N`).
 *
 *   toSseReadable(streamBackgroundJob({ user, kind, options, context, finalize: async (run, ctx) => payload }))
 *
 * Yields the usual UI events plus a `result` event (what `finalize` returns) right before `done`.
 * deps (tests): { streamResponse, retrieveResponse, jobs: { createJob, getJob, completeJob }, db }
 */
const { streamResponse, retrieveResponse } = require('../_responses');
const jobsModule = require('../_aiJobs');

const RESP_ID = /^resp_[A-Za-z0-9]+$/;

/** The caller's run (null when it does not exist or is not theirs). */
async function loadOwnedRun(user, responseId, deps = {}) {
  if (typeof responseId !== 'string' || !RESP_ID.test(responseId)) return null;
  const retrieve = deps.retrieveResponse || retrieveResponse;
  try {
    const run = await retrieve(responseId);
    return run && run.metadata && run.metadata.user_id === user.id ? run : null;
  } catch (_) {
    return null;
  }
}

async function* streamBackgroundJob(opts) {
  const { user, kind, options, resume, context, finalize } = opts;
  const deps = opts.deps || {};
  const streamIt = deps.streamResponse || streamResponse;
  const retrieve = deps.retrieveResponse || retrieveResponse;
  const jobs = deps.jobs || jobsModule;
  const db = deps.db || require('../_supabaseClient').supabase;
  const warn = opts.warn || ((m, e) => console.warn(`[${kind}] ${m}:`, e && e.message));

  const streamOpts = resume
    ? { schema: options.schema, resume }
    : { ...options, background: true };
  let responseId = resume ? resume.responseId : null;

  for await (const ev of streamIt(streamOpts)) {
    if (ev.type === 'status' && ev.id && !responseId) {
      responseId = ev.id;
      try { await jobs.createJob(db, { userId: user.id, kind, responseId, status: 'in_progress', context }); } catch (e) { warn('could not create ai_jobs row', e); }
    }
    if (ev.type === 'done') {
      const id = ev.id || responseId;
      let run = null;
      try { run = await retrieve(id, { parseJson: true }); } catch (_) { /* fall back to the stream's own result */ }
      if (!run || run.status !== 'completed' || !run.json) {
        run = {
          id, status: 'completed', json: ev.json, text: ev.text, citations: ev.citations || [], sources: [],
          metadata: (run && run.metadata) || options.metadata || {}, response: { model: run && run.response && run.response.model },
        };
      }
      try {
        let job = await jobs.getJob(db, user.id, id);
        if (job) {
          const out = await jobs.completeJob(db, job, run).catch((e) => { warn('could not update ai_jobs', e); return null; });
          if (out && out.job) job = out.job;
        }
        const ctx = (job && job.result && job.result.context) || context;
        const payload = await finalize(run, ctx);
        if (!payload || payload.error) { yield { type: 'error', message: (payload && payload.error) || 'Model returned no structured result' }; return; }
        yield { type: 'result', data: payload };
      } catch (err) {
        warn('could not finish streamed run', err);
        yield { type: 'error', message: 'Could not save the result' };
        return;
      }
    }
    yield ev;
    if (ev.type === 'error') return;
  }
}

module.exports = { streamBackgroundJob, loadOwnedRun, RESP_ID };
