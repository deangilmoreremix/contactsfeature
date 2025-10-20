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
      type = 'introduction',
      context,
      tone = 'professional',
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Email composition request:', {
      contactId: contact.id,
      type,
      tone,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await generateWithOpenAI(contact, type, context, tone);
        break;
      case 'gemini':
        result = await generateWithGemini(contact, type, context, tone);
        break;
      default:
        result = await generateWithOpenAI(contact, type, context, tone);
    }

    // Store email template in database
    await supabase
      .from('email_templates')
      .insert({
        contact_id: contact.id,
        email_type: type,
        subject: result.subject,
        body: result.body,
        tone,
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
    console.error('Email composition failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Email composition failed',
        details: error.message
      })
    };
  }
};

async function generateWithOpenAI(contact, type, context, tone) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert email copywriter specializing in B2B sales communication. Generate professional, personalized emails that drive engagement and conversions. Use ${tone} tone and focus on ${type} style communication.`;

    const userPrompt = `Generate a ${tone} ${type} email for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Email: ${contact.email}
Industry: ${contact.industry || 'Not specified'}

Context: ${context || 'Standard business introduction'}

Requirements:
- Compelling subject line
- Personalized greeting
- Clear value proposition
- Specific call-to-action
- Professional sign-off

Return as JSON with "subject" and "body" fields.`;

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
        temperature: tone === 'creative' ? 0.7 : 0.3,
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
      subject: content.subject || `Following up with ${contact.company}`,
      body: content.body || `Hi ${contact.firstName || contact.name},

I hope this email finds you well. I wanted to reach out regarding ${context || 'potential collaboration opportunities'}.

Please let me know if you'd be available for a brief call to discuss this further.

Best regards,
[Your Name]`,
      tone,
      type,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI email generation failed:', error);
    throw error;
  }
}

async function generateWithGemini(contact, type, context, tone) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Generate a ${tone} ${type} email for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Context: ${context || 'Standard introduction'}

Return JSON with subject and body fields.`;

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
          temperature: tone === 'creative' ? 0.7 : 0.3,
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Invalid response from Gemini');
    }

    // Extract JSON from the response text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const emailData = JSON.parse(jsonMatch[0]);

    return {
      subject: emailData.subject || `Following up with ${contact.company}`,
      body: emailData.body || `Hi ${contact.firstName || contact.name},

I hope this email finds you well. I wanted to reach out regarding ${context || 'potential collaboration opportunities'}.

Please let me know if you'd be available for a brief call to discuss this further.

Best regards,
[Your Name]`,
      tone,
      type,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini email generation failed:', error);
    throw error;
  }
}