/**
 * Context loaders for ai-task. Every loader reads ONLY rows owned by the caller (user_id filter) and
 * throws TaskError(404) otherwise, so a task can never leak another user's data into a prompt.
 */
const { supabase } = require('../_supabaseClient');
const { isValidUUID } = require('../_validation');

class TaskError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const CONTACT_FIELDS = 'id,name,firstname,lastname,email,phone,company,title,industry,status,tags,notes,socialprofiles,customfields,aiscore,interestlevel,sources,lastconnected,created_at,updated_at';

/** Contact by id (owner-checked) — or, for unsaved/sample contacts, the sanitised `contactData` the client sent. */
async function loadContact(user, params, { allowInline = true } = {}) {
  const id = params.contactId || (params.contactData && params.contactData.id);
  if (isValidUUID(id)) {
    const { data, error } = await supabase.from('contacts').select('*').eq('id', id).eq('user_id', user.id).is('deleted_at', null).maybeSingle();
    if (error) throw new TaskError(500, 'Could not load the contact');
    if (!data) throw new TaskError(404, 'Contact not found');
    return data;
  }
  if (allowInline && params.contactData && typeof params.contactData === 'object') return pickInline(params.contactData);
  throw new TaskError(400, 'contactId or contactData is required');
}

const INLINE_KEYS = ['id', 'name', 'firstName', 'lastName', 'firstname', 'lastname', 'email', 'phone', 'company', 'title', 'jobTitle', 'industry', 'status', 'tags', 'notes', 'interestLevel', 'aiScore', 'socialProfiles', 'lastConnected'];
function pickInline(o) {
  const out = {};
  for (const k of INLINE_KEYS) if (o[k] !== undefined && o[k] !== null) out[k] = typeof o[k] === 'string' ? o[k].slice(0, 2000) : o[k];
  return out;
}

async function recentEmails(user, contactId, limit = 8) {
  if (!isValidUUID(contactId)) return [];
  const { data } = await supabase.from('emails').select('subject,status,is_inbound,created_at,opened_at,clicked_at').eq('contact_id', contactId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

async function recentTimeline(user, contactId, limit = 8) {
  if (!isValidUUID(contactId)) return [];
  const { data } = await supabase.from('contact_timeline').select('event_type,title,created_at').eq('contact_id', contactId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

async function dealsFor(user, contactId, limit = 5) {
  if (!isValidUUID(contactId)) return [];
  const { data } = await supabase.from('deals').select('*').eq('contact_id', contactId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

/** Compact, prompt-safe description of a contact. */
function describeContact(c) {
  const name = c.name || [c.firstName || c.firstname, c.lastName || c.lastname].filter(Boolean).join(' ');
  return [
    name && `Name: ${name}`, c.title || c.jobTitle ? `Title: ${c.title || c.jobTitle}` : null, c.company && `Company: ${c.company}`,
    c.industry && `Industry: ${c.industry}`, c.email && `Email: ${c.email}`, c.phone && `Phone: ${c.phone}`, c.status && `Status: ${c.status}`,
    (c.interestLevel || c.interestlevel) && `Interest: ${c.interestLevel || c.interestlevel}`,
    Array.isArray(c.tags) && c.tags.length ? `Tags: ${c.tags.join(', ')}` : null, c.notes && `Notes: ${String(c.notes).slice(0, 600)}`,
  ].filter(Boolean).join('\n');
}

module.exports = { TaskError, loadContact, recentEmails, recentTimeline, dealsFor, describeContact, pickInline, CONTACT_FIELDS };
