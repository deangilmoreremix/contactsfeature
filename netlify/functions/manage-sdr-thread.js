/**
 * Netlify Function: SDR conversation threads backed by OpenAI server-side Conversations.
 * POST { action: 'getOrCreate', leadId } -> { threadId }   (threadId is a real `conv_...` id)
 * POST { action: 'cleanup', daysOld? }   -> { cleaned }     (deletes the caller's stale threads + conversations)
 *
 * Authenticated: the lead must belong to the caller, and cleanup only touches the caller's own leads.
 * agent_threads.thread_id holds the Conversation id; pass it as `conversationId` to the SDR agents /
 * ai-respond so each turn continues the same server-side thread.
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { createConversation, deleteConversation } = require('./_responses');
const { isValidUUID } = require('./_validation');

const json = (statusCode, body) => ({ statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) });

async function assertOwnsLead(userId, leadId) {
  const { data, error } = await supabase.from('contacts').select('id').eq('id', leadId).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`Database error: ${error.message}`);
  return !!data;
}

async function getOrCreateThread(userId, leadId, deps = {}) {
  const create = deps.createConversation || createConversation;
  const { data: existingThread } = await supabase
    .from('agent_threads')
    .select('thread_id')
    .eq('lead_id', leadId)
    .eq('agent_type', 'sdr_autopilot')
    .maybeSingle();

  // Only reuse real conversation ids; legacy rows hold a local `conv_<uuid>` key that the API does not know.
  if (existingThread && existingThread.thread_id && !isLegacyLocalId(existingThread.thread_id)) {
    return existingThread.thread_id;
  }

  const conversation = await create({ metadata: { user_id: userId, lead_id: leadId, agent_type: 'sdr_autopilot' } });
  const now = new Date().toISOString();

  if (existingThread) {
    const { error } = await supabase.from('agent_threads')
      .update({ thread_id: conversation.id, updated_at: now })
      .eq('lead_id', leadId).eq('agent_type', 'sdr_autopilot');
    if (error) throw new Error(`Failed to store thread reference: ${error.message}`);
    return conversation.id;
  }

  const { error: insertError } = await supabase
    .from('agent_threads')
    .insert({ lead_id: leadId, thread_id: conversation.id, agent_type: 'sdr_autopilot', created_at: now, updated_at: now });
  if (insertError) {
    // Lost a race with another request: drop our conversation and use the winner's.
    await (deps.deleteConversation || deleteConversation)(conversation.id).catch(() => {});
    const { data: winner } = await supabase.from('agent_threads').select('thread_id')
      .eq('lead_id', leadId).eq('agent_type', 'sdr_autopilot').maybeSingle();
    if (winner && winner.thread_id) return winner.thread_id;
    throw new Error(`Failed to store thread reference: ${insertError.message}`);
  }
  return conversation.id;
}

// OpenAI conversation ids look like conv_<24+ hex>; the old local keys were conv_<uuid with dashes>.
function isLegacyLocalId(id) {
  return /^conv_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function cleanupOldThreads(userId, daysOld, deps = {}) {
  const remove = deps.deleteConversation || deleteConversation;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data: leads, error: leadErr } = await supabase.from('contacts').select('id').eq('user_id', userId);
  if (leadErr) throw new Error(`Failed to fetch leads: ${leadErr.message}`);
  const leadIds = (leads || []).map((l) => l.id);
  if (!leadIds.length) return 0;

  const { data: oldThreads, error: fetchError } = await supabase
    .from('agent_threads')
    .select('id, thread_id')
    .eq('agent_type', 'sdr_autopilot')
    .in('lead_id', leadIds)
    .lt('updated_at', cutoffDate.toISOString());
  if (fetchError) throw new Error(`Failed to fetch old threads: ${fetchError.message}`);
  if (!oldThreads || oldThreads.length === 0) return 0;

  const deletable = [];
  for (const thread of oldThreads) {
    if (!isLegacyLocalId(thread.thread_id) && /^conv_/.test(thread.thread_id || '')) {
      try { await remove(thread.thread_id); } catch (err) {
        // keep the row so a later cleanup can retry; never orphan a live conversation silently
        console.warn('[manage-sdr-thread] could not delete conversation', thread.thread_id, err && err.message);
        continue;
      }
    }
    deletable.push(thread.id);
  }
  if (!deletable.length) return 0;

  const { error: deleteError } = await supabase.from('agent_threads').delete().in('id', deletable);
  if (deleteError) throw new Error(`Failed to delete old threads: ${deleteError.message}`);
  return deletable.length;
}

exports.handler = withAuth(async (event, user) => {
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }
  const { action, leadId } = body;

  try {
    if (action === 'getOrCreate') {
      if (!leadId || !isValidUUID(leadId)) return errorResponse(400, 'leadId is required');
      if (!(await assertOwnsLead(user.id, leadId))) return errorResponse(404, 'Lead not found');
      const threadId = await getOrCreateThread(user.id, leadId);
      return json(200, { threadId });
    }

    if (action === 'cleanup') {
      const days = Math.max(1, Math.min(3650, Number(body.daysOld) || 90));
      return json(200, { cleaned: await cleanupOldThreads(user.id, days) });
    }

    return errorResponse(400, 'Invalid action. Use "getOrCreate" or "cleanup".');
  } catch (err) {
    console.error('[manage-sdr-thread] error:', err);
    return errorResponse(500, 'Thread management failed');
  }
});

exports._internals = { getOrCreateThread, cleanupOldThreads, isLegacyLocalId };
