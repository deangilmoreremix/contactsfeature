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
      deal,
      healthMetrics = [],
      analysisDepth = 'comprehensive',
      riskFactors = [],
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Deal health analysis request:', {
      dealId: deal.id,
      analysisDepth,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await analyzeWithOpenAI(deal, healthMetrics, analysisDepth, riskFactors);
        break;
      case 'gemini':
        result = await analyzeWithGemini(deal, healthMetrics, analysisDepth, riskFactors);
        break;
      default:
        result = await analyzeWithOpenAI(deal, healthMetrics, analysisDepth, riskFactors);
    }

    // Store health analysis
    await supabase
      .from('deal_health_analyses')
      .insert({
        deal_id: deal.id,
        analysis_depth: analysisDepth,
        health_score: result.healthScore,
        risk_level: result.riskLevel,
        recommendations: result.recommendations,
        next_actions: result.nextActions,
        health_trends: result.healthTrends,
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
    console.error('Deal health analysis failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Deal health analysis failed',
        details: error.message
      })
    };
  }
};

async function analyzeWithOpenAI(deal, healthMetrics, analysisDepth, riskFactors) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert deal health analyst. Assess deal viability, identify risks, and provide actionable recommendations for deal progression and risk mitigation.`;

    const userPrompt = `Analyze the health of this deal:

Deal: ${deal.name} (${deal.company})
Value: $${deal.value?.toLocaleString() || 'TBD'}
Stage: ${deal.stage}
Industry: ${deal.industry || 'Not specified'}

Current Metrics: ${JSON.stringify(healthMetrics)}
Risk Factors: ${JSON.stringify(riskFactors)}

Generate comprehensive health analysis with:
{
  "healthScore": "number 0-100",
  "riskLevel": "low|medium|high|critical",
  "healthIndicators": [
    {
      "metric": "string",
      "value": "number",
      "status": "good|warning|critical",
      "trend": "improving|stable|declining"
    }
  ],
  "riskFactors": [
    {
      "factor": "string",
      "severity": "low|medium|high",
      "probability": "number",
      "mitigation": "string"
    }
  ],
  "recommendations": ["action1", "action2"],
  "nextActions": [
    {
      "action": "string",
      "priority": "high|medium|low",
      "timeline": "string",
      "owner": "string"
    }
  ],
  "healthTrends": ["trend1", "trend2"]
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
            name: "deal_health_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                healthScore: { type: "number", minimum: 0, maximum: 100 },
                riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
                healthIndicators: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      metric: { type: "string" },
                      value: { type: "number" },
                      status: { type: "string", enum: ["good", "warning", "critical"] },
                      trend: { type: "string", enum: ["improving", "stable", "declining"] }
                    },
                    required: ["metric", "value", "status", "trend"]
                  }
                },
                riskFactors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      factor: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      probability: { type: "number", minimum: 0, maximum: 1 },
                      mitigation: { type: "string" }
                    },
                    required: ["factor", "severity", "probability", "mitigation"]
                  }
                },
                recommendations: { type: "array", items: { type: "string" } },
                nextActions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      timeline: { type: "string" },
                      owner: { type: "string" }
                    },
                    required: ["action", "priority", "timeline", "owner"]
                  }
                },
                healthTrends: { type: "array", items: { type: "string" } }
              },
              required: ["healthScore", "riskLevel", "healthIndicators", "riskFactors", "recommendations", "nextActions", "healthTrends"]
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
      healthScore: content.healthScore || 75,
      riskLevel: content.riskLevel || 'medium',
      healthIndicators: content.healthIndicators || [],
      riskFactors: content.riskFactors || [],
      recommendations: content.recommendations || [],
      nextActions: content.nextActions || [],
      healthTrends: content.healthTrends || [],
      analysisDepth,
      analyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI deal health analysis failed:', error);
    throw error;
  }
}

async function analyzeWithGemini(deal, healthMetrics, analysisDepth, riskFactors) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Analyze the health of this deal:

Deal: ${deal.name} at ${deal.company}
Value: $${deal.value || 'TBD'}
Stage: ${deal.stage}
Metrics: ${JSON.stringify(healthMetrics)}

Return JSON with healthScore, riskLevel, healthIndicators, riskFactors, recommendations, nextActions, and healthTrends.`;

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

    const healthData = JSON.parse(jsonMatch[0]);

    return {
      healthScore: healthData.healthScore || 75,
      riskLevel: healthData.riskLevel || 'medium',
      healthIndicators: healthData.healthIndicators || [],
      riskFactors: healthData.riskFactors || [],
      recommendations: healthData.recommendations || [],
      nextActions: healthData.nextActions || [],
      healthTrends: healthData.healthTrends || [],
      analysisDepth,
      analyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini deal health analysis failed:', error);
    throw error;
  }
}