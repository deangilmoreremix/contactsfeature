/**
 * Extra context loaders for the analysis/generative ai-task tasks. Same rule as _ctx.js: every query is
 * filtered by the caller's user_id; foreign ids look like missing rows (404).
 * (Lives next to _ctx.js on purpose: files starting with `_` are not registered as tasks.)
 */
const { supabase } = require('../_supabaseClient');
const { isValidUUID } = require('../_validation');
const { TaskError, loadContact } = require('./_ctx');

const DAY = 86400000;

/** JSON.stringify with a hard size cap so a huge client payload can never blow up a prompt. */
function capJson(value, max = 8000) {
  let s;
  try { s = JSON.stringify(value === undefined ? null : value); } catch { s = 'null'; }
  return s.length > max ? `${s.slice(0, max)}…[truncated]` : s;
}

/** Plain-object guard for client-supplied params. */
function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }

/** Keep only short scalars / short string lists of a client object (prompt-safe copy). */
function scalarsOf(o) {
  const out = {};
  for (const [k, v] of Object.entries(o).slice(0, 40)) {
    if (typeof v === 'string') out[k] = v.slice(0, 600);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string' || typeof x === 'number').slice(0, 20).map((x) => (typeof x === 'string' ? x.slice(0, 200) : x));
  }
  return out;
}

/** A deal by id (owner-checked) or the sanitised inline `dealData` the client sent (unsaved deals). */
async function loadDeal(user, params) {
  const inline = obj(params.dealData);
  const id = params.dealId || inline.id;
  if (isValidUUID(id)) {
    const { data, error } = await supabase.from('deals').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
    if (error) throw new TaskError(500, 'Could not load the deal');
    if (!data) throw new TaskError(404, 'Deal not found');
    return data;
  }
  if (Object.keys(inline).length) return scalarsOf(inline);
  throw new TaskError(400, 'dealId or dealData is required');
}

/** The caller's most recent deals (compact). */
async function userDeals(user, limit = 100) {
  const { data } = await supabase.from('deals').select('id,title,stage,value,created_at,updated_at,closed_at,expected_close_date,contact_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

/** The caller's calendar events in [from, to] (default: now - 1 day .. now + 21 days). */
async function userCalendarEvents(user, { from, to, limit = 300 } = {}) {
  const f = from ? new Date(from) : new Date(Date.now() - DAY);
  const t = to ? new Date(to) : new Date(Date.now() + 21 * DAY);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) throw new TaskError(400, 'from/to must be valid dates');
  const { data, error } = await supabase.from('calendar_events').select('id,title,scheduled_for,duration_minutes,status,contact_id')
    .eq('user_id', user.id).gte('scheduled_for', f.toISOString()).lte('scheduled_for', t.toISOString()).order('scheduled_for', { ascending: true }).limit(limit);
  if (error) throw new TaskError(500, 'Could not load the calendar');
  return data || [];
}

/** Other contacts of the caller at the same company (network context). Never crosses users. */
async function colleaguesAt(user, contact, limit = 15) {
  if (!contact || !contact.company || !isValidUUID(contact.id)) return [];
  const { data } = await supabase.from('contacts').select('id,name,title,status,lastconnected').eq('user_id', user.id).eq('company', contact.company).is('deleted_at', null).limit(limit + 1);
  return (data || []).filter((c) => c.id !== contact.id).slice(0, limit);
}

/** Optional contact: loads when contactId/contactData is present, otherwise null. */
async function maybeContact(user, params) {
  if (!params.contactId && !params.contactData) return null;
  return loadContact(user, params);
}

module.exports = { DAY, capJson, obj, scalarsOf, loadDeal, userDeals, userCalendarEvents, colleaguesAt, maybeContact };
