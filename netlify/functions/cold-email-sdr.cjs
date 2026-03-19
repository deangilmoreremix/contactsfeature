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

    console.log('[cold-email-sdr] Starting for contact:', contactId);

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

    // Generate cold email content
    const emailContent = await generateColdEmailContent(contact, activities || []);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        contactId,
        subject: emailContent.subject,
        body: emailContent.body,
        sent: true, // In real implementation, this would be the actual send status
        debug: emailContent.debug
      })
    };

  } catch (error) {
    console.error('[cold-email-sdr] Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Cold email generation failed',
        details: error.message
      })
    };
  }
};

async function generateColdEmailContent(contact, activities) {
  console.log('[cold-email-sdr] Generating content for contact:', contact.id);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[cold-email-sdr] OpenAI API key not configured');
    throw new Error('OpenAI API key not configured');
  }

  // Check if they've been contacted before
  const hasBeenContacted = activities.some(a => a.type === 'email_sent' || a.type === 'email_reply');

  const prompt = `Generate a personalized cold email to ${contact.firstName || contact.name} at ${contact.company}.

Contact details: ${JSON.stringify(contact)}
Previous activities: ${activities.length > 0 ? JSON.stringify(activities) : 'No previous activities'}
Has been contacted before: ${hasBeenContacted}

The cold email should:
- Be personalized using available contact information
- Have a compelling subject line
- Provide immediate value or insight
- Include a clear call-to-action
- Be concise but engaging
- Avoid sounding salesy

Return JSON with "subject" and "body" fields.`;

  console.log('[cold-email-sdr] Calling OpenAI API...');
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

  console.log('[cold-email-sdr] OpenAI response status:', response.status);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[cold-email-sdr] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[cold-email-sdr] OpenAI response received');
  const content = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject,
      body: parsed.body,
      debug: {
        hasBeenContacted,
        activitiesCount: activities.length
      }
    };
  } catch (parseError) {
    console.error('[cold-email-sdr] Failed to parse OpenAI response:', content);
    throw new Error('Failed to parse AI response');
  }
}