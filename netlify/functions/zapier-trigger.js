/**
 * Netlify Function: Zapier Trigger
 * Allows Zapier to poll for new data and trigger zaps based on application events
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
  try {
    const { queryStringParameters } = event;
    const { trigger, cursor, limit = 50 } = queryStringParameters || {};

    if (!trigger) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Trigger type is required' })
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get data based on trigger type
    let data = [];
    let nextCursor = null;

    switch (trigger) {
      case 'new_contacts':
        ({ data, nextCursor } = await getNewContacts(supabase, cursor, parseInt(limit)));
        break;
      case 'updated_contacts':
        ({ data, nextCursor } = await getUpdatedContacts(supabase, cursor, parseInt(limit)));
        break;
      case 'new_deals':
        ({ data, nextCursor } = await getNewDeals(supabase, cursor, parseInt(limit)));
        break;
      case 'email_events':
        ({ data, nextCursor } = await getEmailEvents(supabase, cursor, parseInt(limit)));
        break;
      case 'form_submissions':
        ({ data, nextCursor } = await getFormSubmissions(supabase, cursor, parseInt(limit)));
        break;
      case 'automation_triggers':
        ({ data, nextCursor } = await getAutomationTriggers(supabase, cursor, parseInt(limit)));
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown trigger type: ${trigger}` })
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: data,
        cursor: nextCursor,
        has_more: nextCursor !== null,
        count: data.length
      })
    };

  } catch (error) {
    console.error('Zapier trigger error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Trigger failed',
        details: error.message
      })
    };
  }
};

/**
 * Get new contacts since cursor
 */
async function getNewContacts(supabase, cursor, limit) {
  let query = supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Format data for Zapier
  const formattedData = data.map(contact => ({
    id: contact.id,
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    phone: contact.phone,
    title: contact.title,
    company: contact.company,
    industry: contact.industry,
    status: contact.status,
    interestLevel: contact.interest_level,
    aiScore: contact.ai_score,
    source: contact.source,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
    // Include custom fields
    ...contact.custom_fields
  }));

  // Set next cursor to the oldest created_at in this batch
  const nextCursor = data.length > 0 ? data[data.length - 1].created_at : null;

  return { data: formattedData, nextCursor };
}

/**
 * Get updated contacts since cursor
 */
async function getUpdatedContacts(supabase, cursor, limit) {
  let query = supabase
    .from('contacts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.gt('updated_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  const formattedData = data.map(contact => ({
    id: contact.id,
    firstName: contact.first_name,
    lastName: contact.last_name,
    email: contact.email,
    changes: contact.changes || {},
    updatedAt: contact.updated_at,
    updatedFields: contact.updated_fields || []
  }));

  const nextCursor = data.length > 0 ? data[data.length - 1].updated_at : null;

  return { data: formattedData, nextCursor };
}

/**
 * Get new deals since cursor
 */
async function getNewDeals(supabase, cursor, limit) {
  let query = supabase
    .from('deals')
    .select(`
      *,
      contacts (
        id,
        first_name,
        last_name,
        email,
        company
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  const formattedData = data.map(deal => ({
    id: deal.id,
    title: deal.title,
    value: deal.value,
    currency: deal.currency,
    stage: deal.stage,
    contact: deal.contacts,
    expectedCloseDate: deal.expected_close_date,
    createdAt: deal.created_at,
    source: deal.source
  }));

  const nextCursor = data.length > 0 ? data[data.length - 1].created_at : null;

  return { data: formattedData, nextCursor };
}

/**
 * Get email events since cursor
 */
async function getEmailEvents(supabase, cursor, limit) {
  let query = supabase
    .from('email_events')
    .select(`
      *,
      contacts (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  const formattedData = data.map(event => ({
    id: event.id,
    emailId: event.email_id,
    contact: event.contacts,
    eventType: event.event_type,
    linkUrl: event.link_url,
    userAgent: event.user_agent,
    ipAddress: event.ip_address,
    deviceInfo: event.device_info,
    createdAt: event.created_at
  }));

  const nextCursor = data.length > 0 ? data[data.length - 1].created_at : null;

  return { data: formattedData, nextCursor };
}

/**
 * Get form submissions since cursor
 */
async function getFormSubmissions(supabase, cursor, limit) {
  let query = supabase
    .from('form_submissions')
    .select(`
      *,
      contacts (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.gt('submitted_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  const formattedData = data.map(submission => ({
    id: submission.id,
    formId: submission.form_id,
    contact: submission.contacts,
    responses: submission.responses,
    submittedAt: submission.submitted_at,
    source: submission.source
  }));

  const nextCursor = data.length > 0 ? data[data.length - 1].submitted_at : null;

  return { data: formattedData, nextCursor };
}

/**
 * Get automation triggers since cursor
 */
async function getAutomationTriggers(supabase, cursor, limit) {
  let query = supabase
    .from('automation_triggers')
    .select(`
      *,
      contacts (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.gt('triggered_at', cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  const formattedData = data.map(trigger => ({
    id: trigger.id,
    eventType: trigger.event_type,
    recordId: trigger.record_id,
    contact: trigger.contacts,
    source: trigger.source,
    webhookId: trigger.webhook_id,
    triggeredAt: trigger.triggered_at,
    metadata: trigger.metadata
  }));

  const nextCursor = data.length > 0 ? data[data.length - 1].triggered_at : null;

  return { data: formattedData, nextCursor };
}