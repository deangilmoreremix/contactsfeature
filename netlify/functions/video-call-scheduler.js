const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { runDual } = require('./_stream/dual');
const { S, callOptions, parseJsonOr } = require('./_stream/helpers');
const { stream } = require('@netlify/functions');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('video-call-scheduler');

const BRIEF_SCHEMA = S.obj({ agenda: S.strArr, suggestedSlots: S.strArr, prepNotes: S.strArr, followUpDraft: S.str });

exports.handler = stream(withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, title, startTime, duration } = body;
  const idErr = validateContactId(contactId);
  if (idErr) return errorResponse(400, idErr);

  try {
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (contactError) throw new Error(`Database error: ${contactError.message}`);
    if (!contact) return errorResponse(404, 'Contact not found');

    const contactName = `${contact.firstname || ''} ${contact.lastname || ''}`.trim() || 'there';
    const company = contact.company || 'their company';
    const email = contact.email;

    const gtmPrompt = await getGTMPrompt('video-call-scheduler', contact.industry);
    const gtmBlock = gtmPrompt 
      ? `Use this proven meeting scheduling framework as your guide:\n${gtmPrompt}\n\n---\n\n`
      : '';

    let gtmPromptUsed = !!gtmPrompt;

    // Scheduling is stored in Supabase calendar_events (no external video provider).
    let calendarEventId = null;
    if (title && startTime) {
      const when = new Date(startTime);
      if (Number.isNaN(when.getTime())) return errorResponse(400, 'startTime must be a valid date');
      const { data: eventRow, error: eventError } = await supabase
        .from('calendar_events')
        .insert({ user_id: user.id, contact_id: contactId, title, scheduled_for: when.toISOString(), duration_minutes: Number(duration) > 0 ? Number(duration) : 30, status: 'scheduled' })
        .select('id')
        .maybeSingle();
      if (eventError) throw new Error(`Database error: ${eventError.message}`);
      calendarEventId = eventRow ? eventRow.id : null;
    }

    const meeting = { title: title || `Meeting with ${contactName}`, when: startTime || null, duration: Number(duration) > 0 ? Number(duration) : 30 };
    const prompt = `${gtmBlock}Prepare a meeting brief for ${contactName} at ${company}. Meeting: ${JSON.stringify(meeting)}.
Contact: ${JSON.stringify({ title: contact.title, industry: contact.industry, notes: contact.notes, status: contact.status })}
Use only this data; do not invent facts. If no time was given, suggestedSlots lists generic suggestions of the form "Tue 10:00-10:30" for the contact's likely business hours and says so in prepNotes.
Return JSON with "agenda" (array), "suggestedSlots" (array), "prepNotes" (array) and "followUpDraft" (a short follow-up email body).`;

    return await runDual({
      event,
      body,
      options: callOptions([{ role: 'user', content: prompt }], { model: 'default', maxTokens: 1200, schema: BRIEF_SCHEMA, schemaName: 'meeting_brief' }),
      finalize: (content) => {
        const brief = parseJsonOr(content, null);
        if (!brief || typeof brief !== 'object') throw new Error('AI did not return structured JSON');
        log.info('Video call scheduled', { contactId, calendarEventId, gtmPromptUsed });
        return {
          contactId,
          calendarEventId,
          meetingTitle: meeting.title,
          scheduledTime: startTime,
          duration: meeting.duration,
          gtmPromptUsed,
          contactName,
          company,
          ...brief,
          scheduledAt: new Date().toISOString(),
        };
      },
    });
  } catch (error) {
    log.error('Video call scheduling failed', { contactId, error: error.message });
    return errorResponse(500, 'Video call scheduling failed');
  }
}));
