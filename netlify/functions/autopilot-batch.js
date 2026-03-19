const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { fetchWithTimeout } = require('./_fetchWithRetry');
const { createLogger, generateCorrelationId } = require('./_logger');

const log = createLogger('autopilot-batch');

const BATCH_SIZE = 20;
const CONCURRENCY = 5;

async function triggerAutopilotForContact(contactId, authHeader) {
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
  const response = await fetchWithTimeout(
    `${baseUrl}/.netlify/functions/trigger-autopilot`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ contactId }),
    },
    30000
  );
  return response.json();
}

async function processInChunks(items, fn, concurrency) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const authHeader = event.headers?.authorization || event.headers?.Authorization;

  try {
    const now = new Date().toISOString();

    const { data: dueStates, error: statesError } = await supabase
      .from('autopilot_state')
      .select('id, lead_id, current_stage, follow_up_count, next_action_at, user_id')
      .eq('status', 'active')
      .lte('next_action_at', now)
      .order('next_action_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (statesError) throw new Error(`Failed to query autopilot states: ${statesError.message}`);

    if (!dueStates || dueStates.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ processed: 0, message: 'No contacts due for autopilot action' }),
      };
    }

    let processed = 0;
    let errors = 0;
    const results = [];

    const settled = await processInChunks(
      dueStates,
      async (state) => {
        const result = await triggerAutopilotForContact(state.lead_id, authHeader);
        return { contactId: state.lead_id, result };
      },
      CONCURRENCY
    );

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      const state = dueStates[i];
      if (outcome.status === 'fulfilled') {
        results.push({ contactId: state.lead_id, success: true });
        processed++;
      } else {
        const errMsg = outcome.reason?.message || 'Unknown error';
        results.push({ contactId: state.lead_id, success: false });
        errors++;
        await supabase.from('agent_logs').insert({
          contact_id: state.lead_id,
          user_id: state.user_id,
          agent_type: 'sdr',
          level: 'error',
          message: `Batch autopilot error: ${errMsg}`,
          autopilot_state_id: state.id,
        }).catch(() => {});
      }
    }

    log.info('Batch run complete', { processed, errors, total: dueStates.length });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ processed, errors, total: dueStates.length, results }),
    };
  } catch (err) {
    log.error('Batch autopilot failed', { error: err.message });
    return errorResponse(500, 'Batch autopilot failed');
  }
});
