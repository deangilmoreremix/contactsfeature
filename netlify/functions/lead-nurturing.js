const { stream } = require('@netlify/functions');
const { runDual } = require('./_stream/dual');
const { S } = require('./_stream/helpers');
const { supabase } = require('./_supabaseClient');
const { withAuth, errorResponse } = require('./_auth');
const { getOwnedContact } = require('./_ownership');

exports.handler = stream(withAuth(async (event, user) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const reqBody = JSON.parse(event.body);
    const {
      contact,
      nurtureStrategy = 'comprehensive',
      timeframe = '90d',
      businessGoals = [],
      aiProvider = 'openai'
    } = reqBody;

    if (!(await getOwnedContact(user.id, contact?.id))) return errorResponse(404, 'Contact not found');

    console.log('Lead nurturing request:', {
      contactId: contact.id,
      nurtureStrategy,
      aiProvider
    });

    // Same URL, two modes: JSON (as before) or SSE (status/delta/partial events + final `result`).
    return await runDual({
      event,
      body: reqBody,
      headers: CORS_HEADERS,
      options: buildOptions(contact, nurtureStrategy, timeframe, businessGoals),
      finalize: async (text) => {
        const result = shapeResult(text, nurtureStrategy, timeframe);

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
          success: true,
          data: result,
          provider: aiProvider,
          timestamp: new Date().toISOString()
        };
      },
    });
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
}));

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const OUTPUT_SCHEMA = S.obj({
  nurtureSequence: S.arr(S.obj({ week: S.num, theme: S.str, contentType: S.oneOf('email', 'social', 'webinar', 'case_study', 'demo'), objective: S.str, callToAction: S.str, successCriteria: S.strArr })),
  contentCalendar: S.arr(S.obj({ date: S.str, content: S.str, channel: S.str, purpose: S.str })),
  engagementTriggers: S.strArr,
  successMetrics: S.strArr,
  personalizationStrategy: S.str,
});

function buildOptions(contact, nurtureStrategy, timeframe, businessGoals) {
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

  return {
    model: 'default',
    effort: 'low',
    instructions: systemPrompt,
    input: userPrompt,
    schema: OUTPUT_SCHEMA,
    schemaName: 'lead_nurturing',
    store: false,
  };
}

function shapeResult(text, nurtureStrategy, timeframe) {
  const content = JSON.parse(text);
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
}
