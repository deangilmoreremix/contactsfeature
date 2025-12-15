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
      interactionHistory = [],
      timeframe = '30d',
      optimizationType = 'comprehensive',
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Communication optimization request:', {
      contactId: contact.id,
      timeframe,
      optimizationType,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await optimizeWithOpenAI(contact, interactionHistory, timeframe, optimizationType);
        break;
      case 'gemini':
        result = await optimizeWithGemini(contact, interactionHistory, timeframe, optimizationType);
        break;
      default:
        result = await optimizeWithOpenAI(contact, interactionHistory, timeframe, optimizationType);
    }

    // Store optimization results
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
};

async function optimizeWithOpenAI(contact, interactionHistory, timeframe, optimizationType) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

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
        temperature: 0.2,
        text: {
          format: {
            type: "json_schema",
            name: "communication_optimization",
            strict: true,
            schema: {
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
            }
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
      const textOutput = data.output.find(item => item.type === 'text');
      if (textOutput && textOutput.text) {
        content = JSON.parse(textOutput.text);
      } else {
        throw new Error('No text output found in response');
      }
    } else {
      throw new Error('No response output found');
    }

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
  } catch (error) {
    console.error('OpenAI communication optimization failed:', error);
    throw error;
  }
}

async function optimizeWithGemini(contact, interactionHistory, timeframe, optimizationType) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Optimize communication strategy for this contact:

Contact: ${contact.name} at ${contact.company}
Timeframe: ${timeframe}
Interactions: ${JSON.stringify(interactionHistory)}

Return JSON with optimalTiming, communicationStyle, channelPreferences, engagementPatterns, recommendations, and nextSteps.`;

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
          temperature: 0.2,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 800
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

    const optimization = JSON.parse(jsonMatch[0]);

    return {
      optimalTiming: optimization.optimalTiming || { bestDay: 'Tuesday', bestTime: '10:00', timezone: 'UTC' },
      communicationStyle: optimization.communicationStyle || { tone: 'professional', frequency: 'weekly', approach: 'consultative' },
      channelPreferences: optimization.channelPreferences || { primary: 'email', secondary: 'phone', avoid: [] },
      engagementPatterns: optimization.engagementPatterns || { peakHours: ['9-11', '14-16'], responseTime: '24h', preferences: [] },
      recommendations: optimization.recommendations || [],
      nextSteps: optimization.nextSteps || [],
      optimizationType,
      analyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini communication optimization failed:', error);
    throw error;
  }
}