/**
 * Ownership helpers for server-side OpenAI conversations (`conv_...`) stored in agent_threads.
 * A conversation id is only usable by the user who owns the lead (contact) the thread belongs to.
 */
const { supabase } = require('./_supabaseClient');

const CONVERSATION_ID_RE = /^conv_[A-Za-z0-9_-]{4,200}$/;

/** True when `conversationId` is an agent_threads row whose lead belongs to `userId`. */
async function userOwnsConversation(userId, conversationId, db = supabase) {
  if (!userId || typeof conversationId !== 'string' || !CONVERSATION_ID_RE.test(conversationId)) return false;
  const { data: thread, error } = await db
    .from('agent_threads').select('lead_id').eq('thread_id', conversationId).maybeSingle();
  if (error || !thread || !thread.lead_id) return false;
  const { data: contact, error: cErr } = await db
    .from('contacts').select('id').eq('id', thread.lead_id).eq('user_id', userId).maybeSingle();
  return !cErr && !!contact;
}

/** True when `conversationId` is the thread of this specific lead (caller must already own the lead). */
async function conversationBelongsToLead(leadId, conversationId, db = supabase) {
  if (typeof conversationId !== 'string' || !CONVERSATION_ID_RE.test(conversationId)) return false;
  const { data, error } = await db
    .from('agent_threads').select('id').eq('thread_id', conversationId).eq('lead_id', leadId).maybeSingle();
  return !error && !!data;
}

module.exports = { conversationBelongsToLead, userOwnsConversation, CONVERSATION_ID_RE };
