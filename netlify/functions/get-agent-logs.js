const { supabase } = require('./_supabaseClient');
const { withGetAuth } = require('./_getAuth');
const { CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId } = require('./_validation');

/** GET ?contactId=<uuid> -> { logs: [{ message, level, created_at }] } (newest first, own rows only) */
exports.handler = withGetAuth(async (event, user) => {
  const contactId = event.queryStringParameters?.contactId;
  const bad = validateContactId(contactId);
  if (bad) return errorResponse(400, bad);
  const { data, error } = await supabase
    .from('agent_logs').select('message,level,agent_type,created_at')
    .eq('contact_id', contactId).eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(100);
  if (error) return errorResponse(500, 'Could not load logs');
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ logs: data || [] }) };
});
