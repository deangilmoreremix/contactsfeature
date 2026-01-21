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

    const discoveryResult = await performDiscovery(contact, activities || []);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        research: discoveryResult.research,
        qualification: discoveryResult.qualification,
        nextActions: discoveryResult.nextActions
      })
    };

  } catch (error) {
    console.error('Discovery SDR error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Discovery research failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};

async function performDiscovery(contact, activities) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const contactName = contact.firstName || contact.name || 'Unknown';
  const company = contact.company || 'Unknown Company';
  const title = contact.title || contact.jobTitle || '';

  const prompt = `You are a Sales Development Representative performing discovery research on a prospect.

Contact: ${contactName}
Title: ${title || 'Not specified'}
Company: ${company}
Email: ${contact.email || 'Not specified'}
Industry: ${contact.industry || 'Not specified'}
LinkedIn: ${contact.linkedin || 'Not available'}
Website: ${contact.website || 'Not available'}
Notes: ${contact.notes || 'None'}

Recent activities: ${JSON.stringify(activities.slice(0, 5))}

Perform comprehensive discovery research and return JSON with:
1. "research": {
   "linkedin": "Summary of what we can infer about their LinkedIn presence and role",
   "company": "Key insights about their company, size, funding, recent news",
   "triggers": ["List of 3-5 potential trigger events or pain points"]
}
2. "qualification": {
   "score": number from 1-10 based on fit,
   "reasons": ["3-4 reasons for the score"]
}
3. "nextActions": ["List of 3-5 recommended next actions for the SDR"]

Be specific and actionable in your analysis.`;

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
      max_tokens: 1500
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
      research: parsed.research || {
        linkedin: 'Unable to generate LinkedIn summary',
        company: 'Unable to generate company insights',
        triggers: []
      },
      qualification: parsed.qualification || { score: 5, reasons: ['Default score'] },
      nextActions: parsed.nextActions || ['Review contact manually']
    };
  } catch (parseError) {
    return {
      research: {
        linkedin: `${contactName} at ${company}`,
        company: `${company} - further research needed`,
        triggers: ['Initial outreach recommended']
      },
      qualification: { score: 5, reasons: ['Unable to fully analyze - manual review needed'] },
      nextActions: ['Perform manual LinkedIn research', 'Visit company website', 'Schedule discovery call']
    };
  }
}
