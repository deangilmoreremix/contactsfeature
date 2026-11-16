/**
 * Netlify Function: per-contact agent settings (persona, follow-up mode, enabled).
 *  GET  ?contactId=<uuid>                               -> settings row or {} (own contacts only)
 *  POST { contactId, personaId, followupMode?, isEnabled?, notes? } -> upsert
 */
const { supabase } = require('./_supabaseClient');
const { authenticateRequest, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { PERSONA_IDS } = require('./_agents/factory');

const MODES = new Set(['manual', 'reply-only', '2-step', '5-step']);
const ok = (data) => ({ statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(data) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  const { user, error: authError } = await authenticateRequest(event);
  if (authError) return authError;

  const isGet = event.httpMethod === 'GET';
  if (!isGet && event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');

  const body = isGet ? { contactId: event.queryStringParameters?.contactId } : parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');
  const bad = validateContactId(body.contactId);
  if (bad) return errorResponse(400, bad);

  const { data: contact } = await supabase.from('contacts').select('id').eq('id', body.contactId).eq('user_id', user.id).maybeSingle();
  if (!contact) return errorResponse(404, 'Contact not found');

  if (isGet) {
    const { data } = await supabase.from('contact_agent_settings').select('*').eq('contact_id', body.contactId).maybeSingle();
    return ok(data || {});
  }

  if (!PERSONA_IDS.has(body.personaId)) return errorResponse(400, 'Unknown personaId');
  const followupMode = body.followupMode || 'manual';
  if (!MODES.has(followupMode)) return errorResponse(400, 'Invalid followupMode');

  const { data, error } = await supabase.from('contact_agent_settings').upsert({
    contact_id: body.contactId, persona_id: body.personaId, followup_mode: followupMode,
    is_enabled: Boolean(body.isEnabled), notes: body.notes ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: 'contact_id' }).select('*').maybeSingle();
  if (error) return errorResponse(500, 'Could not save settings');
  return ok(data);
};
