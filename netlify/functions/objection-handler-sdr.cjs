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
    const { contactId, objection } = JSON.parse(event.body);

    if (!contactId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Contact ID is required' })
      };
    }

    console.log('[objection-handler-sdr] Starting for contact:', contactId, 'objection:', objection);

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

    // Generate objection handling content
    const responseContent = await generateObjectionResponse(contact, objection, activities || []);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        contactId,
        subject: responseContent.subject,
        body: responseContent.body,
        sent: true,
        objection: objection,
        debug: responseContent.debug
      })
    };

  } catch (error) {
    console.error('[objection-handler-sdr] Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Objection handling failed',
        details: error.message
      })
    };
  }
};

async function generateObjectionResponse(contact, objection, activities) {
  console.log('[objection-handler-sdr] Generating response for objection:', objection);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[objection-handler-sdr] OpenAI API key not configured');
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Generate a response to handle the objection: "${objection}"

Contact: ${contact.firstName || contact.name} at ${contact.company}
Contact details: ${JSON.stringify(contact)}
Recent activities: ${activities.length > 0 ? JSON.stringify(activities) : 'No recent activities'}

Create a professional response that:
- Acknowledges the objection empathetically
- Provides a thoughtful counter-argument or solution
- Offers value or alternative perspectives
- Includes a clear next step
- Maintains a helpful, consultative tone

Return JSON with "subject" and "body" fields.`;

  console.log('[objection-handler-sdr] Calling OpenAI API...');
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

  console.log('[objection-handler-sdr] OpenAI response status:', response.status);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[objection-handler-sdr] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[objection-handler-sdr] OpenAI response received');
  const content = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject,
      body: parsed.body,
      debug: {
        objection,
        activitiesCount: activities.length
      }
    };
  } catch (parseError) {
    console.error('[objection-handler-sdr] Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse AI response');
  }
}