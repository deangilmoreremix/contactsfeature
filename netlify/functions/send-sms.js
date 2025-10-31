/**
 * Netlify Function: Send SMS
 * Handles SMS sending via Twilio with delivery tracking
 */

const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, message, from, automationId, contactId } = JSON.parse(event.body);

    if (!to || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Phone number and message are required' })
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get active Twilio configuration
    const { data: twilioConfig, error: configError } = await supabase
      .from('communication_configs')
      .select('*')
      .eq('type', 'twilio')
      .eq('is_active', true)
      .single();

    if (configError || !twilioConfig) {
      console.error('Twilio config error:', configError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Twilio configuration not found' })
      };
    }

    // Initialize Twilio client
    const client = twilio(twilioConfig.account_sid, twilioConfig.auth_token);

    // Determine from number
    let fromNumber = from;
    if (!fromNumber && twilioConfig.phone_numbers && twilioConfig.phone_numbers.length > 0) {
      fromNumber = twilioConfig.phone_numbers[0]; // Use first available number
    }

    if (!fromNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No sender phone number available' })
      };
    }

    // Check rate limits
    const canSend = await checkRateLimits(supabase, twilioConfig.id, twilioConfig.rate_limit);
    if (!canSend) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      };
    }

    // Send SMS
    const twilioMessage = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });

    // Log SMS event
    await supabase.from('sms_events').insert({
      message_sid: twilioMessage.sid,
      contact_id: contactId,
      to_number: to,
      from_number: fromNumber,
      message: message,
      status: twilioMessage.status,
      automation_id: automationId,
      twilio_response: twilioMessage,
      config_id: twilioConfig.id
    });

    // Update daily usage
    await updateUsageStats(supabase, twilioConfig.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageSid: twilioMessage.sid,
        status: twilioMessage.status,
        to: to,
        from: fromNumber
      })
    };

  } catch (error) {
    console.error('SMS sending error:', error);

    // Log error event
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { contactId, to, automationId } = JSON.parse(event.body);

      await supabase.from('sms_events').insert({
        contact_id: contactId,
        to_number: to,
        status: 'failed',
        error_message: error.message,
        automation_id: automationId,
        metadata: { function: 'send-sms' }
      });
    } catch (logError) {
      console.error('Error logging failed:', logError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send SMS',
        details: error.message
      })
    };
  }
};

/**
 * Check rate limits for SMS sending
 */
async function checkRateLimits(supabase, configId, rateLimit) {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  // Count messages sent in the last minute
  const { count, error } = await supabase
    .from('sms_events')
    .select('*', { count: 'exact', head: true })
    .eq('config_id', configId)
    .gte('created_at', oneMinuteAgo.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    return false;
  }

  return (count || 0) < rateLimit;
}

/**
 * Update usage statistics
 */
async function updateUsageStats(supabase, configId) {
  const today = new Date().toISOString().split('T')[0];

  // Get or create usage record for today
  const { data: usage, error: findError } = await supabase
    .from('communication_usage')
    .select('*')
    .eq('config_id', configId)
    .eq('date', today)
    .single();

  if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Usage stats error:', findError);
    return;
  }

  if (usage) {
    // Update existing record
    await supabase
      .from('communication_usage')
      .update({
        sms_count: usage.sms_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', usage.id);
  } else {
    // Create new record
    await supabase
      .from('communication_usage')
      .insert({
        config_id: configId,
        date: today,
        sms_count: 1
      });
  }
}