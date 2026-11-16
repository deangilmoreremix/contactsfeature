/**
 * Ownership helpers for handlers that read/write with the service client.
 * Always call BEFORE touching a contact's data; respond 404 (never 403) for foreign ids so ids can't be probed.
 */
const { supabase } = require('./_supabaseClient');
const { isValidUUID } = require('./_validation');

/** Returns the caller's contact row (selected columns) or null when it is missing / not theirs. */
async function getOwnedContact(userId, contactId, columns = 'id') {
  if (!userId || !isValidUUID(contactId)) return null;
  const { data, error } = await supabase
    .from('contacts').select(columns).eq('id', contactId).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(`Database error: ${error.message}`);
  return data || null;
}

module.exports = { getOwnedContact };
