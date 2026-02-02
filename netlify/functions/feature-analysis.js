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
      productUrl,
      includeVisualAnalysis = false,
      analysisDepth = 'comprehensive',
      competitorResearch = true,
      marketAnalysis = true,
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Feature analysis request:', {
      productUrl,
      analysisDepth,
      includeVisualAnalysis,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await analyzeWithOpenAI(productUrl, includeVisualAnalysis, analysisDepth, competitorResearch, marketAnalysis);
        break;
      case 'gemini':
        result = await analyzeWithGemini(productUrl, includeVisualAnalysis, analysisDepth, competitorResearch, marketAnalysis);
        break;
      default:
        result = await analyzeWithOpenAI(productUrl, includeVisualAnalysis, analysisDepth, competitorResearch, marketAnalysis);
    }

    // Store analysis results
    await supabase
      .from('feature_analyses')
      .insert({
        product_url: productUrl,
        analysis_depth: analysisDepth,
        include_visual: includeVisualAnalysis,
        competitor_research: competitorResearch,
        market_analysis: marketAnalysis,
        analysis_result: result,
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
        analysis: result,
        provider: aiProvider,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Feature analysis failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Feature analysis failed',
        details: error.message
      })
    };
  }
};

async function analyzeWithOpenAI(productUrl, includeVisualAnalysis, analysisDepth, competitorResearch, marketAnalysis) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert product analyst and competitive intelligence specialist. Analyze products, features, and market positioning to provide comprehensive insights.`;

    const userPrompt = `Analyze the product at this URL: ${productUrl}

Provide a ${analysisDepth} analysis including:
${competitorResearch ? '- Competitive landscape analysis' : ''}
${marketAnalysis ? '- Market insights and positioning' : ''}
${includeVisualAnalysis ? '- Visual/UI analysis' : ''}

Return JSON with comprehensive product analysis including features, competition, and recommendations.`;

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
            name: "feature_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                productName: { type: "string" },
                analysis: {
                  type: "object",
                  properties: {
                    summary: { type: "string" },
                    keyFeatures: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                          competitiveAdvantage: { type: "string" },
                          marketPosition: { type: "string" },
                          adoptionRate: { type: "number", minimum: 0, maximum: 1 }
                        },
                        required: ["name", "description", "competitiveAdvantage", "marketPosition", "adoptionRate"]
                      }
                    },
                    competitiveLandscape: {
                      type: "object",
                      properties: {
                        directCompetitors: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              strengths: { type: "array", items: { type: "string" } },
                              weaknesses: { type: "array", items: { type: "string" } },
                              marketShare: { type: "number", minimum: 0, maximum: 100 }
                            },
                            required: ["name", "strengths", "weaknesses", "marketShare"]
                          }
                        },
                        indirectCompetitors: { type: "array", items: { type: "string" } },
                        marketGaps: { type: "array", items: { type: "string" } }
                      },
                      required: ["directCompetitors", "indirectCompetitors", "marketGaps"]
                    },
                    marketInsights: {
                      type: "object",
                      properties: {
                        totalAddressableMarket: { type: "string" },
                        serviceableAvailableMarket: { type: "string" },
                        serviceableObtainableMarket: { type: "string" },
                        growthRate: { type: "number", minimum: 0, maximum: 1 },
                        keyTrends: { type: "array", items: { type: "string" } }
                      },
                      required: ["totalAddressableMarket", "serviceableAvailableMarket", "serviceableObtainableMarket", "growthRate", "keyTrends"]
                    },
                    recommendations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["feature", "pricing", "positioning", "go_to_market"] },
                          priority: { type: "string", enum: ["high", "medium", "low"] },
                          recommendation: { type: "string" },
                          rationale: { type: "string" },
                          expectedImpact: { type: "string" }
                        },
                        required: ["type", "priority", "recommendation", "rationale", "expectedImpact"]
                      }
                    }
                  },
                  required: ["summary", "keyFeatures", "competitiveLandscape", "marketInsights", "recommendations"]
                },
                visualAnalysis: includeVisualAnalysis ? {
                  type: "object",
                  properties: {
                    screenshots: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          url: { type: "string" },
                          analysis: { type: "string" },
                          keyInsights: { type: "array", items: { type: "string" } }
                        },
                        required: ["url", "analysis", "keyInsights"]
                      }
                    },
                    uiUxAssessment: {
                      type: "object",
                      properties: {
                        score: { type: "number", minimum: 0, maximum: 100 },
                        strengths: { type: "array", items: { type: "string" } },
                        weaknesses: { type: "array", items: { type: "string" } },
                        recommendations: { type: "array", items: { type: "string" } }
                      },
                      required: ["score", "strengths", "weaknesses", "recommendations"]
                    }
                  },
                  required: ["screenshots", "uiUxAssessment"]
                } : undefined
              },
              required: ["productName", "analysis"]
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

    return content;
  } catch (error) {
    console.error('OpenAI feature analysis failed:', error);
    throw error;
  }
}

async function analyzeWithGemini(productUrl, includeVisualAnalysis, analysisDepth, competitorResearch, marketAnalysis) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Analyze the product at: ${productUrl}

Provide ${analysisDepth} analysis including features, ${competitorResearch ? 'competition,' : ''} ${marketAnalysis ? 'market insights,' : ''} ${includeVisualAnalysis ? 'and visual analysis.' : ''}

Return JSON with productName, analysis object containing summary, keyFeatures, competitiveLandscape, marketInsights, recommendations${includeVisualAnalysis ? ', and visualAnalysis' : ''}.`;

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
          maxOutputTokens: 2000
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

    const analysisData = JSON.parse(jsonMatch[0]);

    return analysisData;
  } catch (error) {
    console.error('Gemini feature analysis failed:', error);
    throw error;
  }
}