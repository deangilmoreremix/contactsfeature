/**
 * Netlify Function: Zapier Webhook Handler
 * Handles incoming webhooks from Zapier and processes automation triggers
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ZAPIER_WEBHOOK_SECRET = process.env.ZAPIER_WEBHOOK_SECRET;

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { headers, body } = event;
    const payload = JSON.parse(body);

    // Verify webhook authenticity (optional - Zapier can include custom headers)
    const zapierSignature = headers['x-zapier-signature'] || headers['x-hook-signature'];
    if (ZAPIER_WEBHOOK_SECRET && zapierSignature) {
      // Implement signature verification if needed
      // This is optional as Zapier webhooks can be secured via URL obscurity
    }

    // Extract webhook metadata
    const webhookId = headers['x-webhook-id'] || 'unknown';
    const zapierRequestId = headers['x-zapier-request-id'] || 'unknown';

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Log webhook receipt
    await supabase.from('webhook_logs').insert({
      webhook_id: webhookId,
      provider: 'zapier',
      request_id: zapierRequestId,
      payload: payload,
      headers: headers,
      received_at: new Date().toISOString()
    });

    // Process the webhook based on its structure
    const result = await processZapierWebhook(supabase, payload, webhookId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processed: result.processed,
        actions: result.actions,
        webhookId: webhookId
      })
    };

  } catch (error) {
    console.error('Zapier webhook processing error:', error);

    // Log error
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.from('webhook_logs').insert({
        provider: 'zapier',
        error_message: error.message,
        error_stack: error.stack,
        received_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging failed:', logError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        details: error.message
      })
    };
  }
};

/**
 * Process Zapier webhook payload and trigger appropriate actions
 */
async function processZapierWebhook(supabase, payload, webhookId) {
  const results = {
    processed: 0,
    actions: []
  };

  try {
    // Detect webhook type and process accordingly
    if (payload.type === 'contact_created' || detectContactCreation(payload)) {
      results.processed++;
      const action = await processContactCreation(supabase, payload, webhookId);
      results.actions.push(action);
    }

    if (payload.type === 'contact_updated' || detectContactUpdate(payload)) {
      results.processed++;
      const action = await processContactUpdate(supabase, payload, webhookId);
      results.actions.push(action);
    }

    if (payload.type === 'deal_created' || detectDealCreation(payload)) {
      results.processed++;
      const action = await processDealCreation(supabase, payload, webhookId);
      results.actions.push(action);
    }

    if (payload.type === 'email_opened' || detectEmailEvent(payload)) {
      results.processed++;
      const action = await processEmailEvent(supabase, payload, webhookId);
      results.actions.push(action);
    }

    if (payload.type === 'form_submission' || detectFormSubmission(payload)) {
      results.processed++;
      const action = await processFormSubmission(supabase, payload, webhookId);
      results.actions.push(action);
    }

    // Generic webhook processing for custom integrations
    if (results.processed === 0) {
      results.processed++;
      const action = await processGenericWebhook(supabase, payload, webhookId);
      results.actions.push(action);
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    results.actions.push({
      type: 'error',
      error: error.message,
      webhookId: webhookId
    });
  }

  return results;
}

/**
 * Detect if payload represents contact creation
 */
function detectContactCreation(payload) {
  const indicators = ['new_contact', 'contact_added', 'lead_created', 'prospect_created'];
  return indicators.some(indicator =>
    JSON.stringify(payload).toLowerCase().includes(indicator) ||
    (payload.action && payload.action.toLowerCase().includes('create'))
  );
}

/**
 * Detect if payload represents contact update
 */
function detectContactUpdate(payload) {
  const indicators = ['contact_updated', 'lead_updated', 'profile_changed'];
  return indicators.some(indicator =>
    JSON.stringify(payload).toLowerCase().includes(indicator) ||
    (payload.action && payload.action.toLowerCase().includes('update'))
  );
}

/**
 * Detect if payload represents deal creation
 */
function detectDealCreation(payload) {
  const indicators = ['deal_created', 'opportunity_added', 'sale_created'];
  return indicators.some(indicator =>
    JSON.stringify(payload).toLowerCase().includes(indicator)
  );
}

/**
 * Detect if payload represents email event
 */
function detectEmailEvent(payload) {
  const indicators = ['email_opened', 'email_clicked', 'email_delivered', 'email_bounced'];
  return indicators.some(indicator =>
    JSON.stringify(payload).toLowerCase().includes(indicator)
  );
}

/**
 * Detect if payload represents form submission
 */
function detectFormSubmission(payload) {
  const indicators = ['form_submitted', 'form_response', 'survey_completed'];
  return indicators.some(indicator =>
    JSON.stringify(payload).toLowerCase().includes(indicator)
  );
}

/**
 * Process contact creation from Zapier
 */
async function processContactCreation(supabase, payload, webhookId) {
  try {
    // Extract contact data from payload
    const contactData = extractContactData(payload);

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', contactData.email)
      .single();

    if (existingContact) {
      // Update existing contact
      await supabase
        .from('contacts')
        .update({
          ...contactData,
          updated_at: new Date().toISOString(),
          source: 'zapier_webhook'
        })
        .eq('id', existingContact.id);

      // Trigger contact update automation
      await triggerAutomation(supabase, 'contact_updated', existingContact.id, webhookId);

      return {
        type: 'contact_updated',
        contactId: existingContact.id,
        source: 'zapier',
        webhookId: webhookId
      };
    } else {
      // Create new contact
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          ...contactData,
          source: 'zapier_webhook',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger contact creation automation
      await triggerAutomation(supabase, 'contact_created', newContact.id, webhookId);

      return {
        type: 'contact_created',
        contactId: newContact.id,
        source: 'zapier',
        webhookId: webhookId
      };
    }

  } catch (error) {
    console.error('Contact creation processing error:', error);
    throw error;
  }
}

/**
 * Process contact update from Zapier
 */
async function processContactUpdate(supabase, payload, webhookId) {
  try {
    const contactData = extractContactData(payload);

    // Find contact by email or external ID
    let query = supabase.from('contacts').select('id');

    if (contactData.email) {
      query = query.eq('email', contactData.email);
    } else if (payload.external_id) {
      query = query.eq('external_id', payload.external_id);
    } else {
      throw new Error('No identifier found for contact update');
    }

    const { data: contact, error: findError } = await query.single();

    if (findError || !contact) {
      throw new Error('Contact not found for update');
    }

    // Update contact
    await supabase
      .from('contacts')
      .update({
        ...contactData,
        updated_at: new Date().toISOString()
      })
      .eq('id', contact.id);

    // Trigger contact update automation
    await triggerAutomation(supabase, 'contact_updated', contact.id, webhookId);

    return {
      type: 'contact_updated',
      contactId: contact.id,
      source: 'zapier',
      webhookId: webhookId
    };

  } catch (error) {
    console.error('Contact update processing error:', error);
    throw error;
  }
}

/**
 * Process deal creation from Zapier
 */
async function processDealCreation(supabase, payload, webhookId) {
  try {
    const dealData = extractDealData(payload);

    // Create deal
    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        ...dealData,
        source: 'zapier_webhook',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger deal creation automation
    await triggerAutomation(supabase, 'deal_created', deal.id, webhookId);

    return {
      type: 'deal_created',
      dealId: deal.id,
      source: 'zapier',
      webhookId: webhookId
    };

  } catch (error) {
    console.error('Deal creation processing error:', error);
    throw error;
  }
}

/**
 * Process email event from Zapier
 */
async function processEmailEvent(supabase, payload, webhookId) {
  try {
    const eventData = {
      email_id: payload.email_id || payload.message_id,
      contact_id: payload.contact_id,
      event_type: payload.event_type || payload.type,
      user_agent: payload.user_agent,
      ip_address: payload.ip_address,
      link_url: payload.link_url,
      metadata: payload.metadata || {},
      source: 'zapier_webhook'
    };

    await supabase.from('email_events').insert(eventData);

    return {
      type: 'email_event',
      eventType: eventData.event_type,
      source: 'zapier',
      webhookId: webhookId
    };

  } catch (error) {
    console.error('Email event processing error:', error);
    throw error;
  }
}

/**
 * Process form submission from Zapier
 */
async function processFormSubmission(supabase, payload, webhookId) {
  try {
    const formData = {
      form_id: payload.form_id,
      contact_email: payload.email,
      responses: payload.responses || payload.fields || {},
      source: 'zapier_webhook',
      submitted_at: payload.submitted_at || new Date().toISOString()
    };

    // Try to find or create contact
    let contactId = null;
    if (payload.email) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', payload.email)
        .single();

      if (contact) {
        contactId = contact.id;
      } else {
        // Create new contact from form data
        const newContactData = extractContactData(payload);
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            ...newContactData,
            source: 'zapier_form',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        contactId = newContact?.id;
      }
    }

    // Store form submission
    await supabase.from('form_submissions').insert({
      ...formData,
      contact_id: contactId
    });

    // Trigger form submission automation
    if (contactId) {
      await triggerAutomation(supabase, 'form_submitted', contactId, webhookId);
    }

    return {
      type: 'form_submission',
      contactId: contactId,
      source: 'zapier',
      webhookId: webhookId
    };

  } catch (error) {
    console.error('Form submission processing error:', error);
    throw error;
  }
}

/**
 * Process generic webhook for custom integrations
 */
async function processGenericWebhook(supabase, payload, webhookId) {
  try {
    // Store generic webhook data
    await supabase.from('generic_webhooks').insert({
      webhook_id: webhookId,
      payload: payload,
      processed_at: new Date().toISOString(),
      provider: 'zapier'
    });

    // Try to extract and process any recognizable data
    if (payload.contact) {
      await processContactCreation(supabase, payload.contact, webhookId);
    }

    return {
      type: 'generic_webhook',
      source: 'zapier',
      webhookId: webhookId
    };

  } catch (error) {
    console.error('Generic webhook processing error:', error);
    throw error;
  }
}

/**
 * Extract contact data from webhook payload
 */
function extractContactData(payload) {
  return {
    first_name: payload.firstName || payload.first_name || payload.name?.split(' ')[0],
    last_name: payload.lastName || payload.last_name || payload.name?.split(' ').slice(1).join(' '),
    email: payload.email || payload.email_address,
    phone: payload.phone || payload.phone_number || payload.mobile,
    title: payload.title || payload.job_title,
    company: payload.company || payload.organization,
    industry: payload.industry,
    website: payload.website || payload.company_website,
    address: payload.address,
    city: payload.city,
    state: payload.state || payload.province,
    country: payload.country,
    linkedin_url: payload.linkedin || payload.linkedin_url,
    twitter_handle: payload.twitter || payload.twitter_handle,
    notes: payload.notes || payload.comments,
    tags: payload.tags || [],
    custom_fields: payload.custom_fields || {}
  };
}

/**
 * Extract deal data from webhook payload
 */
function extractDealData(payload) {
  return {
    title: payload.deal_name || payload.opportunity_name || payload.title,
    value: payload.amount || payload.value || payload.deal_value,
    currency: payload.currency || 'USD',
    stage: payload.stage || payload.deal_stage || 'prospecting',
    contact_id: payload.contact_id,
    expected_close_date: payload.close_date || payload.expected_close_date,
    description: payload.description || payload.notes,
    source: payload.source || 'zapier_webhook'
  };
}

/**
 * Trigger automation based on event type
 */
async function triggerAutomation(supabase, eventType, recordId, webhookId) {
  try {
    // This would integrate with the automation service
    // For now, we'll log the automation trigger
    await supabase.from('automation_triggers').insert({
      event_type: eventType,
      record_id: recordId,
      source: 'zapier_webhook',
      webhook_id: webhookId,
      triggered_at: new Date().toISOString()
    });

    // In a full implementation, this would call the automation service
    // await automationService.processContactAutomation(contact, eventType);

  } catch (error) {
    console.error('Automation trigger error:', error);
    // Don't fail the webhook processing if automation fails
  }
}