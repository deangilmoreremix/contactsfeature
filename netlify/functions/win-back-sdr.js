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
      .limit(20);

    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(5);

    const winBackContent = await generateWinBackEmail(contact, activities || [], deals || []);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        subject: winBackContent.subject,
        body: winBackContent.body,
        sent: true,
        churnReason: winBackContent.churnReason,
        winBackOffer: winBackContent.winBackOffer,
        debug: winBackContent.debug
      })
    };

  } catch (error) {
    console.error('Win-back SDR error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Win-back email generation failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};

async function generateWinBackEmail(contact, activities, deals) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const contactName = contact.firstName || contact.name || 'there';
  const company = contact.company || 'your company';

  const lostDeal = deals.find(d => d.status === 'lost' || d.stage === 'lost');
  const churnIndicators = activities.filter(a =>
    a.type === 'cancellation' ||
    a.type === 'churn' ||
    a.outcome === 'lost'
  );

  const prompt = `You are creating a win-back campaign email for a churned or lost customer.

Contact: ${contactName} at ${company}
Title: ${contact.title || contact.jobTitle || 'Not specified'}
Industry: ${contact.industry || 'Not specified'}

Deal history: ${JSON.stringify(deals.slice(0, 3))}
Recent activities: ${JSON.stringify(activities.slice(0, 5))}
Lost deal info: ${lostDeal ? JSON.stringify(lostDeal) : 'No specific lost deal found'}
Churn indicators: ${JSON.stringify(churnIndicators)}

Analyze the context and:
1. Identify the likely churn reason
2. Craft a personalized win-back offer
3. Write a compelling win-back email

Return JSON with:
- "subject": Email subject line
- "body": Full email body
- "churnReason": Your analysis of why they churned (1-2 sentences)
- "winBackOffer": The specific offer you're making to win them back

The email should:
- Acknowledge the past relationship
- Show you understand their potential concerns
- Present a compelling reason to return
- Include a special offer or incentive
- Have a clear, low-friction call to action`;

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
      max_tokens: 1200
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
      churnReason: parsed.churnReason || 'Unable to determine specific churn reason',
      winBackOffer: parsed.winBackOffer || 'Special returning customer offer',
      debug: { model: 'gpt-4o', hasLostDeal: !!lostDeal }
    };
  } catch (parseError) {
    return {
      subject: `We'd love to have you back, ${contactName}`,
      body: content,
      churnReason: 'Analysis unavailable',
      winBackOffer: 'Contact us for a special returning customer offer',
      debug: { model: 'gpt-4o', parseError: parseError instanceof Error ? parseError.message : String(parseError) }
    };
  }
}
