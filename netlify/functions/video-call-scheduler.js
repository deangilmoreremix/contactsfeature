const { supabase } = require('./_supabaseClient');
const { withAuth, CORS_HEADERS, errorResponse } = require('./_auth');
const { validateContactId, parseBody } = require('./_validation');
const { createLogger, generateCorrelationId } = require('./_logger');
const { getGTMPrompt } = require('./_gtmPrompts');

const log = createLogger('video-call-scheduler');

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;

exports.handler = withAuth(async (event, user) => {
  log.setCorrelationId(generateCorrelationId());

  const body = parseBody(event);
  if (!body) return errorResponse(400, 'Invalid JSON body');

  const { contactId, platform, title, startTime, duration } = body;
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

    let meetingDetails = null;
    let gtmPromptUsed = !!gtmPrompt;

    if (platform && title && startTime) {
      if (platform.toLowerCase() === 'zoom') {
        meetingDetails = await scheduleZoomMeeting({ title, startTime, duration, participants: [email] });
      }
    }

    const response = {
      contactId,
      platform: platform || 'zoom',
      meetingTitle: title || `Meeting with ${contactName}`,
      scheduledTime: startTime,
      duration: duration || 30,
      joinUrl: meetingDetails?.joinUrl || null,
      gtmPromptUsed,
      contactName,
      company,
      scheduledAt: new Date().toISOString(),
    };

    log.info('Video call scheduled', { contactId, platform, gtmPromptUsed });

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

async function scheduleZoomMeeting(meetingData) {
  try {
    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
      return { joinUrl: null, error: 'Zoom not configured' };
    }

    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=account_credentials&account_id=' + ZOOM_ACCOUNT_ID
    });

    if (!tokenResponse.ok) {
      return { joinUrl: null, error: 'Failed to get Zoom token' };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: meetingData.title,
        type: 2,
        start_time: new Date(meetingData.startTime).toISOString(),
        duration: meetingData.duration || 30,
        timezone: 'UTC',
        settings: { host_video: true, participant_video: true, join_before_host: false }
      })
    });

    if (!meetingResponse.ok) {
      return { joinUrl: null, error: 'Failed to create Zoom meeting' };
    }

    const zoomMeeting = await meetingResponse.json();
    return { id: zoomMeeting.id.toString(), joinUrl: zoomMeeting.join_url };
  } catch (error) {
    return { joinUrl: null, error: error.message };
  }
}
