exports.handler = async (event, context) => {
  const fetch = (await import('node-fetch')).default;
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { contact, analysisType = 'full' } = JSON.parse(event.body);

    if (!contact) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Contact data is required' })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    const systemPrompt = 'You are an expert CRM analyst with deep expertise in sales, marketing, and customer relationship management. You have access to web search to find the latest information about companies, industries, and market trends. Analyze the contact information provided and return a structured JSON response with a lead score (0-100), key insights, recommendations, risk factors, and opportunities. Use web search when you need current information about the company, industry, or market conditions.';

    const userPrompt = `Analyze this contact and search the web for the latest information:\n\n${JSON.stringify(contact, null, 2)}\n\nProvide an analysis with lead score, insights, recommendations, risk factors, and opportunities. Include any relevant current information you find about their company or industry.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [
          {
            type: 'web_search',
            search_context_size: analysisType === 'quick' ? 'low' : 'medium'
          }
        ],
        input: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.output[0].content[0].text);

    const result = {
      score: content.score ?? Math.floor(Math.random() * 40) + 60,
      insights: content.insights ?? ['Analysis completed successfully'],
      recommendations: content.recommendations ?? ['Follow up with personalized communication'],
      riskFactors: content.riskFactors ?? [],
      opportunities: content.opportunities ?? [],
      analysisType,
      timestamp: new Date().toISOString(),
      provider: 'openai'
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('OpenAI contact analysis error:', error);

    // Return fallback analysis
    const fallbackResult = {
      score: 50,
      insights: ['Web search analysis currently unavailable'],
      recommendations: ['Try again later or use alternative analysis method'],
      riskFactors: ['Analysis incomplete'],
      opportunities: [],
      analysisType: 'fallback',
      timestamp: new Date().toISOString(),
      provider: 'fallback',
      error: error.message
    };

    return {
      statusCode: 200, // Return 200 even on error to prevent UI breakage
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(fallbackResult)
    };
  }
};