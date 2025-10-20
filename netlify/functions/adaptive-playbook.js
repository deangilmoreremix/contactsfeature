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
      currentStage = 'prospect',
      businessGoals = [],
      automationType = 'comprehensive',
      aiProvider = 'openai'
    } = JSON.parse(event.body);

    console.log('Adaptive playbook request:', {
      contactId: contact.id,
      currentStage,
      automationType,
      aiProvider
    });

    let result;

    // Route to appropriate AI provider
    switch (aiProvider) {
      case 'openai':
        result = await generateWithOpenAI(contact, currentStage, businessGoals, automationType);
        break;
      case 'gemini':
        result = await generateWithGemini(contact, currentStage, businessGoals, automationType);
        break;
      default:
        result = await generateWithOpenAI(contact, currentStage, businessGoals, automationType);
    }

    // Store playbook suggestions
    const playbookData = {
      contact_id: contact.id,
      current_stage: currentStage,
      automation_type: automationType,
      recommended_actions: result.recommendedActions,
      automation_sequence: result.automationSequence,
      triggers: result.triggers,
      conditions: result.conditions,
      ai_provider: aiProvider,
      created_at: new Date().toISOString()
    };

    await supabase
      .from('adaptive_playbooks')
      .insert(playbookData);

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
    console.error('Adaptive playbook generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Adaptive playbook generation failed',
        details: error.message
      })
    };
  }
};

async function generateWithOpenAI(contact, currentStage, businessGoals, automationType) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert sales automation strategist. Create adaptive playbooks that respond to contact behavior and business objectives. Generate intelligent automation sequences with appropriate triggers and conditions.`;

    const userPrompt = `Create an adaptive playbook for this contact:

Contact: ${contact.name} (${contact.title} at ${contact.company})
Current Stage: ${currentStage}
Business Goals: ${businessGoals.join(', ')}
Automation Type: ${automationType}

Generate automation playbook with:
{
  "recommendedActions": ["immediate", "short_term", "long_term"],
  "automationSequence": [
    {
      "step": "number",
      "action": "string",
      "trigger": "string",
      "condition": "string",
      "timing": "string",
      "channel": "string"
    }
  ],
  "triggers": ["event1", "event2"],
  "conditions": ["criteria1", "criteria2"],
  "successMetrics": ["metric1", "metric2"],
  "fallbackActions": ["action1", "action2"]
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
      recommendedActions: content.recommendedActions || [],
      automationSequence: content.automationSequence || [],
      triggers: content.triggers || [],
      conditions: content.conditions || [],
      successMetrics: content.successMetrics || [],
      fallbackActions: content.fallbackActions || [],
      currentStage,
      automationType,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI adaptive playbook generation failed:', error);
    throw error;
  }
}

async function generateWithGemini(contact, currentStage, businessGoals, automationType) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Create an adaptive playbook for this contact:

Contact: ${contact.name} at ${contact.company}
Current Stage: ${currentStage}
Business Goals: ${businessGoals.join(', ')}

Return JSON with recommendedActions, automationSequence, triggers, conditions, successMetrics, and fallbackActions.`;

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

    const playbook = JSON.parse(jsonMatch[0]);

    return {
      recommendedActions: playbook.recommendedActions || [],
      automationSequence: playbook.automationSequence || [],
      triggers: playbook.triggers || [],
      conditions: playbook.conditions || [],
      successMetrics: playbook.successMetrics || [],
      fallbackActions: playbook.fallbackActions || [],
      currentStage,
      automationType,
      generated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini adaptive playbook generation failed:', error);
    throw error;
  }
}