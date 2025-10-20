const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const {
      contact,
      nurtureStrategy = 'comprehensive',
      timeframe = '90d',
      businessGoals = [],
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Lead nurturing request:', {
      contactId: contact.id,
      nurtureStrategy,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await generateWithOpenAI(contact, nurtureStrategy, timeframe, businessGoals);
        break;
      case 'gemini':
        result = await generateWithGemini(contact, nurtureStrategy, timeframe, businessGoals);
        break;
      default:
        result = await generateWithOpenAI(contact, nurtureStrategy, timeframe, businessGoals);
    }

    // Store nurturing strategy
    await supabase
      .from('lead_nurturing_strategies')
      .insert({
        contact_id: contact.id,
        nurture_strategy: nurtureStrategy,
        nurture_sequence: result.nurtureSequence,
        content_calendar: result.contentCalendar,
        engagement_triggers: result.engagementTriggers,
        success_metrics: result.successMetrics,
        ai_provider: aiProvider,
        created_at: new Date().toISOString()
      });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: result,
        provider: aiProvider,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Lead nurturing strategy generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Lead nurturing strategy generation failed',
        details: error.message
      })
    };
  }
};

async function generateWithOpenAI(contact, nurtureStrategy, timeframe, businessGoals) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert lead nurturing strategist. Create comprehensive nurture campaigns that build relationships, establish thought leadership, and guide prospects through the buyer's journey.`;

    const userPrompt = `Create a ${nurtureStrategy} lead nurturing strategy for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Interest Level: ${contact.interestLevel || 'unknown'}
Industry: ${contact.industry || 'Not specified'}
Business Goals: ${businessGoals.join(', ')}

Timeframe: ${timeframe}

Generate nurturing strategy with:
{
  "nurtureSequence": [
    {
      "week": "number",
      "theme": "string",
      "contentType": "email|social|webinar|case_study|demo",
      "objective": "string",
      "callToAction": "string",
      "successCriteria": []
    }
  ],
  "contentCalendar": [
    {
      "date": "ISO string",
      "content": "string",
      "channel": "string",
      "purpose": "string"
    }
  ],
  "engagementTriggers": ["trigger1", "trigger2"],
  "successMetrics": ["metric1", "metric2"],
  "personalizationStrategy": "string"
}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: systemPrompt,
        input: userPrompt,
        temperature: 0.3,
        text: {
          format: {
            type: "json_object"
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle Responses API format
    let content;
    if (data.output && data.output.length > 0) {
      const messageItem = data.output.find(item => item.type === 'message');
      if (messageItem && messageItem.content && messageItem.content.length > 0) {
        content = JSON.parse(messageItem.content[0].text);
      } else {
        throw new Error('No message content found in response output');
      }
    } else if (data.output_text) {
      content = JSON.parse(data.output_text);
    } else {
      throw new Error('No response content found');
    }

    return {
      nurtureSequence: content.nurtureSequence || [],
      contentCalendar: content.contentCalendar || [],
      engagementTriggers: content.engagementTriggers || [],
      successMetrics: content.successMetrics || [],
      personalizationStrategy: content.personalizationStrategy || '',
      nurtureStrategy,
      timeframe,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI lead nurturing generation failed:', error);
    throw error;
  }
}

async function generateWithGemini(contact, nurtureStrategy, timeframe, businessGoals) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Create a ${nurtureStrategy} lead nurturing strategy for this contact:

Contact: ${contact.name} at ${contact.company}
Business Goals: ${businessGoals.join(', ')}

Return JSON with nurtureSequence, contentCalendar, engagementTriggers, successMetrics, and personalizationStrategy.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseContent) {
      throw new Error('Invalid response from Gemini');
    }

    // Extract JSON from the response text
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const nurturingData = JSON.parse(jsonMatch[0]);

    return {
      nurtureSequence: nurturingData.nurtureSequence || [],
      contentCalendar: nurturingData.contentCalendar || [],
      engagementTriggers: nurturingData.engagementTriggers || [],
      successMetrics: nurturingData.successMetrics || [],
      personalizationStrategy: nurturingData.personalizationStrategy || '',
      nurtureStrategy,
      timeframe,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini lead nurturing generation failed:', error);
    throw error;
  }
}