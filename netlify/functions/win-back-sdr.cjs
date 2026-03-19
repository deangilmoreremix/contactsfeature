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

    console.log('[win-back-sdr] Starting for contact:', contactId);

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

    // Generate win-back content
    const winBackContent = await generateWinBackContent(contact, activities || []);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        contactId,
        subject: winBackContent.subject,
        body: winBackContent.body,
        sent: true,
        debug: winBackContent.debug
      })
    };

  } catch (error) {
    console.error('[win-back-sdr] Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Win-back generation failed',
        details: error.message
      })
    };
  }
};

async function generateWinBackContent(contact, activities) {
  console.log('[win-back-sdr] Generating content for contact:', contact.id);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[win-back-sdr] OpenAI API key not configured');
    throw new Error('OpenAI API key not configured');
  }

  // Find lost deal information
  const lostDeal = activities.find(a => a.type === 'deal_lost' || a.status === 'lost');

  const prompt = `Generate a win-back email to ${contact.firstName || contact.name} at ${contact.company}.

Contact details: ${JSON.stringify(contact)}
Lost deal info: ${lostDeal ? JSON.stringify(lostDeal) : 'No specific lost deal found'}
Recent activities: ${activities.length > 0 ? JSON.stringify(activities) : 'No recent activities'}

The win-back email should:
- Acknowledge the previous relationship
- Reference what was lost or the previous engagement
- Offer new value or changes that might make them reconsider
- Suggest a low-pressure conversation
- Focus on their needs and success

Return JSON with "subject" and "body" fields.`;

  console.log('[win-back-sdr] Calling OpenAI API...');
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

  console.log('[win-back-sdr] OpenAI response status:', response.status);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[win-back-sdr] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[win-back-sdr] OpenAI response received');
  const content = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject,
      body: parsed.body,
      debug: {
        hasLostDeal: !!lostDeal,
        activitiesCount: activities.length
      }
    };
  } catch (parseError) {
    console.error('[win-back-sdr] Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse AI response');
  }
}