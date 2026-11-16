/**
 * Netlify Function: list the signed-in user's calendar events in a range (+ optional free slots).
 * GET ?from=&to=&status=  or  POST { from, to, status?, availability?: { count, durationMinutes, timeZone, workStartHour, workEndHour } }
 * Defaults: from = now - 1 day, to = now + 30 days. Events are filtered by user_id.
 */
const { supabase } = require('./_supabaseClient');
const { authenticateRequest, CORS_HEADERS, errorResponse } = require('./_auth');
const { proposeTimes, computeFreeSlots } = require('./_availability');

const CORS = { ...CORS_HEADERS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

function contactName(c) {
  return c.name || `${c.firstname || c.firstName || ''} ${c.lastname || c.lastName || ''}`.trim() || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (!['GET', 'POST'].includes(event.httpMethod)) return errorResponse(405, 'Method not allowed');

  const { user, error: authError } = await authenticateRequest(event);
  if (authError) return authError;

  let params = { ...(event.queryStringParameters || {}) };
  if (event.httpMethod === 'POST') {
    try { params = { ...params, ...JSON.parse(event.body || '{}') }; } catch { return errorResponse(400, 'Invalid JSON body'); }
  }

  const now = Date.now();
  const from = params.from ? new Date(params.from) : new Date(now - 86400000);
  const to = params.to ? new Date(params.to) : new Date(now + 30 * 86400000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return errorResponse(400, 'from/to must be valid dates');

  try {
    let q = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_for', from.toISOString())
      .lte('scheduled_for', to.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(500);
    if (params.status) q = q.eq('status', params.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const events = rows || [];

    const ids = [...new Set(events.map((e) => e.contact_id).filter(Boolean))];
    const byId = {};
    if (ids.length) {
      const { data: cs, error: cErr } = await supabase.from('contacts').select('*').eq('user_id', user.id).in('id', ids);
      if (cErr) throw new Error(cErr.message);
      (cs || []).forEach((c) => { byId[c.id] = { id: c.id, name: contactName(c), email: c.email || null }; });
    }
    const result = events.map((e) => ({ ...e, contacts: e.contact_id ? byId[e.contact_id] || null : null }));

    const body = { events: result };
    if (params.availability) {
      const a = typeof params.availability === 'object' ? params.availability : {};
      const opts = { ...a, from: a.from || new Date().toISOString(), to: a.to || to.toISOString() };
      body.suggestions = proposeTimes(events, opts);
      if (a.allSlots) body.slots = computeFreeSlots(events, opts);
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(body) };
  } catch (e) {
    return errorResponse(500, `Failed to list events: ${e.message}`);
  }
};
