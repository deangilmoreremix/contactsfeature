/**
 * Netlify Function: Zapier Action
 * Allows Zapier to perform actions in the application (create, update, delete records)
 */

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
    const { action, data } = JSON.parse(event.body);

    if (!action || !data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Action and data are required' })
      };
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Execute action based on type
    let result;
    switch (action) {
      case 'create_contact':
        result = await createContact(supabase, data);
        break;
      case 'update_contact':
        result = await updateContact(supabase, data);
        break;
      case 'create_deal':
        result = await createDeal(supabase, data);
        break;
      case 'update_deal':
        result = await updateDeal(supabase, data);
        break;
      case 'send_email':
        result = await sendEmail(supabase, data);
        break;
      case 'send_sms':
        result = await sendSMS(supabase, data);
        break;
      case 'create_task':
        result = await createTask(supabase, data);
        break;
      case 'schedule_meeting':
        result = await scheduleMeeting(supabase, data);
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown action: ${action}` })
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        action: action,
        result: result
      })
    };

  } catch (error) {
    console.error('Zapier action error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Action failed',
        details: error.message
      })
    };
  }
};

/**
 * Create a new contact
 */
async function createContact(supabase, data) {
  const contactData = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone,
    title: data.title,
    company: data.company,
    industry: data.industry,
    website: data.website,
    address: data.address,
    city: data.city,
    state: data.state,
    country: data.country,
    linkedin_url: data.linkedinUrl,
    twitter_handle: data.twitterHandle,
    notes: data.notes,
    tags: data.tags || [],
    status: data.status || 'lead',
    interest_level: data.interestLevel || 'medium',
    source: 'zapier_action',
    custom_fields: data.customFields || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert(contactData)
    .select()
    .single();

  if (error) throw error;

  // Trigger automation
  await triggerAutomation(supabase, 'contact_created', contact.id);

  return {
    id: contact.id,
    message: 'Contact created successfully',
    contact: {
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`,
      email: contact.email,
      company: contact.company
    }
  };
}

/**
 * Update an existing contact
 */
async function updateContact(supabase, data) {
  if (!data.id && !data.email) {
    throw new Error('Contact ID or email is required for update');
  }

  // Find contact
  let query = supabase.from('contacts').select('id');
  if (data.id) {
    query = query.eq('id', data.id);
  } else {
    query = query.eq('email', data.email);
  }

  const { data: contact, error: findError } = await query.single();

  if (findError || !contact) {
    throw new Error('Contact not found');
  }

  // Prepare update data
  const updateData = {
    updated_at: new Date().toISOString()
  };

  if (data.firstName !== undefined) updateData.first_name = data.firstName;
  if (data.lastName !== undefined) updateData.last_name = data.lastName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.industry !== undefined) updateData.industry = data.industry;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.interestLevel !== undefined) updateData.interest_level = data.interestLevel;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.customFields !== undefined) updateData.custom_fields = { ...contact.custom_fields, ...data.customFields };

  const { data: updatedContact, error: updateError } = await supabase
    .from('contacts')
    .update(updateData)
    .eq('id', contact.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Trigger automation
  await triggerAutomation(supabase, 'contact_updated', contact.id);

  return {
    id: contact.id,
    message: 'Contact updated successfully',
    changes: Object.keys(updateData)
  };
}

/**
 * Create a new deal
 */
async function createDeal(supabase, data) {
  const dealData = {
    title: data.title,
    value: data.value,
    currency: data.currency || 'USD',
    stage: data.stage || 'prospecting',
    contact_id: data.contactId,
    expected_close_date: data.expectedCloseDate,
    description: data.description,
    source: 'zapier_action',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: deal, error } = await supabase
    .from('deals')
    .insert(dealData)
    .select()
    .single();

  if (error) throw error;

  // Trigger automation
  await triggerAutomation(supabase, 'deal_created', deal.id);

  return {
    id: deal.id,
    message: 'Deal created successfully',
    deal: {
      id: deal.id,
      title: deal.title,
      value: deal.value,
      stage: deal.stage
    }
  };
}

/**
 * Update an existing deal
 */
async function updateDeal(supabase, data) {
  if (!data.id) {
    throw new Error('Deal ID is required for update');
  }

  const updateData = {
    updated_at: new Date().toISOString()
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.value !== undefined) updateData.value = data.value;
  if (data.stage !== undefined) updateData.stage = data.stage;
  if (data.expectedCloseDate !== undefined) updateData.expected_close_date = data.expectedCloseDate;
  if (data.description !== undefined) updateData.description = data.description;

  const { data: deal, error } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', data.id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    message: 'Deal updated successfully',
    changes: Object.keys(updateData)
  };
}

/**
 * Send an email via the application
 */
async function sendEmail(supabase, data) {
  if (!data.to || !data.subject || !data.content) {
    throw new Error('Recipient, subject, and content are required');
  }

  // Find or create contact
  let contactId = data.contactId;
  if (!contactId && data.to) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', data.to)
      .single();

    contactId = contact?.id;
  }

  // Call the send email function
  const emailResponse = await fetch(`${process.env.URL}/.netlify/functions/send-contact-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact: { id: contactId, email: data.to },
      templateId: 'custom',
      customContent: {
        subject: data.subject,
        html: data.content,
        text: data.content.replace(/<[^>]*>/g, '') // Strip HTML for text version
      },
      automationId: 'zapier_action'
    })
  });

  if (!emailResponse.ok) {
    throw new Error('Failed to send email');
  }

  const emailResult = await emailResponse.json();

  return {
    messageId: emailResult.messageId,
    message: 'Email sent successfully',
    recipient: data.to
  };
}

/**
 * Send an SMS via Twilio
 */
async function sendSMS(supabase, data) {
  if (!data.to || !data.message) {
    throw new Error('Recipient and message are required');
  }

  // Call the send SMS function
  const smsResponse = await fetch(`${process.env.URL}/.netlify/functions/send-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: data.to,
      message: data.message,
      automationId: 'zapier_action'
    })
  });

  if (!smsResponse.ok) {
    throw new Error('Failed to send SMS');
  }

  const smsResult = await smsResponse.json();

  return {
    messageSid: smsResult.messageSid,
    message: 'SMS sent successfully',
    recipient: data.to
  };
}

/**
 * Create a task
 */
async function createTask(supabase, data) {
  const taskData = {
    title: data.title,
    description: data.description,
    contact_id: data.contactId,
    deal_id: data.dealId,
    assigned_to: data.assignedTo,
    priority: data.priority || 'medium',
    due_date: data.dueDate,
    status: 'pending',
    source: 'zapier_action',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: task, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) throw error;

  return {
    id: task.id,
    message: 'Task created successfully',
    task: {
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.due_date
    }
  };
}

/**
 * Schedule a meeting
 */
async function scheduleMeeting(supabase, data) {
  if (!data.title || !data.participants || data.participants.length === 0) {
    throw new Error('Meeting title and participants are required');
  }

  // Call the meeting scheduler function
  const meetingResponse = await fetch(`${process.env.URL}/.netlify/functions/meeting-scheduler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      duration: data.duration || 60,
      participants: data.participants,
      contactId: data.contactId,
      automationId: 'zapier_action',
      calendarProvider: data.calendarProvider || 'google'
    })
  });

  if (!meetingResponse.ok) {
    throw new Error('Failed to schedule meeting');
  }

  const meetingResult = await meetingResponse.json();

  return {
    meetingId: meetingResult.meeting.id,
    message: 'Meeting scheduled successfully',
    meeting: meetingResult.meeting
  };
}

/**
 * Trigger automation for an event
 */
async function triggerAutomation(supabase, eventType, recordId) {
  try {
    await supabase.from('automation_triggers').insert({
      event_type: eventType,
      record_id: recordId,
      source: 'zapier_action',
      triggered_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Automation trigger error:', error);
    // Don't fail the action if automation trigger fails
  }
}