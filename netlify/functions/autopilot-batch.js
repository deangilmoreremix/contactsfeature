const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

const BATCH_SIZE = 20;

async function triggerAutopilotForContact(contactId) {
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
  const response = await fetch(`${baseUrl}/.netlify/functions/trigger-autopilot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId })
  });
  return response.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const now = new Date().toISOString();

    const { data: dueStates, error: statesError } = await supabase
      .from('autopilot_state')
      .select('id, lead_id, current_stage, follow_up_count, next_action_at, user_id')
      .eq('status', 'active')
      .lte('next_action_at', now)
      .order('next_action_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (statesError) {
      throw new Error(`Failed to query autopilot states: ${statesError.message}`);
    }

    if (!dueStates || dueStates.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ processed: 0, message: 'No contacts due for autopilot action' })
      };
    }

    const results = [];
    let processed = 0;
    let errors = 0;

    for (const state of dueStates) {
      try {
        const result = await triggerAutopilotForContact(state.lead_id);
        results.push({ contactId: state.lead_id, success: true, result });
        processed++;
      } catch (err) {
        results.push({ contactId: state.lead_id, success: false, error: err.message });
        errors++;

        await supabase.from('agent_logs').insert({
          contact_id: state.lead_id,
          user_id: state.user_id,
          agent_type: 'sdr',
          level: 'error',
          message: `Batch autopilot error: ${err.message}`,
          autopilot_state_id: state.id
        }).catch(() => {});
      }
    }

    await supabase.from('agent_logs').insert({
      agent_type: 'sdr_batch',
      level: 'info',
      message: `Batch run complete: ${processed} processed, ${errors} errors, ${dueStates.length} total`
    }).catch(() => {});

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        processed,
        errors,
        total: dueStates.length,
        results
      })
    };
  } catch (err) {
    console.error('[autopilot-batch] error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Batch autopilot failed', details: err.message })
    };
  }
};
