/** POST {} -> { batches: [...] } the caller's most recent batch runs (progress counts included). */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');

exports.handler = withAuth(async (_event, user) => {
  const { data, error } = await supabase
    .from('ai_batches')
    .select('id,kind,status,total,completed,failed,error,applied_at,created_at,updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return errorResponse(500, 'Could not load batches');
  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ batches: data || [] }) };
});
