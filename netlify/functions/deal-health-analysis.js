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

    const response = await responsesFetch({
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
      });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    const content = JSON.parse(data.output_text);

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
