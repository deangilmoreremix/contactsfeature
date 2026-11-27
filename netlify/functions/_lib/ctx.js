/** Owner-checked loaders shared by the panel endpoints (re-uses the ai-task context helpers). */
const { supabase } = require('../_supabaseClient');
const { isValidUUID } = require('../_validation');
const { TaskError, loadContact, describeContact } = require('../_tasks/_ctx');

function requireUuid(value, label) {
  if (typeof value !== 'string' || !isValidUUID(value)) throw new TaskError(400, `${label} must be a valid UUID`);
  return value;
}

/** Caller's contact (404 when missing / not theirs). */
async function ownedContact(user, contactId) {
  return loadContact(user, { contactId }, { allowInline: false });
}

/** Caller's deal by id (404 when missing / not theirs). */
async function ownedDeal(user, dealId) {
  const { data, error } = await supabase.from('deals').select('*').eq('id', dealId).eq('user_id', user.id).maybeSingle();
  if (error) throw new TaskError(500, 'Could not load the deal');
  if (!data) throw new TaskError(404, 'Deal not found');
  return data;
}

/** Most recent deal of the caller's contact (null when there is none). */
async function latestDealForContact(user, contactId) {
  const { data } = await supabase.from('deals').select('*').eq('contact_id', contactId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
  return (data && data[0]) || null;
}

/** agent_memory rows of a contact the caller owns (ownership is checked by the caller via ownedContact first). */
async function memoryRows(contactId) {
  const { data, error } = await supabase.from('agent_memory').select('id,contact_id,memory_type,data,updated_at').eq('contact_id', contactId).order('updated_at', { ascending: false });
  if (error) throw new TaskError(500, 'Could not load agent memory');
  return data || [];
}

module.exports = { requireUuid, ownedContact, ownedDeal, latestDealForContact, memoryRows, describeContact, TaskError };
