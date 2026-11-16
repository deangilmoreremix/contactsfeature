const { supabase } = require('./_supabaseClient');
const { withGetAuth } = require('./_getAuth');
const { CORS_HEADERS, errorResponse } = require('./_auth');

/** GET -> { agents: [{ id, name }] } enabled outbound agents from the shared catalogue. */
exports.handler = withGetAuth(async () => {
  const { data, error } = await supabase.from('outbound_agents').select('key,name').eq('enabled', true).order('name');
  if (error) return errorResponse(500, 'Could not load agents');
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ agents: (data || []).map((a) => ({ id: a.key, name: a.name })) }) };
});
