exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let contact, purpose, templateType = 'professional';

  try {
    const parsed = JSON.parse(event.body);
    contact = parsed.contact;
    purpose = parsed.purpose;
    templateType = parsed.templateType || 'professional';

    if (!contact || !purpose) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Contact data and purpose are required' })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    const systemPrompt = 'You are an expert email copywriter with access to web search. Generate personalized, professional email templates. Use web search to find current information about the recipient\'s company, industry trends, or relevant news that can be incorporated into the email. Return a JSON object with "subject" and "body" fields.';

    const userPrompt = `Generate a personalized email template for ${purpose} to send to ${contact.name || `${contact.firstName} ${contact.lastName}`}, ${contact.title} at ${contact.company}. Research current information about their company and industry to make the email more relevant and timely. Include any recent news or developments that would be relevant to the conversation.

Template style: ${templateType}
Contact details: ${JSON.stringify(contact, null, 2)}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5',
        instructions: systemPrompt,
        input: userPrompt,
        temperature: templateType === 'creative' ? 0.7 : 0.3,
        text: {
          format: {
            type: "json_schema",
            name: "email_template",
            strict: true,
            schema: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" }
              },
              required: ["subject", "body"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle different response formats - check if output exists or fallback to output_text
    let content;
    if (data.output && data.output.length > 0) {
      // Find the message item in output array
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

    const result = {
      subject: content.subject || `Following up on ${purpose} - ${contact.company}`,
      body: content.body || `Hi ${contact.firstName || contact.name?.split(' ')[0] || 'there'},

I hope this email finds you well. I wanted to follow up regarding ${purpose}.

Please let me know if you'd be available for a brief call to discuss this further.

Best regards,
[Your Name]`,
      purpose,
      templateType,
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
    console.error('OpenAI email template generation error:', error);

    // Return fallback template
    const fallbackResult = {
      subject: `Following up on ${purpose} - ${contact.company}`,
      body: `Hi ${contact.firstName || contact.name?.split(' ')[0] || 'there'},

I hope this email finds you well. I wanted to follow up regarding ${purpose}.

Please let me know if you'd be available for a brief call to discuss this further.

Best regards,
[Your Name]`,
      purpose,
      templateType,
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