const { stream } = require('@netlify/functions');
const { runDual } = require('./_stream/dual');
const { S } = require('./_stream/helpers');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = stream(async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const reqBody = JSON.parse(event.body);
    const {
      content,
      recipient,
      analysisType = 'comprehensive',
      aiProvider = 'openai'
    } = reqBody;

    console.log('Email analysis request:', {
      recipientId: recipient?.id,
      analysisType,
      aiProvider
    });

    // Same URL, two modes: JSON (as before) or SSE (status/delta/partial events + final `result`).
    return await runDual({
      event,
      body: reqBody,
      headers: CORS_HEADERS,
      options: buildOptions(content, recipient, analysisType),
      finalize: async (text) => {
        const result = shapeResult(text, analysisType);

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
          success: true,
          data: result,
          provider: aiProvider,
          timestamp: new Date().toISOString()
        };
      },
    });
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
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const OUTPUT_SCHEMA = S.obj({
  sentiment: S.obj({ score: S.num, label: S.oneOf('positive', 'neutral', 'negative'), confidence: S.num }),
  engagement: S.obj({ score: S.num, potential: S.oneOf('high', 'medium', 'low'), factors: S.strArr }),
  improvements: S.strArr,
  recommendations: S.strArr,
  response_strategy: S.obj({ approach: S.str, timing: S.str, tone: S.str }),
});

function buildOptions(content, recipient, analysisType) {
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

  return {
    model: 'default',
    effort: 'low',
    instructions: systemPrompt,
    input: userPrompt,
    schema: OUTPUT_SCHEMA,
    schemaName: 'email_analysis',
    store: false,
  };
}

function shapeResult(text, analysisType) {
  const content = JSON.parse(text);
  return {
      sentiment: content.sentiment || { score: 0, label: 'neutral', confidence: 50 },
      engagement: content.engagement || { score: 50, potential: 'medium', factors: [] },
      improvements: content.improvements || [],
      recommendations: content.recommendations || [],
      response_strategy: content.response_strategy || { approach: 'professional', timing: '24h', tone: 'friendly' },
      analysisType,
      analyzed: new Date().toISOString()
    };
}
