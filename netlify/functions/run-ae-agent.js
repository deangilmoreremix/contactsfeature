const { supabase } = require('./_supabaseClient');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { contactId } = JSON.parse(event.body || '{}');

    if (!contactId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'contactId is required' })
      };
    }

    // Get contact and deal data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .maybeSingle();

    if (contactError || !contact) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    // Get associated deal if exists
    const { data: deal } = await supabase
      .from('deals')
      .select('*')
      .eq('contact_id', contactId)
      .maybeSingle();

    // Load agent memory
    const { data: memory } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build AE agent prompt
    const prompt = buildAEAgentPrompt(contact, deal, memory || []);

    // AE Agent tools
    const aeTools = [
      {
        type: "function",
        function: {
          name: "send_email",
          description: "Send a follow-up email to the contact",
          parameters: {
            type: "object",
            properties: {
              to: { type: "string" },
              subject: { type: "string" },
              body: { type: "string" }
            },
            required: ["to", "subject", "body"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "schedule_meeting",
          description: "Schedule a meeting or call with the contact",
          parameters: {
            type: "object",
            properties: {
              contact_id: { type: "string" },
              meeting_type: { type: "string", enum: ["call", "meeting", "demo"] },
              proposed_times: { type: "array", items: { type: "string" } }
            },
            required: ["contact_id", "meeting_type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_deal_status",
          description: "Update the deal status and next steps",
          parameters: {
            type: "object",
            properties: {
              deal_id: { type: "string" },
              new_status: { type: "string" },
              next_steps: { type: "string" }
            },
            required: ["deal_id", "new_status"]
          }
        }
      }
    ];

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    const model = process.env.SMARTCRM_MODEL || 'gpt-5.2';
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an Account Executive (AE) agent. Focus on closing deals, building relationships, and moving opportunities forward. Provide a clear action plan with next steps.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const response = aiData.choices[0]?.message?.content || 'No response generated';

    try {
      await supabase.from('agent_runs').insert({
        agent_id: 'ae-agent',
        contact_id: contactId,
        status: 'completed',
        output_data: { summary: response.substring(0, 500) },
        completed_at: new Date().toISOString()
      });
    } catch (_logErr) {
      console.warn('Failed to log AE agent run:', _logErr);
    }

    // Update autopilot state to reflect AE involvement
    await supabase
      .from('contacts')
      .update({
        autopilot_state: 'relationship_building',
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        contactId,
        response: response.substring(0, 500), // Truncate for response
        executedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('AE Agent execution failed:', error);

    try {
      const parsedBody = JSON.parse(event.body || '{}');
      if (parsedBody.contactId) {
        await supabase.from('agent_runs').insert({
          agent_id: 'ae-agent',
          contact_id: parsedBody.contactId,
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        });
      }
    } catch (_logErr) {
      console.warn('Failed to log AE agent error:', _logErr);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'AE agent execution failed',
        details: error.message
      })
    };
  }
};

function buildAEAgentPrompt(contact, deal, memory) {
  let prompt = `You are an Account Executive (AE) agent following up with a qualified lead.

Contact Information:
- Name: ${contact.name || 'Unknown'}
- Email: ${contact.email || 'Not provided'}
- Company: ${contact.company || 'Not provided'}
- Title: ${contact.title || 'Not provided'}
- Status: ${contact.lead_status || 'Unknown'}
- Interest Level: ${contact.interest_level || 'Unknown'}

`;

  if (deal) {
    prompt += `Deal Information:
- Deal Name: ${deal.name || 'Unnamed Deal'}
- Value: ${deal.value || 'Not specified'}
- Stage: ${deal.stage || 'Not specified'}
- Close Date: ${deal.close_date || 'Not specified'}

`;
  }

  if (memory && memory.length > 0) {
    prompt += `Recent Interaction History:
${memory.slice(0, 5).map(m => `- ${new Date(m.created_at).toLocaleDateString()}: ${m.type} - ${m.content?.substring(0, 100) || 'No content'}`).join('\n')}

`;
  }

  prompt += `Your Goals as AE Agent:
1. Build strong relationship with the contact
2. Understand their specific needs and pain points
3. Move the deal forward toward closure
4. Schedule meetings or calls when appropriate
5. Provide value through insights and solutions

Current Task: Execute appropriate follow-up actions based on the contact's status and history. Use the available tools to send emails, schedule meetings, or update deal status as needed.

Focus on being helpful, professional, and closing-oriented while maintaining relationship-building approach.`;

  return prompt;
}