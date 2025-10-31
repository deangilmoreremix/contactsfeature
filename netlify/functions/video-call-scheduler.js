/**
 * Netlify Function: Video Call Scheduler
 * Handles video call scheduling and coordination with Zoom, Google Meet, and Microsoft Teams
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// API Keys for video platforms
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID;

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      platform,
      title,
      startTime,
      duration,
      participants,
      contactId,
      automationId,
      description
    } = JSON.parse(event.body);

    if (!platform || !title || !startTime || !participants || participants.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get video call configuration
    const { data: config, error: configError } = await supabase
      .from('video_call_configs')
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Video config error:', configError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `${platform} configuration not found` })
      };
    }

    // Schedule the meeting based on platform
    let meetingDetails;
    switch (platform.toLowerCase()) {
      case 'zoom':
        meetingDetails = await scheduleZoomMeeting(config, {
          title,
          startTime,
          duration,
          participants,
          description
        });
        break;
      case 'google_meet':
        meetingDetails = await scheduleGoogleMeet(config, {
          title,
          startTime,
          duration,
          participants,
          description
        });
        break;
      case 'microsoft_teams':
        meetingDetails = await scheduleMicrosoftTeams(config, {
          title,
          startTime,
          duration,
          participants,
          description
        });
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unsupported platform: ${platform}` })
        };
    }

    // Store meeting details in database
    const { data: meeting, error: insertError } = await supabase
      .from('video_meetings')
      .insert({
        platform: platform,
        meeting_id: meetingDetails.id,
        title: title,
        start_time: startTime,
        duration: duration,
        join_url: meetingDetails.joinUrl,
        host_url: meetingDetails.hostUrl,
        participants: participants,
        contact_id: contactId,
        automation_id: automationId,
        status: 'scheduled',
        platform_data: meetingDetails
      })
      .select()
      .single();

    if (insertError) {
      console.error('Meeting insert error:', insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save meeting' })
      };
    }

    // Send invitations if requested
    if (participants && participants.length > 0) {
      await sendMeetingInvitations(supabase, meeting, participants);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        meeting: {
          id: meeting.id,
          platform: platform,
          title: title,
          startTime: startTime,
          duration: duration,
          joinUrl: meetingDetails.joinUrl,
          hostUrl: meetingDetails.hostUrl,
          participants: participants
        }
      })
    };

  } catch (error) {
    console.error('Video call scheduling error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to schedule video call',
        details: error.message
      })
    };
  }
};

/**
 * Schedule a Zoom meeting
 */
async function scheduleZoomMeeting(config, meetingData) {
  try {
    // Get Zoom access token
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=account_credentials&account_id=' + ZOOM_ACCOUNT_ID
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Zoom access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Create Zoom meeting
    const meetingResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: meetingData.title,
        type: 2, // Scheduled meeting
        start_time: new Date(meetingData.startTime).toISOString(),
        duration: meetingData.duration,
        timezone: 'UTC',
        agenda: meetingData.description,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          use_pmi: false
        }
      })
    });

    if (!meetingResponse.ok) {
      throw new Error(`Zoom API error: ${meetingResponse.status}`);
    }

    const zoomMeeting = await meetingResponse.json();

    return {
      id: zoomMeeting.id.toString(),
      joinUrl: zoomMeeting.join_url,
      hostUrl: zoomMeeting.start_url,
      password: zoomMeeting.password,
      platformData: zoomMeeting
    };

  } catch (error) {
    console.error('Zoom scheduling error:', error);
    throw error;
  }
}

/**
 * Schedule a Google Meet meeting
 */
async function scheduleGoogleMeet(config, meetingData) {
  try {
    // Refresh Google access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh Google access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Create Google Calendar event with Meet
    const eventResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: meetingData.title,
        description: meetingData.description,
        start: {
          dateTime: new Date(meetingData.startTime).toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: new Date(new Date(meetingData.startTime).getTime() + meetingData.duration * 60000).toISOString(),
          timeZone: 'UTC'
        },
        attendees: meetingData.participants.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            conferenceSolutionKey: { type: 'hangoutsMeet' },
            requestId: `meet_${Date.now()}`
          }
        }
      })
    });

    if (!eventResponse.ok) {
      throw new Error(`Google Calendar API error: ${eventResponse.status}`);
    }

    const calendarEvent = await eventResponse.json();

    return {
      id: calendarEvent.id,
      joinUrl: calendarEvent.hangoutLink,
      hostUrl: calendarEvent.hangoutLink, // Same for Meet
      platformData: calendarEvent
    };

  } catch (error) {
    console.error('Google Meet scheduling error:', error);
    throw error;
  }
}

/**
 * Schedule a Microsoft Teams meeting
 */
async function scheduleMicrosoftTeams(config, meetingData) {
  try {
    // Get Microsoft access token
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Microsoft access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Create Teams meeting
    const meetingResponse = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDateTime: new Date(meetingData.startTime).toISOString(),
        endDateTime: new Date(new Date(meetingData.startTime).getTime() + meetingData.duration * 60000).toISOString(),
        subject: meetingData.title,
        participants: {
          attendees: meetingData.participants.map(email => ({
            upn: email,
            role: 'attendee'
          }))
        }
      })
    });

    if (!meetingResponse.ok) {
      throw new Error(`Microsoft Graph API error: ${meetingResponse.status}`);
    }

    const teamsMeeting = await meetingResponse.json();

    return {
      id: teamsMeeting.id,
      joinUrl: teamsMeeting.joinUrl,
      hostUrl: teamsMeeting.joinUrl, // Same for Teams
      platformData: teamsMeeting
    };

  } catch (error) {
    console.error('Microsoft Teams scheduling error:', error);
    throw error;
  }
}

/**
 * Send meeting invitations via email
 */
async function sendMeetingInvitations(supabase, meeting, participants) {
  try {
    for (const participant of participants) {
      // Get participant details
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', participant)
        .single();

      if (contact) {
        // Send invitation email
        await fetch(`${process.env.URL}/.netlify/functions/send-contact-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact: contact,
            templateId: 'meeting-invitation',
            automationId: meeting.automation_id,
            customData: {
              meetingTitle: meeting.title,
              meetingTime: meeting.start_time,
              meetingDuration: meeting.duration,
              joinUrl: meeting.join_url,
              platform: meeting.platform
            }
          })
        });
      }
    }
  } catch (error) {
    console.error('Error sending meeting invitations:', error);
    // Don't fail the whole operation if invitations fail
  }
}