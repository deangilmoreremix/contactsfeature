/**
 * Netlify Function: create / reschedule / cancel a calendar event (ownership-checked) and notify
 * the contact through the user's own email provider.
 * POST { action?: 'create'|'reschedule'|'cancel' (default create), eventId?, contactId?,
 *        scheduledFor|datetime, durationMinutes?, title?, location?, meetingUrl?, notes?,
 *        notify? (default true), allowConflict? }
 * Response: { event, notified: boolean, reason? } — notified is only true when a provider accepted the mail.
 */
const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { sendEmail } = require('./_messaging');
const { hasConflict } = require('./_availability');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ok = (body) => ({ statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(body) });

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function notifyContact(userId, contact, event, kind) {
  if (!contact || !contact.email) return { notified: false, reason: 'Contact has no email address' };
  const when = new Date(event.scheduled_for).toUTCString();
  const subjects = {
    create: 'Your meeting is confirmed',
    reschedule: 'Your meeting has been rescheduled',
    cancel: 'Your meeting has been cancelled',
  };
  const lines = {
    create: `Your meeting${event.title ? ` "${event.title}"` : ''} is scheduled for ${when} (${event.duration_minutes} min).`,
    reschedule: `Your meeting${event.title ? ` "${event.title}"` : ''} has moved to ${when} (${event.duration_minutes} min).`,
    cancel: `Your meeting${event.title ? ` "${event.title}"` : ''} originally set for ${when} has been cancelled.`,
  };
  let text = lines[kind];
  if (kind !== 'cancel' && event.meeting_url) text += `\nJoin: ${event.meeting_url}`;
  if (kind !== 'cancel' && event.location) text += `\nLocation: ${event.location}`;
  try {
    await sendEmail(userId, {
      to: contact.email,
      subject: subjects[kind],
      text,
      html: `<p>${esc(text).replace(/\n/g, '<br>')}</p>`,
    });
    return { notified: true };
  } catch (e) {
    return { notified: false, reason: e.code === 'NO_PROVIDER' ? e.message : `Email failed: ${e.message}` };
  }
}

exports.handler = withAuth(async (event, user) => {
  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return errorResponse(400, 'Invalid JSON body'); }

  const action = b.action || 'create';
  if (!['create', 'reschedule', 'cancel'].includes(action)) return errorResponse(400, 'action must be create, reschedule or cancel');
  const notify = b.notify !== false;
  const when = b.scheduledFor || b.datetime;
  const duration = Number(b.durationMinutes) > 0 ? Math.min(Number(b.durationMinutes), 1440) : null;

  try {
    let existing = null;
    if (action !== 'create') {
      if (!b.eventId || !UUID_RE.test(b.eventId)) return errorResponse(400, 'eventId is required');
      const { data, error } = await supabase.from('calendar_events').select('*').eq('id', b.eventId).eq('user_id', user.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return errorResponse(404, 'Event not found');
      existing = data;
    }

    let startIso = existing ? existing.scheduled_for : null;
    if (action !== 'cancel') {
      const d = new Date(when);
      if (!when || Number.isNaN(d.getTime())) return errorResponse(400, 'scheduledFor must be a valid ISO date');
      startIso = d.toISOString();
    }

    const contactId = existing ? existing.contact_id : b.contactId;
    if (action === 'create' && (!contactId || !UUID_RE.test(contactId))) return errorResponse(400, 'contactId is required');
    let contact = null;
    if (contactId) {
      const { data, error } = await supabase.from('contacts').select('*').eq('id', contactId).eq('user_id', user.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return errorResponse(404, 'Contact not found');
      contact = data;
    }

    if (action !== 'cancel' && !b.allowConflict) {
      const d = new Date(startIso).getTime();
      const dur = duration || (existing && existing.duration_minutes) || 30;
      const { data: near, error } = await supabase.from('calendar_events').select('id, scheduled_for, duration_minutes, status')
        .eq('user_id', user.id)
        .gte('scheduled_for', new Date(d - 86400000).toISOString())
        .lte('scheduled_for', new Date(d + dur * 60000).toISOString());
      if (error) throw new Error(error.message);
      if (hasConflict(near || [], startIso, dur, existing && existing.id)) {
        return errorResponse(409, 'That time overlaps an existing event');
      }
    }

    let saved;
    if (action === 'create') {
      const { data, error } = await supabase.from('calendar_events').insert({
        user_id: user.id, contact_id: contactId, title: b.title || null, scheduled_for: startIso,
        duration_minutes: duration || 30, status: 'scheduled', location: b.location || null,
        meeting_url: b.meetingUrl || null, notes: b.notes || null,
      }).select('*').maybeSingle();
      if (error) throw new Error(error.message);
      saved = data;
    } else {
      const patch = { updated_at: new Date().toISOString() };
      if (action === 'cancel') patch.status = 'cancelled';
      else {
        patch.status = 'scheduled';
        patch.scheduled_for = startIso;
        if (duration) patch.duration_minutes = duration;
        ['title', 'location', 'notes'].forEach((k) => { if (b[k] !== undefined) patch[k] = b[k] || null; });
        if (b.meetingUrl !== undefined) patch.meeting_url = b.meetingUrl || null;
      }
      const { data, error } = await supabase.from('calendar_events').update(patch).eq('id', existing.id).eq('user_id', user.id).select('*').maybeSingle();
      if (error) throw new Error(error.message);
      saved = data;
    }
    if (!saved) return errorResponse(500, 'Event was not saved');

    const note = notify ? await notifyContact(user.id, contact, saved, action) : { notified: false, reason: 'Notification disabled' };
    return ok({ event: saved, ...note });
  } catch (e) {
    return errorResponse(500, `Calendar update failed: ${e.message}`);
  }
});
