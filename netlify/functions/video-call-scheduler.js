const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('video-call-scheduler');

exports.handler = withAuth(async (event, user) => {
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
        .insert({ contact_id: contactId, scheduled_for: when.toISOString(), status: 'scheduled' })
        .select('id')
        .maybeSingle();
      if (eventError) throw new Error(`Database error: ${eventError.message}`);
      calendarEventId = eventRow ? eventRow.id : null;
    }

    const response = {
      contactId,
      calendarEventId,
      meetingTitle: title || `Meeting with ${contactName}`,
      scheduledTime: startTime,
      duration: duration || 30,
      gtmPromptUsed,
      contactName,
      company,
      scheduledAt: new Date().toISOString(),
    };

    log.info('Video call scheduled', { contactId, calendarEventId, gtmPromptUsed });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response),
    };
  } catch (error) {
    log.error('Video call scheduling failed', { contactId, error: error.message });
    return errorResponse(500, 'Video call scheduling failed');
  }
});
