const { runDual } = require('./_stream/dual');
const { callOptions } = require('./_stream/helpers');
const { stream } = require('@netlify/functions');
const { supabase } = require('./_supabaseClient');

exports.handler = stream(async (event, context) => {
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
    const reqBody = JSON.parse(event.body || '{}');
    const { contactId } = reqBody;

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

    // Streams live (status/delta events, then `result` = the JSON payload) when the client asks for it.
    let failureLogged = false;
    return await runDual({
      event,
      body: reqBody,
      headers,
      options: callOptions(
        [
          {
            role: 'system',
            content: 'You are an Account Executive (AE) agent. Focus on closing deals, building relationships, and moving opportunities forward. Provide a clear action plan with next steps.'
          },
          { role: 'user', content: prompt }
        ],
        { role: 'thinking', maxTokens: 2000 }
      ),
      onEvent: (ev) => {
        // Stream mode: a model failure never reaches the catch below, so record it here (once).
        if (ev.type === 'error' && !failureLogged) {
          failureLogged = true;
          logFailedRun(contactId, ev.message);
        }
      },
      finalize: async (text) => {
        const response = text || 'No response generated';

        try {
          await supabase.from('agent_runs').insert({
            agent_id: 'ae-agent',
            contact_id: contactId,
            user_id: contact.user_id || null,
            status: 'completed',
            output_data: { summary: response.substring(0, 500) },
            completed_at: new Date().toISOString()
          });
        } catch (_logErr) {
          console.warn('Failed to log AE agent run:', _logErr);
        }

        await supabase
          .from('contacts')
          .update({
            pipeline_stage: 'relationship_building',
            updated_at: new Date().toISOString()
          })
          .eq('id', contactId);

        return {
          success: true,
          contactId,
          response: response.substring(0, 500), // Truncate for response
          executedAt: new Date().toISOString()
        };
      },
    });

  } catch (error) {
    console.error('AE Agent execution failed:', error);

    try {
      const parsedBody = JSON.parse(event.body || '{}');
      if (parsedBody.contactId) await logFailedRun(parsedBody.contactId, error.message);
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
});

async function logFailedRun(contactId, message) {
  try {
    await supabase.from('agent_runs').insert({
      agent_id: 'ae-agent',
      contact_id: contactId,
      status: 'failed',
      error_message: message,
      completed_at: new Date().toISOString()
    });
  } catch (_logErr) {
    console.warn('Failed to log AE agent error:', _logErr);
  }
}

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