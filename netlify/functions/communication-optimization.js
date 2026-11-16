const { stream } = require('@netlify/functions');
const { runDual } = require('./_stream/dual');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = stream(async (event) => {
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
      interactionHistory = [],
      timeframe = '30d',
      optimizationType = 'comprehensive',
      aiProvider = 'openai'
    } = reqBody;

    console.log('Communication optimization request:', {
      contactId: contact.id,
      timeframe,
      optimizationType,
      aiProvider
    });

    // Same URL, two modes: JSON (as before) or SSE (status/delta/partial events + final `result`).
    return await runDual({
      event,
      body: reqBody,
      headers: CORS_HEADERS,
      options: buildOptions(contact, interactionHistory, timeframe, optimizationType),
      finalize: async (text) => {
        const result = shapeResult(text, optimizationType);

        await supabase
          .from('communication_optimizations')
          .insert({
            contact_id: contact.id,
            optimization_type: optimizationType,
            optimal_timing: result.optimalTiming,
            communication_style: result.communicationStyle,
            channel_preferences: result.channelPreferences,
            recommendations: result.recommendations,
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
    console.error('Communication optimization failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Communication optimization failed',
        details: error.message
      })
    };
  }
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const OUTPUT_SCHEMA = {
              type: "object",
              properties: {
                optimalTiming: {
                  type: "object",
                  properties: {
                    bestDay: { type: "string" },
                    bestTime: { type: "string" },
                    timezone: { type: "string" }
                  },
                  required: ["bestDay", "bestTime", "timezone"]
                },
                communicationStyle: {
                  type: "object",
                  properties: {
                    tone: { type: "string" },
                    frequency: { type: "string" },
                    approach: { type: "string" }
                  },
                  required: ["tone", "frequency", "approach"]
                },
                channelPreferences: {
                  type: "object",
                  properties: {
                    primary: { type: "string" },
                    secondary: { type: "string" },
                    avoid: { type: "array", items: { type: "string" } }
                  },
                  required: ["primary", "secondary", "avoid"]
                },
                engagementPatterns: {
                  type: "object",
                  properties: {
                    peakHours: { type: "array", items: { type: "string" } },
                    responseTime: { type: "string" },
                    preferences: { type: "array", items: { type: "string" } }
                  },
                  required: ["peakHours", "responseTime", "preferences"]
                },
                recommendations: { type: "array", items: { type: "string" } },
                nextSteps: { type: "array", items: { type: "string" } }
              },
              required: ["optimalTiming", "communicationStyle", "channelPreferences", "engagementPatterns", "recommendations", "nextSteps"]
            };

function buildOptions(contact, interactionHistory, timeframe, optimizationType) {
    const systemPrompt = `You are an expert communication strategist specializing in B2B sales optimization. Analyze interaction patterns and provide personalized communication strategies.`;

    const userPrompt = `Analyze communication patterns and optimize strategy for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Timeframe: ${timeframe}
Interaction History: ${JSON.stringify(interactionHistory)}

Provide optimization analysis with:
{
  "optimalTiming": {"bestDay": "string", "bestTime": "string", "timezone": "string"},
  "communicationStyle": {"tone": "string", "frequency": "string", "approach": "string"},
  "channelPreferences": {"primary": "string", "secondary": "string", "avoid": []},
  "engagementPatterns": {"peakHours": [], "responseTime": "string", "preferences": []},
  "recommendations": ["action1", "action2"],
  "nextSteps": ["immediate", "short_term", "long_term"]
}`;

  return {
    model: 'default',
    effort: 'low',
    instructions: systemPrompt,
    input: userPrompt,
    schema: OUTPUT_SCHEMA,
    schemaName: 'communication_optimization',
    store: false,
  };
}

function shapeResult(text, optimizationType) {
  const content = JSON.parse(text);
  return {
      optimalTiming: content.optimalTiming || { bestDay: 'Tuesday', bestTime: '10:00', timezone: 'UTC' },
      communicationStyle: content.communicationStyle || { tone: 'professional', frequency: 'weekly', approach: 'consultative' },
      channelPreferences: content.channelPreferences || { primary: 'email', secondary: 'phone', avoid: [] },
      engagementPatterns: content.engagementPatterns || { peakHours: ['9-11', '14-16'], responseTime: '24h', preferences: [] },
      recommendations: content.recommendations || [],
      nextSteps: content.nextSteps || [],
      optimizationType,
      analyzed: new Date().toISOString()
    };
}
