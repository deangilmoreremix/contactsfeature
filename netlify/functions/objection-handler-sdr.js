const { supabase } = require('./_supabaseClient');
const { extractPreferences, buildPreferencesPromptBlock, resolveModel, resolveTemperature, resolveMaxTokens } = require('./_sdrPreferences');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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
    const { contactId, objection } = body;
    const prefs = extractPreferences(body);

    if (!contactId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Contact ID is required' })
      };
    }

    if (!objection || !objection.trim()) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Objection text is required' })
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

    const objectionResponse = await handleObjection(contact, objection, prefs);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        contactId,
        objection,
        response: objectionResponse.response,
        sent: true,
        confidence: objectionResponse.confidence,
        debug: objectionResponse.debug
      })
    };

  } catch (error) {
    console.error('Objection handler SDR error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Objection handling failed',
        details: error instanceof Error ? error.message : String(error)
      })
    };
  }
};

async function handleObjection(contact, objection, prefs) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const sdrModel = resolveModel(prefs, 'gpt-5.2-thinking', 'SMARTCRM_THINKING_MODEL');
  const temperature = resolveTemperature(prefs, 0.7);
  const maxTokens = resolveMaxTokens(prefs, 1000);
  const contactName = contact.firstName || contact.name || 'the prospect';
  const company = contact.company || 'their company';

  const prefsBlock = buildPreferencesPromptBlock(prefs);

  const prompt = `You are an expert sales development representative handling objections.

Contact: ${contactName} at ${company}
Title: ${contact.title || contact.jobTitle || 'Not specified'}
Industry: ${contact.industry || 'Not specified'}

The prospect raised this objection: "${objection}"

Common objection categories:
- Price/Budget: "too expensive", "no budget", "need to cut costs"
- Timing: "not now", "maybe next quarter", "bad timing"
- Competition: "we use X competitor", "happy with current solution"
- Authority: "need to check with my boss", "not my decision"
- Need: "we don't need this", "not a priority"
- Trust: "never heard of you", "need references"

Craft a professional, empathetic response that:
1. Acknowledges their concern without being dismissive
2. Provides relevant context or reframe
3. Offers a path forward
4. Maintains the relationship even if they're not ready${prefsBlock}

Return JSON with:
- "response": The full email response text
- "confidence": A number from 0.0 to 1.0 indicating how confident you are in this response
- "objectionType": The category this objection falls into`;

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
      response: parsed.response,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      debug: { model: sdrModel, temperature, objectionType: parsed.objectionType }
    };
  } catch (parseError) {
    return {
      response: content,
      confidence: 0.6,
      debug: { model: sdrModel, temperature, parseError: parseError instanceof Error ? parseError.message : String(parseError) }
    };
  }
}
