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
      insightTypes = ['opportunity', 'recommendation'],
      context,
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('AI insights request:', {
      contactId: contact.id,
      insightTypes,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await generateWithOpenAI(contact, insightTypes, context);
        break;
      case 'gemini':
        result = await generateWithGemini(contact, insightTypes, context);
        break;
      default:
        result = await generateWithOpenAI(contact, insightTypes, context);
    }

    // Store insights in database
    const insightsToStore = result.insights.map((insight, index) => ({
      contact_id: contact.id,
      insight_type: insight.type,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence,
      impact: insight.impact,
      actionable: insight.actionable,
      suggested_actions: insight.suggestedActions,
      data_points: insight.dataPoints,
      ai_provider: aiProvider,
      created_at: new Date().toISOString()
    }));

    await supabase
      .from('contact_insights')
      .insert(insightsToStore);

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
    console.error('AI insights generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'AI insights generation failed',
        details: error.message
      })
    };
  }
};

async function generateWithOpenAI(contact, insightTypes, context) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert sales intelligence analyst. Generate actionable insights for contact management based on the provided information. Focus on opportunities, recommendations, risks, and predictions.`;

    const userPrompt = `Generate ${insightTypes.join(', ')} insights for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Email: ${contact.email}
Industry: ${contact.industry || 'Not specified'}
Interest Level: ${contact.interestLevel || 'Not specified'}

${context ? `Additional Context: ${context}` : ''}

Generate 2-3 insights per type requested. Each insight should include:
- Title and description
- Confidence level (0-100)
- Impact level (high/medium/low)
- Whether it's actionable
- Suggested actions if applicable
- Supporting data points

Return as JSON with "insights" array.`;

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
        temperature: 0.3,
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
      insights: content.insights || [],
      insightTypes,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI insights generation failed:', error);
    throw error;
  }
}

async function generateWithGemini(contact, insightTypes, context) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Generate ${insightTypes.join(', ')} insights for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Context: ${context || 'Standard analysis'}

Return JSON with insights array containing title, description, confidence, impact, actionable, and suggestedActions.`;

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
          temperature: 0.3,
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

    const insightsData = JSON.parse(jsonMatch[0]);

    return {
      insights: insightsData.insights || [],
      insightTypes,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini insights generation failed:', error);
    throw error;
  }
}