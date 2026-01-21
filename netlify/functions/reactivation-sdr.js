const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { contactId } = JSON.parse(event.body);

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Contact ID is required' })
      };
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (contactError) {
      throw new Error(`Database error: ${contactError.message}`);
    }

    if (!contact) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    const lastActivity = activities && activities.length > 0 ? activities[0] : null;
    const daysSinceLastContact = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 90;

    const emailContent = await generateReactivationEmail(contact, activities || [], daysSinceLastContact);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        subject: emailContent.subject,
        body: emailContent.body,
        sent: true,
        daysSinceLastContact,
        debug: emailContent.debug
      })
    };

  } catch (error) {
    console.error('Reactivation SDR error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Reactivation email generation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};

async function generateReactivationEmail(contact, activities, daysSinceLastContact) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const contactName = contact.firstName || contact.name || 'there';
  const company = contact.company || 'your company';

  const prompt = `Generate a reactivation email to re-engage a dormant lead.

Contact: ${contactName} at ${company}
Days since last contact: ${daysSinceLastContact}
Previous interactions: ${JSON.stringify(activities.slice(0, 3))}
Contact details: ${JSON.stringify({
  title: contact.title || contact.jobTitle,
  email: contact.email,
  industry: contact.industry,
  notes: contact.notes
})}

The reactivation email should:
- Acknowledge the time gap without being guilt-tripping
- Mention something that might have changed (industry trends, new features, etc.)
- Provide a compelling reason to re-engage
- Be warm and non-pushy
- Include a simple call-to-action

Return JSON with "subject" and "body" fields.`;

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
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    return {
      subject: parsed.subject,
      body: parsed.body,
      debug: { model: 'gpt-4o', daysSinceLastContact }
    };
  } catch (parseError) {
    return {
      subject: `It's been a while, ${contactName}`,
      body: content,
      debug: { model: 'gpt-4o', parseError: parseError instanceof Error ? parseError.message : String(parseError) }
    };
  }
}
