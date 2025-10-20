const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed'
    };
  }

  try {
    const { contact, automation, trigger } = JSON.parse(event.body);

    console.log('Processing automation:', { contactId: contact.id, automationType: automation.type, trigger });

    // Process automation logic server-side
    const result = await processAutomation(contact, automation, trigger);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Automation processing failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Automation processing failed',
        details: error.message
      })
    };
  }
};

async function processAutomation(contact, automation, trigger) {
  console.log(`Processing ${automation.type} automation for contact ${contact.id}`);

  switch (automation.type) {
    case 'scoring':
      return await calculateContactScore(contact);
    case 'enrichment':
      return await enrichContactData(contact);
    case 'followup':
      return await scheduleFollowup(contact, automation);
    case 'transition':
      return await transitionContactStatus(contact, automation);
    case 'notification':
      return await sendNotification(contact, automation);
    default:
      return { success: true, message: 'Automation processed' };
  }
}

async function calculateContactScore(contact) {
  try {
    // AI-powered scoring logic using OpenAI
    const score = await callAIService('calculate-score', {
      contact,
      scoringCriteria: {
        engagement: contact.lastConnected ? 1 : 0,
        interestLevel: getInterestScore(contact.interestLevel),
        aiScore: contact.aiScore || 0,
        tags: contact.tags?.length || 0
      }
    });

    // Update contact score in database
    const { error } = await supabase
      .from('contacts')
      .update({ aiScore: score.overall })
      .eq('id', contact.id);

    if (error) throw error;

    console.log(`Updated contact ${contact.id} score to ${score.overall}`);
    return { score: score.overall, breakdown: score.breakdown };
  } catch (error) {
    console.error('Score calculation failed:', error);
    throw error;
  }
}

async function enrichContactData(contact) {
  try {
    // Data enrichment using web search and AI
    const enrichedData = await callAIService('enrich-contact', {
      contact,
      enrichmentType: 'comprehensive'
    });

    const updates = {};

    if (enrichedData.phone && !contact.phone) {
      updates.phone = enrichedData.phone;
    }

    if (enrichedData.industry && !contact.industry) {
      updates.industry = enrichedData.industry;
    }

    if (enrichedData.socialProfiles) {
      updates.socialProfiles = {
        ...contact.socialProfiles,
        ...enrichedData.socialProfiles
      };
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contact.id);

      if (error) throw error;

      console.log(`Enriched contact ${contact.id} with ${Object.keys(updates).length} fields`);
      return { enriched: Object.keys(updates), data: updates };
    }

    return { enriched: [], message: 'No new data to enrich' };
  } catch (error) {
    console.error('Data enrichment failed:', error);
    throw error;
  }
}

async function scheduleFollowup(contact, automation) {
  try {
    const followupDate = calculateFollowupDate(automation.config);

    const { error } = await supabase
      .from('scheduled_actions')
      .insert({
        contact_id: contact.id,
        action_type: 'followup',
        scheduled_for: followupDate,
        automation_id: automation.id,
        config: automation.config
      });

    if (error) throw error;

    console.log(`Scheduled followup for contact ${contact.id} on ${followupDate}`);
    return { scheduled: followupDate, actionType: 'followup' };
  } catch (error) {
    console.error('Followup scheduling failed:', error);
    throw error;
  }
}

async function transitionContactStatus(contact, automation) {
  try {
    const newStatus = automation.config.newStatus;

    const { error } = await supabase
      .from('contacts')
      .update({
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      .eq('id', contact.id);

    if (error) throw error;

    console.log(`Transitioned contact ${contact.id} status to ${newStatus}`);
    return { transitioned: true, newStatus, oldStatus: contact.status };
  } catch (error) {
    console.error('Status transition failed:', error);
    throw error;
  }
}

async function sendNotification(contact, automation) {
  try {
    // Create notification record
    const { error } = await supabase
      .from('notifications')
      .insert({
        contact_id: contact.id,
        type: automation.config.notificationType || 'automation',
        title: automation.config.title || 'Automation Triggered',
        message: automation.config.message || `Automation "${automation.name}" was triggered for ${contact.name}`,
        automation_id: automation.id
      });

    if (error) throw error;

    console.log(`Created notification for contact ${contact.id}`);
    return { notified: true, notificationType: automation.config.notificationType };
  } catch (error) {
    console.error('Notification creation failed:', error);
    throw error;
  }
}

async function callAIService(endpoint, data) {
  try {
    const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: getSystemPrompt(endpoint)
        }, {
          role: 'user',
          content: JSON.stringify(data)
        }],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`AI service call failed: ${response.statusText}`);
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  } catch (error) {
    console.error('AI service call failed:', error);
    throw error;
  }
}

function getSystemPrompt(endpoint) {
  switch (endpoint) {
    case 'calculate-score':
      return 'You are a sales intelligence expert. Calculate a contact score from 0-100 based on engagement, interest level, AI score, and tags. Return JSON with overall score and breakdown.';
    case 'enrich-contact':
      return 'You are a data enrichment specialist. Find missing contact information like phone, industry, and social profiles. Return JSON with enriched data.';
    default:
      return 'You are a helpful assistant. Process the request and return appropriate JSON response.';
  }
}

function getInterestScore(interestLevel) {
  switch (interestLevel) {
    case 'hot': return 30;
    case 'medium': return 20;
    case 'low': return 10;
    case 'cold': return 0;
    default: return 0;
  }
}

function calculateFollowupDate(config) {
  const now = new Date();
  const delay = config.delayDays || 7; // Default 7 days
  now.setDate(now.getDate() + delay);
  return now.toISOString();
}