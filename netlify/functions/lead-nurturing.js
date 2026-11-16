const { responsesFetch } = require('./_responses');
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

    const response = await responsesFetch({
        model: 'gpt-4o',
        instructions: systemPrompt,
        input: userPrompt,
        temperature: 0.3,
        text: {
          format: {
            type: "json_object"
          }
        }
      });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    const content = JSON.parse(data.output_text);

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
