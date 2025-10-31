/**
 * Netlify Function: Email Tracking
 * Handles email open/click tracking pixels and redirects
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
  try {
    const { queryStringParameters } = event;
    const { tid: trackingId, type: eventType, url: originalUrl, t: timestamp } = queryStringParameters || {};

    if (!trackingId || !eventType) {
      return {
        statusCode: 400,
        body: 'Missing tracking parameters'
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get user agent and IP for analytics
    const userAgent = event.headers['user-agent'] || '';
    const ipAddress = event.headers['x-forwarded-for'] ||
                     event.headers['x-real-ip'] ||
                     event.requestContext?.identity?.sourceIp || '';

    // Extract device info
    const deviceInfo = extractDeviceInfo(userAgent);

    // Handle different event types
    switch (eventType) {
      case 'open':
        await trackEmailOpen(supabase, trackingId, userAgent, ipAddress, deviceInfo);
        // Return 1x1 transparent pixel
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64').toString('base64'),
          isBase64Encoded: true
        };

      case 'click':
        await trackEmailClick(supabase, trackingId, originalUrl, userAgent, ipAddress, deviceInfo);
        // Redirect to original URL
        return {
          statusCode: 302,
          headers: {
            'Location': originalUrl || 'https://your-app.netlify.app',
            'Cache-Control': 'no-cache'
          },
          body: ''
        };

      default:
        return {
          statusCode: 400,
          body: 'Invalid event type'
        };
    }

  } catch (error) {
    console.error('Email tracking error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Tracking failed' })
    };
  }
};

/**
 * Track email open event
 */
async function trackEmailOpen(supabase, trackingId, userAgent, ipAddress, deviceInfo) {
  // Find the original email event
  const { data: sentEvent, error: findError } = await supabase
    .from('email_events')
    .select('*')
    .eq('tracking_id', trackingId)
    .eq('event_type', 'sent')
    .single();

  if (findError || !sentEvent) {
    console.error('Sent event not found for tracking ID:', trackingId);
    return;
  }

  // Check if open event already exists (prevent duplicates)
  const { data: existingOpen } = await supabase
    .from('email_events')
    .select('id')
    .eq('tracking_id', trackingId)
    .eq('event_type', 'opened')
    .single();

  if (existingOpen) {
    // Update existing open event with additional data
    await supabase
      .from('email_events')
      .update({
        user_agent: userAgent,
        ip_address: ipAddress,
        device_info: deviceInfo,
        metadata: {
          ...existingOpen.metadata,
          additional_open: true
        }
      })
      .eq('id', existingOpen.id);
  } else {
    // Create new open event
    await supabase.from('email_events').insert({
      email_id: sentEvent.email_id,
      contact_id: sentEvent.contact_id,
      event_type: 'opened',
      tracking_id: trackingId,
      template_id: sentEvent.template_id,
      automation_id: sentEvent.automation_id,
      user_agent: userAgent,
      ip_address: ipAddress,
      device_info: deviceInfo,
      metadata: {
        original_sent_event: sentEvent.id
      }
    });
  }
}

/**
 * Track email click event
 */
async function trackEmailClick(supabase, trackingId, originalUrl, userAgent, ipAddress, deviceInfo) {
  // Find the original email event
  const { data: sentEvent, error: findError } = await supabase
    .from('email_events')
    .select('*')
    .eq('tracking_id', trackingId)
    .eq('event_type', 'sent')
    .single();

  if (findError || !sentEvent) {
    console.error('Sent event not found for tracking ID:', trackingId);
    return;
  }

  // Create click event
  await supabase.from('email_events').insert({
    email_id: sentEvent.email_id,
    contact_id: sentEvent.contact_id,
    event_type: 'clicked',
    tracking_id: trackingId,
    template_id: sentEvent.template_id,
    automation_id: sentEvent.automation_id,
    user_agent: userAgent,
    ip_address: ipAddress,
    device_info: deviceInfo,
    link_url: originalUrl,
    metadata: {
      original_sent_event: sentEvent.id,
      redirect_url: originalUrl
    }
  });
}

/**
 * Extract device information from user agent
 */
function extractDeviceInfo(userAgent) {
  const ua = userAgent.toLowerCase();

  // Determine device type
  let type = 'desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    type = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    type = 'tablet';
  }

  // Determine OS
  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'ios';

  // Determine browser
  let browser = 'unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
  else if (ua.includes('edg')) browser = 'edge';
  else if (ua.includes('opera')) browser = 'opera';

  return { type, os, browser };
}