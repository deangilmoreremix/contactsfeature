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
      content,
      recipient,
      analysisType = 'comprehensive',
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Email analysis request:', {
      recipientId: recipient?.id,
      analysisType,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await analyzeWithOpenAI(content, recipient, analysisType);
        break;
      case 'gemini':
        result = await analyzeWithGemini(content, recipient, analysisType);
        break;
      default:
        result = await analyzeWithOpenAI(content, recipient, analysisType);
    }

    // Store analysis results
    if (recipient) {
      await supabase
        .from('email_analyses')
        .insert({
          contact_id: recipient.id,
          email_subject: content.subject,
          analysis_type: analysisType,
          sentiment_score: result.sentiment?.score,
          engagement_score: result.engagement?.score,
          recommendations: result.recommendations,
          ai_provider: aiProvider,
          created_at: new Date().toISOString()
        });
    }

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
    console.error('Email analysis failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Email analysis failed',
        details: error.message
      })
    };
  }
};

async function analyzeWithOpenAI(content, recipient, analysisType) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert email analyst specializing in B2B sales communication. Analyze emails for sentiment, engagement potential, improvement opportunities, and response strategies.`;

    const userPrompt = `Analyze this email for ${analysisType} insights:

Email Content:
Subject: ${content.subject}
Body: ${content.body}

${recipient ? `Recipient: ${recipient.name} (${recipient.title} at ${recipient.company})` : ''}

Provide analysis in JSON format with:
{
  "sentiment": {"score": number, "label": "positive|neutral|negative", "confidence": number},
  "engagement": {"score": number, "potential": "high|medium|low", "factors": []},
  "improvements": ["suggestion1", "suggestion2"],
  "recommendations": ["action1", "action2"],
  "response_strategy": {"approach": "string", "timing": "string", "tone": "string"}
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
      sentiment: content.sentiment || { score: 0, label: 'neutral', confidence: 50 },
      engagement: content.engagement || { score: 50, potential: 'medium', factors: [] },
      improvements: content.improvements || [],
      recommendations: content.recommendations || [],
      response_strategy: content.response_strategy || { approach: 'professional', timing: '24h', tone: 'friendly' },
      analysisType,
      analyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI email analysis failed:', error);
    throw error;
  }
}

async function analyzeWithGemini(content, recipient, analysisType) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Analyze this email for ${analysisType} insights:

Subject: ${content.subject}
Body: ${content.body}
Recipient: ${recipient ? `${recipient.name} at ${recipient.company}` : 'Unknown'}

Return JSON with sentiment, engagement, improvements, recommendations, and response_strategy.`;

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

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      sentiment: analysis.sentiment || { score: 0, label: 'neutral', confidence: 50 },
      engagement: analysis.engagement || { score: 50, potential: 'medium', factors: [] },
      improvements: analysis.improvements || [],
      recommendations: analysis.recommendations || [],
      response_strategy: analysis.response_strategy || { approach: 'professional', timing: '24h', tone: 'friendly' },
      analysisType,
      analyzed: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini email analysis failed:', error);
    throw error;
  }
}