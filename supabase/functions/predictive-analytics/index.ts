import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

interface PredictiveRequest {
  contactId: string;
  contact: any;
  predictionTypes: ('conversion' | 'response_time' | 'deal_size' | 'churn_risk' | 'engagement')[];
  timeframe?: '30d' | '90d' | '6m' | '1y';
  context?: {
    dealValue?: number;
    competitorActivity?: boolean;
    economicFactors?: string[];
    interactionHistory?: any[];
  };
}

interface TrendAnalysisRequest {
  contactId: string;
  contact: any;
  timeframe: '30d' | '90d' | '6m' | '1y';
  metrics: string[];
}

interface RiskAssessmentRequest {
  contactId: string;
  contact: any;
  context?: {
    dealValue?: number;
    competitorActivity?: boolean;
    economicFactors?: string[];
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing required environment variables',
          details: 'SUPABASE_URL and SUPABASE_ANON_KEY must be configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const hasOpenAI = !!openaiApiKey;
    const hasGemini = !!geminiApiKey;
    
    // Check if any AI provider is configured
    const hasAiProvider = hasOpenAI || hasGemini;
    
    if (!hasAiProvider) {
      console.warn('No AI provider API keys configured');
      return new Response(
        JSON.stringify({
          error: 'AI providers not configured',
          details: 'OpenAI or Gemini API keys are required for predictive analytics'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();

    if (req.method === 'POST') {
      switch (endpoint) {
        case 'predictions':
          return await handlePredictions(await req.json(), hasOpenAI, hasGemini, openaiApiKey, geminiApiKey);
        
        case 'trends':
          return await handleTrendAnalysis(await req.json(), hasOpenAI, hasGemini, openaiApiKey, geminiApiKey);
        
        case 'risk-assessment':
          return await handleRiskAssessment(await req.json(), hasOpenAI, hasGemini, openaiApiKey, geminiApiKey);
        
        case 'health':
          // Health check endpoint
          return new Response(
            JSON.stringify({
              status: 'healthy',
              timestamp: new Date().toISOString(),
              providers: {
                openai: !!openaiApiKey,
                gemini: !!geminiApiKey
              }
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        
        default:
          // Default endpoint - handle general predictive analytics
          return await handlePredictions(await req.json(), hasOpenAI, hasGemini, openaiApiKey, geminiApiKey);
      }
    }

    // Handle GET requests for health check
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const endpoint = url.pathname.split('/').pop();
      
      if (endpoint === 'health') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            providers: {
              openai: !!openaiApiKey,
              gemini: !!geminiApiKey
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        details: 'This endpoint only supports POST requests'
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Predictive analytics error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handlePredictions(
  request: PredictiveRequest,
  hasOpenAI: boolean,
  hasGemini: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
) {
  const { contactId, contact, predictionTypes, timeframe = '90d', context } = request;
  
  if (!contactId || !contact || !predictionTypes?.length) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required parameters',
        details: 'contactId, contact data, and predictionTypes are required'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const predictions = [];
  
  for (const predictionType of predictionTypes) {
    try {
      let prediction;
      
      // Use GPT-5 (GPT-4o as placeholder) for complex predictions, Gemini/Gemma for simpler ones
      if (predictionType === 'conversion' || predictionType === 'deal_size') {
        // Complex predictions - prefer GPT-5 for accuracy
        if (hasOpenAI) {
          prediction = await generateComplexPredictionWithOpenAI(contactId, contact, predictionType, timeframe, context, openaiApiKey!);
        } else if (hasGemini) {
          prediction = await generateComplexPredictionWithGemini(contactId, contact, predictionType, timeframe, context, geminiApiKey!);
        }
      } else {
        // Simpler predictions - prefer Gemini/Gemma for cost efficiency
        if (hasGemini) {
          prediction = await generateSimplePredictionWithGemini(contactId, contact, predictionType, timeframe, context, geminiApiKey!);
        } else if (hasOpenAI) {
          prediction = await generateSimplePredictionWithOpenAI(contactId, contact, predictionType, timeframe, context, openaiApiKey!);
        }
      }
      
      if (prediction) {
        predictions.push(prediction);
      }
    } catch (error) {
      console.error(`Failed to generate ${predictionType} prediction:`, error);
      predictions.push({
        predictionType,
        value: 0,
        confidence: 0,
        reasoning: ['Prediction failed'],
        timeframe,
        error: error.message
      });
    }
  }

  return new Response(
    JSON.stringify({
      contactId,
      predictions,
      timestamp: new Date().toISOString(),
      provider: hasOpenAI ? 'openai' : 'gemini',
      model: hasOpenAI ? 'gpt-4o' : 'gemini-1.5-pro'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function handleTrendAnalysis(
  request: TrendAnalysisRequest,
  hasOpenAI: boolean,
  hasGemini: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
) {
  const { contactId, contact, timeframe, metrics } = request;
  
  if (!contactId || !contact || !metrics?.length) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required parameters',
        details: 'contactId, contact data, and metrics are required'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    let analysis;
    
    // Use Gemini Pro for trend analysis (good at pattern recognition)
    if (hasGemini) {
      analysis = await generateTrendAnalysisWithGemini(contactId, contact, timeframe, metrics, geminiApiKey!);
    } else if (hasOpenAI) {
      analysis = await generateTrendAnalysisWithOpenAI(contactId, contact, timeframe, metrics, openaiApiKey!);
    }

    return new Response(
      JSON.stringify(analysis),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Trend analysis failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Trend analysis failed', 
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleRiskAssessment(
  request: RiskAssessmentRequest,
  hasOpenAI: boolean,
  hasGemini: boolean,
  openaiApiKey?: string,
  geminiApiKey?: string
) {
  const { contactId, contact, context } = request;
  
  if (!contactId || !contact) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing required parameters',
        details: 'contactId and contact data are required'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    let assessment;
    
    // Use GPT-5 for risk assessment (requires complex reasoning)
    if (hasOpenAI) {
      assessment = await generateRiskAssessmentWithOpenAI(contactId, contact, context, openaiApiKey!);
    } else if (hasGemini) {
      assessment = await generateRiskAssessmentWithGemini(contactId, contact, context, geminiApiKey!);
    }

    return new Response(
      JSON.stringify(assessment),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Risk assessment failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Risk assessment failed', 
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Complex predictions using GPT-5 (GPT-4o as placeholder)
async function generateComplexPredictionWithOpenAI(
  contactId: string,
  contact: any,
  predictionType: string,
  timeframe: string,
  context: any,
  apiKey: string
) {
  const model = 'gpt-4o'; // Placeholder for GPT-5
  
  const prompt = `As an expert predictive analytics AI, analyze this contact data and generate ${predictionType} predictions:

Contact Data:
${JSON.stringify(contact, null, 2)}

Timeframe: ${timeframe}
Context: ${JSON.stringify(context || {}, null, 2)}

For ${predictionType} prediction, provide:
- value: specific predicted value (percentage for conversion/churn, hours for response_time, dollars for deal_size)
- confidence: 0-100 confidence level
- reasoning: array of 3-5 key factors influencing this prediction
- factors: array of objects with {factor, impact (-1 to 1), weight (0-1)}
- timeframe: when this prediction applies

Use advanced reasoning and consider:
- Historical patterns and behavior
- Industry benchmarks and trends
- Contact profile characteristics
- Market conditions and timing
- Psychological and business factors

Return a JSON object only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an advanced predictive analytics AI with deep expertise in sales psychology, market analysis, and customer behavior prediction. Provide data-driven, actionable predictions with clear reasoning.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  const result = JSON.parse(content);
  return {
    predictionType,
    ...result,
    provider: 'openai',
    model,
    timestamp: new Date().toISOString()
  };
}

// Complex predictions using Gemini Pro
async function generateComplexPredictionWithGemini(
  contactId: string,
  contact: any,
  predictionType: string,
  timeframe: string,
  context: any,
  apiKey: string
) {
  const model = 'gemini-1.5-pro'; // Use Pro for complex reasoning
  
  const prompt = `As an expert predictive analytics AI, analyze this contact data and generate ${predictionType} predictions:

Contact Data:
${JSON.stringify(contact, null, 2)}

Timeframe: ${timeframe}
Context: ${JSON.stringify(context || {}, null, 2)}

For ${predictionType} prediction, provide:
- value: specific predicted value (percentage for conversion/churn, hours for response_time, dollars for deal_size)
- confidence: 0-100 confidence level
- reasoning: array of 3-5 key factors influencing this prediction
- factors: array of objects with {factor, impact (-1 to 1), weight (0-1)}
- timeframe: when this prediction applies

Use advanced reasoning and consider:
- Historical patterns and behavior
- Industry benchmarks and trends
- Contact profile characteristics
- Market conditions and timing
- Psychological and business factors

Return a JSON object only.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  const result = JSON.parse(content);
  return {
    predictionType,
    ...result,
    provider: 'gemini',
    model,
    timestamp: new Date().toISOString()
  };
}

// Simple predictions using Gemma models for cost efficiency
async function generateSimplePredictionWithGemini(
  contactId: string,
  contact: any,
  predictionType: string,
  timeframe: string,
  context: any,
  apiKey: string
) {
  const model = 'gemma-2-9b-it'; // Use Gemma for simpler predictions
  
  const prompt = `Analyze this contact and predict ${predictionType}:

Contact: ${JSON.stringify(contact, null, 2)}
Timeframe: ${timeframe}

Provide ${predictionType} prediction with:
- value: predicted value
- confidence: 0-100 confidence
- reasoning: key factors (3-5 items)
- timeframe: prediction window

Return JSON object only.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
        maxOutputTokens: 512
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }
  
  const result = JSON.parse(jsonMatch[0]);
  return {
    predictionType,
    ...result,
    provider: 'gemini',
    model,
    timestamp: new Date().toISOString()
  };
}

// Simple predictions using OpenAI Mini
async function generateSimplePredictionWithOpenAI(
  contactId: string,
  contact: any,
  predictionType: string,
  timeframe: string,
  context: any,
  apiKey: string
) {
  const model = 'gpt-4o-mini';
  
  const prompt = `Analyze this contact and predict ${predictionType}:

Contact: ${JSON.stringify(contact, null, 2)}
Timeframe: ${timeframe}

Provide ${predictionType} prediction with:
- value: predicted value
- confidence: 0-100 confidence
- reasoning: key factors (3-5 items)
- timeframe: prediction window

Return JSON object only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a predictive analytics expert specializing in sales and customer behavior predictions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  const result = JSON.parse(content);
  return {
    predictionType,
    ...result,
    provider: 'openai',
    model,
    timestamp: new Date().toISOString()
  };
}

async function generateTrendAnalysisWithGemini(
  contactId: string,
  contact: any,
  timeframe: string,
  metrics: string[],
  apiKey: string
) {
  const model = 'gemini-1.5-pro';
  
  const prompt = `Analyze engagement trends for this contact over ${timeframe}:

Contact: ${JSON.stringify(contact, null, 2)}
Metrics to analyze: ${metrics.join(', ')}

Provide trend analysis with:
- trends: array of {metric, direction (increasing/decreasing/stable), strength (0-1), significance (high/medium/low)}
- seasonality: {detected: boolean, pattern?: string, confidence: number}
- anomalies: array of unusual patterns
- forecast: predicted future trends

Consider the contact's:
- Communication patterns
- Engagement history
- Industry characteristics
- Business cycle factors

Return comprehensive JSON object only.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  const result = JSON.parse(content);
  return {
    contactId,
    ...result,
    provider: 'gemini',
    model,
    timestamp: new Date().toISOString()
  };
}

async function generateTrendAnalysisWithOpenAI(
  contactId: string,
  contact: any,
  timeframe: string,
  metrics: string[],
  apiKey: string
) {
  const model = 'gpt-4o';
  
  const prompt = `Analyze engagement trends for this contact over ${timeframe}:

Contact: ${JSON.stringify(contact, null, 2)}
Metrics to analyze: ${metrics.join(', ')}

Provide trend analysis with:
- trends: array of {metric, direction (increasing/decreasing/stable), strength (0-1), significance (high/medium/low)}
- seasonality: {detected: boolean, pattern?: string, confidence: number}
- anomalies: array of unusual patterns
- forecast: predicted future trends

Consider the contact's:
- Communication patterns
- Engagement history
- Industry characteristics
- Business cycle factors

Return comprehensive JSON object only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an advanced trend analysis expert with deep knowledge of customer behavior patterns and market dynamics.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  const result = JSON.parse(content);
  return {
    contactId,
    ...result,
    provider: 'openai',
    model,
    timestamp: new Date().toISOString()
  };
}

async function generateRiskAssessmentWithOpenAI(
  contactId: string,
  contact: any,
  context: any,
  apiKey: string
) {
  const model = 'gpt-4o'; // Use GPT-5 placeholder for complex risk analysis
  
  const prompt = `Perform comprehensive risk assessment for this contact:

Contact: ${JSON.stringify(contact, null, 2)}
Business Context: ${JSON.stringify(context || {}, null, 2)}

Analyze and provide:
- overallRisk: "low", "medium", "high", or "critical"
- riskScore: 0-100 numeric risk score
- riskFactors: array of {factor, impact (low/medium/high), probability (0-1), description, mitigation array}
- opportunities: array of {opportunity, potential (low/medium/high), probability (0-1), description, actions array}
- recommendations: array of strategic recommendations
- nextReviewDate: when to reassess

Consider:
- Engagement patterns and trends
- Competitive landscape
- Economic factors
- Contact behavior indicators
- Deal progression signals
- Communication effectiveness

Return comprehensive JSON object only.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert risk assessment analyst with deep knowledge of sales psychology, customer behavior, and business relationship dynamics.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('Empty response from OpenAI API');
  }
  
  const result = JSON.parse(content);
  return {
    contactId,
    ...result,
    provider: 'openai',
    model,
    timestamp: new Date().toISOString()
  };
}

async function generateRiskAssessmentWithGemini(
  contactId: string,
  contact: any,
  context: any,
  apiKey: string
) {
  const model = 'gemini-1.5-pro';
  
  const prompt = `Perform comprehensive risk assessment for this contact:

Contact: ${JSON.stringify(contact, null, 2)}
Business Context: ${JSON.stringify(context || {}, null, 2)}

Analyze and provide:
- overallRisk: "low", "medium", "high", or "critical"
- riskScore: 0-100 numeric risk score
- riskFactors: array of {factor, impact (low/medium/high), probability (0-1), description, mitigation array}
- opportunities: array of {opportunity, potential (low/medium/high), probability (0-1), description, actions array}
- recommendations: array of strategic recommendations
- nextReviewDate: when to reassess

Consider:
- Engagement patterns and trends
- Competitive landscape
- Economic factors
- Contact behavior indicators
- Deal progression signals
- Communication effectiveness

Return comprehensive JSON object only.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('Empty response from Gemini API');
  }
  
  const result = JSON.parse(content);
  return {
    contactId,
    ...result,
    provider: 'gemini',
    model,
    timestamp: new Date().toISOString()
  };
}