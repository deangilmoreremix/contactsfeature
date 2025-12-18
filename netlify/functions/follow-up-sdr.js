const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { contactId, followUpNumber } = JSON.parse(event.body);

    if (!contactId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Contact ID is required' })
      };
    }

    // Fetch contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError) {
      throw new Error(`Contact not found: ${contactError.message}`);
    }

    // Fetch recent activities for this contact
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) {
      console.warn('Could not fetch activities:', activitiesError.message);
    }

    // Generate follow-up content based on followUpNumber
    const followUpContent = await generateFollowUpContent(contact, followUpNumber, activities || []);

    // In a real implementation, you would send the email here
    // For now, we'll just return the generated content

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        contactId,
        subject: followUpContent.subject,
        body: followUpContent.body,
        sent: true, // In real implementation, this would be the actual send status
        followUpNumber,
        debug: followUpContent.debug
      })
    };

  } catch (error) {
    console.error('Follow-up SDR error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Follow-up generation failed',
        details: error.message
      })
    };
  }
};

async function generateFollowUpContent(contact, followUpNumber, activities) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Analyze previous interactions
  const hasReplied = activities.some(a => a.type === 'email_reply' || a.type === 'email_received');
  const lastActivity = activities[0];
  const daysSinceLastActivity = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  // Generate appropriate follow-up based on number and context
  let prompt = '';

  switch (followUpNumber) {
    case 1:
      prompt = `Generate a gentle first follow-up email to ${contact.firstName || contact.name} at ${contact.company}.

Contact details: ${JSON.stringify(contact)}
Last activity: ${lastActivity ? JSON.stringify(lastActivity) : 'No recent activity'}
Days since last contact: ${daysSinceLastActivity}
Has replied before: ${hasReplied}

The follow-up should:
- Reference any previous conversation
- Provide additional value or resources
- Ask a specific question to encourage response
- Keep it concise and friendly

Return JSON with "subject" and "body" fields.`;
      break;

    case 2:
      prompt = `Generate a second follow-up email to ${contact.firstName || contact.name} at ${contact.company}.

Contact details: ${JSON.stringify(contact)}
Last activity: ${lastActivity ? JSON.stringify(lastActivity) : 'No recent activity'}
Days since last contact: ${daysSinceLastActivity}
Has replied before: ${hasReplied}

The follow-up should:
- Acknowledge that this is a second attempt
- Offer something new or different value
- Create urgency or scarcity if appropriate
- Be more direct about next steps

Return JSON with "subject" and "body" fields.`;
      break;

    case 3:
      prompt = `Generate a third follow-up email to ${contact.firstName || contact.name} at ${contact.company}.

Contact details: ${JSON.stringify(contact)}
Last activity: ${lastActivity ? JSON.stringify(lastActivity) : 'No recent activity'}
Days since last contact: ${daysSinceLastActivity}
Has replied before: ${hasReplied}

The follow-up should:
- Be more assertive about the value proposition
- Include social proof or case studies if relevant
- Give them an easy out if they're not interested
- Consider this might be the last attempt

Return JSON with "subject" and "body" fields.`;
      break;

    default:
      prompt = `Generate a follow-up email (attempt #${followUpNumber}) to ${contact.firstName || contact.name} at ${contact.company}.

Contact details: ${JSON.stringify(contact)}
Last activity: ${lastActivity ? JSON.stringify(lastActivity) : 'No recent activity'}
Days since last contact: ${daysSinceLastActivity}
Has replied before: ${hasReplied}

Create a compelling follow-up that re-engages the contact.

Return JSON with "subject" and "body" fields.`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject,
      body: parsed.body,
      debug: {
        followUpNumber,
        daysSinceLastActivity,
        hasReplied,
        lastActivityType: lastActivity?.type
      }
    };
  } catch (parseError) {
    // If JSON parsing fails, return the raw content
    return {
      subject: `Follow-up #${followUpNumber} - ${contact.company}`,
      body: content,
      debug: {
        followUpNumber,
        daysSinceLastActivity,
        hasReplied,
        parseError: parseError.message
      }
    };
  }
}