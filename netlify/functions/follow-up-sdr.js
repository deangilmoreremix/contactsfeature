const { createClient } = require('@supabase/supabase-js');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

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
    const body = JSON.parse(event.body);
    const { contactId, followUpNumber: rawFollowUp } = body;
    const prefs = extractPreferences(body);

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Contact ID is required' })
      };
    }

    const followUpNum = parseInt(rawFollowUp) || 1;
    if (followUpNum < 1 || followUpNum > 10) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'followUpNumber must be between 1 and 10' })
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

    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) {
      console.warn('Could not fetch activities:', activitiesError.message);
    }

    const followUpContent = await generateFollowUpContent(contact, followUpNum, activities || [], prefs);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        subject: followUpContent.subject,
        body: followUpContent.body,
        sent: true,
        followUpNumber: followUpNum,
        debug: followUpContent.debug
      })
    };

  } catch (error) {
    console.error('Follow-up SDR error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Follow-up generation failed',
        details: error.message
      })
    };
  }
};

async function generateFollowUpContent(contact, followUpNumber, activities, prefs) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_THINKING_MODEL');
  const temperature = resolveTemperature(prefs, 0.7);
  const maxTokens = resolveMaxTokens(prefs, 1000);

  const hasReplied = activities.some(a => a.type === 'email_reply' || a.type === 'email_received');
  const lastActivity = activities[0];
  const daysSinceLastActivity = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const prefsBlock = buildPreferencesPromptBlock(prefs);
  const contactName = contact.firstName || contact.name || 'there';
  const company = contact.company || 'your company';

  const contextBlock = `Contact details: ${JSON.stringify(contact)}
Last activity: ${lastActivity ? JSON.stringify(lastActivity) : 'No recent activity'}
Days since last contact: ${daysSinceLastActivity}
Has replied before: ${hasReplied}`;

  let instructions = '';

  switch (followUpNumber) {
    case 1:
      instructions = `Generate a gentle first follow-up email to ${contactName} at ${company}.

${contextBlock}

The follow-up should:
- Reference any previous conversation
- Provide additional value or resources
- Ask a specific question to encourage response
- Keep it concise and friendly`;
      break;

    case 2:
      instructions = `Generate a second follow-up email to ${contactName} at ${company}.

${contextBlock}

The follow-up should:
- Acknowledge that this is a second attempt
- Offer something new or different value
- Create urgency or scarcity if appropriate
- Be more direct about next steps`;
      break;

    case 3:
      instructions = `Generate a third follow-up email to ${contactName} at ${company}.

${contextBlock}

The follow-up should:
- Be more assertive about the value proposition
- Include social proof or case studies if relevant
- Give them an easy out if they're not interested
- Consider this might be the last attempt`;
      break;

    default:
      instructions = `Generate a follow-up email (attempt #${followUpNumber}) to ${contactName} at ${company}.

${contextBlock}

Create a compelling follow-up that re-engages the contact.`;
  }

  const prompt = `${instructions}${prefsBlock}

Return JSON with "subject" and "body" fields.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: sdrModel,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
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
      debug: {
        model: sdrModel,
        temperature,
        followUpNumber,
        daysSinceLastActivity,
        hasReplied,
        lastActivityType: lastActivity?.type
      }
    };
  } catch (parseError) {
    return {
      subject: `Follow-up #${followUpNumber} - ${contact.company}`,
      body: content,
      debug: {
        model: sdrModel,
        temperature,
        followUpNumber,
        daysSinceLastActivity,
        hasReplied,
        parseError: parseError.message
      }
    };
  }
}
