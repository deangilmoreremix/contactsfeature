/**
 * POST { endpoint_id, event?, payload? } (authenticated) -> sends to the caller's own outbound webhook
 * endpoint (https, public hosts only, HMAC-signed when a signing secret is set). Used by the browser
 * automation runner and for "send test".
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { dispatchWebhook } = require('./_automation');

exports.handler = withAuth(async (event, user) => {
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON'); }
  if (!b.endpoint_id) return errorResponse(400, 'endpoint_id is required');
  const { data: ep } = await supabase.from('webhook_endpoints').select('*').eq('id', b.endpoint_id).eq('user_id', user.id).eq('direction', 'outbound').maybeSingle();
  if (!ep) return errorResponse(404, 'Endpoint not found');
  if (!ep.is_active) return errorResponse(409, 'Endpoint is disabled');
  try {
    const r = await dispatchWebhook(ep, String(b.event || 'test'), b.payload || {});
    await supabase.from('webhook_endpoints').update({ last_triggered_at: new Date().toISOString(), last_status: `ok ${r.status}` }).eq('id', ep.id);
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, status: r.status }) };
  } catch (err) {
    await supabase.from('webhook_endpoints').update({ last_triggered_at: new Date().toISOString(), last_status: `failed: ${err.message}`.slice(0, 200) }).eq('id', ep.id);
    return errorResponse(502, err.message);
  }
});
