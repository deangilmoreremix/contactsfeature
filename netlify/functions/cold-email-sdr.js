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

    const emailContent = await generateColdEmail(contact);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        subject: emailContent.subject,
        body: emailContent.body,
        sent: true,
        debug: emailContent.debug
      })
    };

  } catch (error) {
    console.error('Cold email SDR error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Cold email generation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};

async function generateColdEmail(contact) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const contactName = contact.firstName || contact.name || 'there';
  const company = contact.company || 'your company';
  const title = contact.title || contact.jobTitle || '';

  const prompt = `Generate a personalized cold email to ${contactName}${title ? ` (${title})` : ''} at ${company}.

Contact details: ${JSON.stringify({
  name: contactName,
  company,
  title,
  email: contact.email,
  industry: contact.industry,
  notes: contact.notes
})}

The cold email should:
- Have an attention-grabbing subject line
- Open with something relevant to them or their company
- Clearly articulate value proposition
- Include a soft call-to-action (not pushy)
- Be concise (under 150 words)
- Sound human, not templated

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
      debug: { model: 'gpt-4o', contactName, company }
    };
  } catch (parseError) {
    return {
      subject: `Quick question for ${contactName} at ${company}`,
      body: content,
      debug: { model: 'gpt-4o', parseError: parseError instanceof Error ? parseError.message : String(parseError) }
    };
  }
}
