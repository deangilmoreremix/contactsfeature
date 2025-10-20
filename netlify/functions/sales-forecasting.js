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
      timeframe = '90d',
      predictionType = 'conversion',
      businessContext = '',
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Sales forecasting request:', {
      contactId: contact.id,
      timeframe,
      predictionType,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await forecastWithOpenAI(contact, interactionHistory, timeframe, predictionType, businessContext);
        break;
      case 'gemini':
        result = await forecastWithGemini(contact, interactionHistory, timeframe, predictionType, businessContext);
        break;
      default:
        result = await forecastWithOpenAI(contact, interactionHistory, timeframe, predictionType, businessContext);
    }

    // Store forecasting results
    await supabase
      .from('sales_forecasts')
      .insert({
        contact_id: contact.id,
        prediction_type: predictionType,
        timeframe,
        conversion_probability: result.conversionProbability,
        expected_value: result.expectedValue,
        optimal_actions: result.optimalActions,
        risk_factors: result.riskFactors,
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
    console.error('Sales forecasting failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Sales forecasting failed',
        details: error.message
      })
    };
  }
};

async function forecastWithOpenAI(contact, interactionHistory, timeframe, predictionType, businessContext) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert sales forecaster and predictive analytics specialist. Analyze contact data and interaction history to predict outcomes and recommend optimal actions.`;

    const userPrompt = `Generate sales forecast for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Current Stage: ${contact.status || 'prospect'}
Interest Level: ${contact.interestLevel || 'unknown'}
Interaction History: ${JSON.stringify(interactionHistory)}
Timeframe: ${timeframe}
Prediction Type: ${predictionType}
Business Context: ${businessContext}

Generate comprehensive forecast with:
{
  "conversionProbability": "number 0-100",
  "expectedValue": {"amount": "number", "currency": "string", "confidence": "number"},
  "timeline": {"estimatedClose": "string", "milestones": []},
  "optimalActions": [
    {
      "action": "string",
      "timing": "string",
      "priority": "high|medium|low",
      "expectedImpact": "string"
    }
  ],
  "riskFactors": ["factor1", "factor2"],
  "confidence": "number 0-100",
  "recommendations": ["rec1", "rec2"]
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
      conversionProbability: content.conversionProbability || 0,
      expectedValue: content.expectedValue || { amount: 0, currency: 'USD', confidence: 50 },
      timeline: content.timeline || { estimatedClose: '', milestones: [] },
      optimalActions: content.optimalActions || [],
      riskFactors: content.riskFactors || [],
      confidence: content.confidence || 75,
      recommendations: content.recommendations || [],
      predictionType,
      timeframe,
      forecasted: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI sales forecasting failed:', error);
    throw error;
  }
}

async function forecastWithGemini(contact, interactionHistory, timeframe, predictionType, businessContext) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Generate sales forecast for this contact:

Contact: ${contact.name} at ${contact.company}
Interactions: ${JSON.stringify(interactionHistory)}
Timeframe: ${timeframe}
Prediction Type: ${predictionType}

Return JSON with conversionProbability, expectedValue, timeline, optimalActions, riskFactors, confidence, and recommendations.`;

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

    const forecast = JSON.parse(jsonMatch[0]);

    return {
      conversionProbability: forecast.conversionProbability || 0,
      expectedValue: forecast.expectedValue || { amount: 0, currency: 'USD', confidence: 50 },
      timeline: forecast.timeline || { estimatedClose: '', milestones: [] },
      optimalActions: forecast.optimalActions || [],
      riskFactors: forecast.riskFactors || [],
      confidence: forecast.confidence || 75,
      recommendations: forecast.recommendations || [],
      predictionType,
      timeframe,
      forecasted: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini sales forecasting failed:', error);
    throw error;
  }
}