/**
 * Netlify Function: Send Contact Email
 * Handles email sending via SMTP providers with tracking and analytics
 */

const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SMTP_CONFIGS = JSON.parse(process.env.SMTP_CONFIGS || '{}');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { contact, templateId, automationId } = JSON.parse(event.body);

    if (!contact || !contact.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Contact with email is required' })
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get active SMTP configuration
    const { data: smtpConfig, error: configError } = await supabase
      .from('communication_configs')
      .select('*')
      .eq('type', 'smtp')
      .eq('is_active', true)
      .single();

    if (configError || !smtpConfig) {
      console.error('SMTP config error:', configError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'SMTP configuration not found' })
      };
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.error('Template error:', templateError);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Email template not found' })
      };
    }

    // Create email content with tracking pixels
    const trackingId = generateTrackingId();
    const emailContent = await personalizeEmail(template, contact, trackingId);

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.auth_user,
        pass: smtpConfig.auth_pass
      }
    });

    // Send email
    const mailOptions = {
      from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
      to: contact.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const info = await transporter.sendMail(mailOptions);

    // Log email event
    await supabase.from('email_events').insert({
      email_id: info.messageId,
      contact_id: contact.id,
      event_type: 'sent',
      template_id: templateId,
      automation_id: automationId,
      tracking_id: trackingId,
      metadata: {
        smtp_response: info,
        template_name: template.name
      }
    });

    // Update template usage
    await supabase
      .from('email_templates')
      .update({
        usage_count: template.usage_count + 1,
        last_used: new Date().toISOString()
      })
      .eq('id', templateId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: info.messageId,
        trackingId,
        recipient: contact.email
      })
    };

  } catch (error) {
    console.error('Email sending error:', error);

    // Log error event
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.from('email_events').insert({
        event_type: 'error',
        error_message: error.message,
        metadata: { function: 'send-contact-email' }
      });
    } catch (logError) {
      console.error('Error logging failed:', logError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send email',
        details: error.message
      })
    };
  }
};

/**
 * Personalize email content with contact data and tracking
 */
async function personalizeEmail(template, contact, trackingId) {
  let subject = template.subject;
  let html = template.html_content;
  let text = template.text_content || '';

  // Replace merge tags
  const mergeTags = {
    '{{firstName}}': contact.firstName || '',
    '{{lastName}}': contact.lastName || '',
    '{{fullName}}': `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
    '{{email}}': contact.email || '',
    '{{company}}': contact.company || '',
    '{{title}}': contact.title || '',
    '{{phone}}': contact.phone || '',
    '{{unsubscribeUrl}}': generateUnsubscribeUrl(contact.id, trackingId)
  };

  // Replace in subject
  Object.entries(mergeTags).forEach(([tag, value]) => {
    subject = subject.replace(new RegExp(tag, 'g'), value);
  });

  // Replace in HTML content
  Object.entries(mergeTags).forEach(([tag, value]) => {
    html = html.replace(new RegExp(tag, 'g'), value);
  });

  // Replace in text content
  Object.entries(mergeTags).forEach(([tag, value]) => {
    text = text.replace(new RegExp(tag, 'g'), value);
  });

  // Add tracking pixel to HTML
  const trackingPixel = `<img src="${generateTrackingUrl(trackingId, 'open')}" width="1" height="1" style="display:none;" alt="" />`;
  html += trackingPixel;

  // Add tracking links to HTML
  html = html.replace(
    /href="([^"]*)"/g,
    (match, url) => `href="${generateTrackingUrl(trackingId, 'click', url)}"`
  );

  return { subject, html, text };
}

/**
 * Generate unique tracking ID
 */
function generateTrackingId() {
  return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate tracking URL for opens/clicks
 */
function generateTrackingUrl(trackingId, eventType, originalUrl = '') {
  const baseUrl = process.env.URL || 'https://your-app.netlify.app';
  const params = new URLSearchParams({
    tid: trackingId,
    type: eventType,
    t: Date.now().toString()
  });

  if (originalUrl) {
    params.set('url', encodeURIComponent(originalUrl));
  }

  return `${baseUrl}/.netlify/functions/email-tracking?${params.toString()}`;
}

/**
 * Generate unsubscribe URL
 */
function generateUnsubscribeUrl(contactId, trackingId) {
  const baseUrl = process.env.URL || 'https://your-app.netlify.app';
  return `${baseUrl}/unsubscribe?cid=${contactId}&tid=${trackingId}`;
}