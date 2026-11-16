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
