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
    const { contactId } = JSON.parse(event.body);

    if (!contactId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Contact ID is required' })
      };
    }

    console.log('[reactivation-sdr] Starting for contact:', contactId);

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

    // Generate reactivation content
    const reactivationContent = await generateReactivationContent(contact, activities || []);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        contactId,
        subject: reactivationContent.subject,
        body: reactivationContent.body,
        sent: true,
        debug: reactivationContent.debug
      })
    };

  } catch (error) {
    console.error('[reactivation-sdr] Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Reactivation generation failed',
        details: error.message
      })
    };
  }
};

async function generateReactivationContent(contact, activities) {
  console.log('[reactivation-sdr] Generating content for contact:', contact.id);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[reactivation-sdr] OpenAI API key not configured');
    throw new Error('OpenAI API key not configured');
  }

  // Calculate days since last activity
  const lastActivity = activities[0];
  const daysSinceLastActivity = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 90;

  const prompt = `Generate a reactivation email to re-engage ${contact.firstName || contact.name} at ${contact.company}.

Contact details: ${JSON.stringify(contact)}
Last activity: ${lastActivity ? JSON.stringify(lastActivity) : 'No recent activity'}
Days since last contact: ${daysSinceLastActivity}

The reactivation email should:
- Reference the time gap since last contact
- Provide new value or updates that might interest them
- Ask about their current situation or needs
- Suggest reconnecting for a conversation
- Be warm and non-pushy

Return JSON with "subject" and "body" fields.`;

  console.log('[reactivation-sdr] Calling OpenAI API...');
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

  console.log('[reactivation-sdr] OpenAI response status:', response.status);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[reactivation-sdr] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[reactivation-sdr] OpenAI response received');
  const content = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject,
      body: parsed.body,
      debug: {
        daysSinceLastActivity,
        activitiesCount: activities.length
      }
    };
  } catch (parseError) {
    console.error('[reactivation-sdr] Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse AI response');
  }
}