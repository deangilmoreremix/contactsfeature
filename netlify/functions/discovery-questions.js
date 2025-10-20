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
      case 'gemini':
        result = await generateWithGemini(contact, meetingContext, questionType);
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

async function generateWithGemini(contact, meetingContext, questionType) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Generate ${questionType} discovery questions for this contact:

Contact: ${contact.name} at ${contact.company}
Meeting Context: ${JSON.stringify(meetingContext)}

Return JSON with questions array organized by category with question, rationale, and priority.`;

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

    const questionsData = JSON.parse(jsonMatch[0]);

    return {
      questions: questionsData.questions || [],
      questionType,
      meetingContext,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini discovery questions generation failed:', error);
    throw error;
  }
}