/**
 * Netlify Function: list the signed-in user's calendar events in a range (+ optional free slots).
 * GET ?from=&to=&status=&contactId=  or  POST { from, to, status?, contactId?, availability?: { count, durationMinutes, timeZone, workStartHour, workEndHour } }
 * Defaults: from = now - 1 day, to = now + 30 days. Events are filtered by user_id.
 * contactId (optional) narrows the list to one contact's events; the contact must belong to the caller (404 otherwise).
 * Availability suggestions always consider ALL of the caller's events, never just the filtered contact's.
 */
const { supabase } = require('./_supabaseClient');
const { authenticateRequest, CORS_HEADERS, errorResponse } = require('./_auth');
const { proposeTimes, computeFreeSlots } = require('./_availability');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  const contactId = params.contactId || null;
  if (contactId && !UUID_RE.test(contactId)) return errorResponse(400, 'contactId must be a valid id');

  try {
    if (contactId) {
      const { data: owned, error: ownErr } = await supabase.from('contacts').select('id').eq('id', contactId).eq('user_id', user.id).maybeSingle();
      if (ownErr) throw new Error(ownErr.message);
      if (!owned) return errorResponse(404, 'Contact not found');
    }

    let q = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_for', from.toISOString())
      .lte('scheduled_for', to.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(500);
    if (params.status) q = q.eq('status', params.status);
    if (contactId) q = q.eq('contact_id', contactId);
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
      let busyEvents = events;
      if (contactId) {
        // Free time depends on every meeting the user has, not only this contact's.
        const { data: all, error: allErr } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .gte('scheduled_for', new Date(new Date(opts.from).getTime() - 86400000).toISOString())
          .lte('scheduled_for', new Date(opts.to).toISOString())
          .limit(1000);
        if (allErr) throw new Error(allErr.message);
        busyEvents = all || [];
      }
      body.suggestions = proposeTimes(busyEvents, opts);
      if (a.allSlots) body.slots = computeFreeSlots(busyEvents, opts);
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify(body) };
  } catch (e) {
    return errorResponse(500, `Failed to list events: ${e.message}`);
  }
};
