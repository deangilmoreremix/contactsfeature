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
      meetingContext,
      questionType = 'comprehensive',
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Discovery questions request:', {
      contactId: contact.id,
      questionType,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await generateWithOpenAI(contact, meetingContext, questionType);
        break;
      default:
        result = await generateWithOpenAI(contact, meetingContext, questionType);
    }

    // Store questions in database
    await supabase
      .from('discovery_questions')
      .insert({
        contact_id: contact.id,
        question_type: questionType,
        questions: result.questions,
        meeting_context: meetingContext,
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
    console.error('Discovery questions generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Discovery questions generation failed',
        details: error.message
      })
    };
  }
};

async function generateWithOpenAI(contact, meetingContext, questionType) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert sales discovery specialist. Generate strategic discovery questions that uncover pain points, requirements, decision criteria, and success factors.`;

    const userPrompt = `Generate ${questionType} discovery questions for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Industry: ${contact.industry || 'Not specified'}
Meeting Type: ${meetingContext?.type || 'discovery'}
Duration: ${meetingContext?.duration || 30} minutes
Objective: ${meetingContext?.objective || 'Understand needs and qualify opportunity'}

Generate questions organized by category:
1. Current Situation & Pain Points
2. Desired Outcomes & Success Criteria
3. Decision Process & Timeline
4. Budget & Resources
5. Competition & Alternatives

Return as JSON with "questions" array containing objects with category, question, rationale, and priority.`;

    const response = await responsesFetch({
        model: 'default',
        instructions: systemPrompt,
        input: userPrompt,
        temperature: 0.3,
        text: {
          format: {
            type: "json_schema",
            name: "discovery_questions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      question: { type: "string" },
                      rationale: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["category", "question", "rationale", "priority"]
                  }
                }
              },
              required: ["questions"]
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
      questions: content.questions || [],
      questionType,
      meetingContext,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI discovery questions generation failed:', error);
    throw error;
  }
}
