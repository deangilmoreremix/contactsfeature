const { supabase } = require('./_supabaseClient');
const { openai } = require('./_aiClients');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

async function getOrCreateThread(leadId) {
  const { data: existingThread } = await supabase
    .from('agent_threads')
    .select('thread_id')
    .eq('lead_id', leadId)
    .eq('agent_type', 'sdr_autopilot')
    .maybeSingle();

  if (existingThread) {
    return existingThread.thread_id;
  }

  const thread = await openai.beta.threads.create();

  const { error: insertError } = await supabase
    .from('agent_threads')
    .insert({
      lead_id: leadId,
      thread_id: thread.id,
      agent_type: 'sdr_autopilot',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (insertError) {
    throw new Error(`Failed to store thread reference: ${insertError.message}`);
  }

  return thread.id;
}

async function cleanupOldThreads(daysOld) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data: oldThreads, error: fetchError } = await supabase
    .from('agent_threads')
    .select('thread_id')
    .eq('agent_type', 'sdr_autopilot')
    .lt('updated_at', cutoffDate.toISOString());

  if (fetchError) {
    throw new Error(`Failed to fetch old threads: ${fetchError.message}`);
  }

  if (!oldThreads || oldThreads.length === 0) {
    return 0;
  }

  for (const thread of oldThreads) {
    try {
      await openai.beta.threads.del(thread.thread_id);
    } catch (_deleteErr) {
      // threads may auto-expire
    }
  }

  const { error: deleteError } = await supabase
    .from('agent_threads')
    .delete()
    .eq('agent_type', 'sdr_autopilot')
    .lt('updated_at', cutoffDate.toISOString());

  if (deleteError) {
    throw new Error(`Failed to delete old threads: ${deleteError.message}`);
  }

  return oldThreads.length;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, leadId, daysOld } = body;

    if (action === 'getOrCreate') {
      if (!leadId) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'leadId is required' }) };
      }
      const threadId = await getOrCreateThread(leadId);
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ threadId }) };
    }

    if (action === 'cleanup') {
      const count = await cleanupOldThreads(daysOld || 90);
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ cleaned: count }) };
    }

    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid action. Use "getOrCreate" or "cleanup".' }) };
  } catch (err) {
    console.error('[manage-sdr-thread] error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Thread management failed', details: err.message })
    };
  }
};
