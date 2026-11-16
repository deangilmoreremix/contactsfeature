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

    const response = await responsesFetch({
        model: 'gpt-4o',
        instructions: systemPrompt,
        input: userPrompt,
        temperature: 0.2,
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
