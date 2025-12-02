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
    const { agentId, contactId, dealId, input } = JSON.parse(event.body);

    if (!agentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'agentId is required' })
      };
    }

    console.log('Agent execution request:', { agentId, contactId, dealId });

    // Get user from auth context
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authorization required' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid authentication' })
      };
    }

    const userId = user.id;

    // Execute the agent
    const result = await runAgent(agentId, contactId, dealId, userId, input);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Agent runner failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Agent execution failed',
        details: error.message
      })
    };
  }
};

async function runAgent(agentId, contactId, dealId, userId, input = {}) {
  const startTime = Date.now();

  try {
    // 1. Load agent metadata
    const { data: agentData, error: agentError } = await supabase
      .from('agent_metadata')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agentData) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    console.log('Loaded agent metadata:', agentData.name);

    // 2. Create agent run record
    const { data: runData, error: runError } = await supabase
      .from('agent_runs')
      .insert({
        agent_id: agentId,
        contact_id: contactId,
        deal_id: dealId,
        user_id: userId,
        input_data: input,
        status: 'running'
      })
      .select()
      .single();

    if (runError) {
      throw new Error(`Failed to create agent run: ${runError.message}`);
    }

    const runId = runData.id;
    console.log('Created agent run:', runId);

    // 3. Gather context data
    const context = await gatherContext(contactId, dealId, userId);
    console.log('Gathered context:', {
      hasContact: !!context.contact,
      hasDeal: !!context.deal,
      priorRuns: context.prior_runs?.length || 0
    });

    // 4. Prepare agent prompt and instructions
    const agentPrompt = buildAgentPrompt(agentData, context, input);
    const instructions = agentData.instructions || buildDefaultInstructions(agentData);

    // 5. Get available tools
    const tools = await getAvailableTools(agentData.tools || []);
    console.log('Available tools:', tools.length);

    // 6. Execute OpenAI Responses API
    const response = await executeOpenAIResponses({
      model: agentData.model || 'gpt-5.1',
      input: agentPrompt,
      instructions,
      reasoning: { effort: agentData.reasoning_effort || 'medium' },
      text: { verbosity: agentData.verbosity || 'medium' },
      max_output_tokens: agentData.max_output_tokens || 4000,
      tools,
      tool_choice: tools.length > 0 ? {
        type: 'allowed_tools',
        mode: 'auto',
        tools: tools.map(t => ({ type: 'function', name: t.function.name }))
      } : undefined
    });

    console.log('OpenAI response received:', {
      responseId: response.id,
      outputLength: response.output_text?.length || 0,
      toolCalls: response.tool_calls?.length || 0
    });

    // 7. Handle tool calls if any
    let toolResults = [];
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log('Executing tool calls:', response.tool_calls.length);
      toolResults = await executeToolCalls(response.tool_calls);
    }

    // 8. Process agent outputs and apply to database
    const outputs = await processAgentOutputs(response.output_text, toolResults, context);
    console.log('Processed agent outputs:', {
      contactUpdates: outputs.updates.contacts?.length || 0,
      dealUpdates: outputs.updates.deals?.length || 0,
      insights: outputs.updates.insights?.length || 0,
      tags: outputs.updates.tags?.length || 0,
      tasks: outputs.updates.tasks?.length || 0
    });

    // 9. Apply outputs to database
    await applyOutputs(outputs, userId);

    // 10. Update agent run record
    const executionTime = Date.now() - startTime;
    await supabase
      .from('agent_runs')
      .update({
        status: 'completed',
        output_data: outputs,
        tool_calls: response.tool_calls,
        execution_time_ms: executionTime,
        tokens_used: response.usage,
        completed_at: new Date().toISOString()
      })
      .eq('id', runId);

    console.log('Agent execution completed successfully');

    return {
      success: true,
      runId,
      agent: {
        id: agentData.id,
        name: agentData.name,
        description: agentData.description
      },
      response: {
        id: response.id,
        output_text: response.output_text,
        reasoning: response.reasoning,
        tool_calls: response.tool_calls,
        usage: response.usage
      },
      outputs,
      executionTime,
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Agent execution failed:', error);

    // Update run status to failed if we have a runId
    if (typeof runId !== 'undefined') {
      await supabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error_message: error.message,
          execution_time_ms: Date.now() - startTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', runId);
    }

    throw error;
  }
}

async function gatherContext(contactId, dealId, userId) {
  const context = {};

  // Load contact data
  if (contactId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    if (contact) context.contact = contact;
  }

  // Load deal data
  if (dealId) {
    const { data: deal } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();
    if (deal) context.deal = deal;
  }

  // Load prior agent runs
  const { data: priorRuns } = await supabase
    .from('agent_runs')
    .select('*')
    .or(`contact_id.eq.${contactId || 'null'},deal_id.eq.${dealId || 'null'}`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  context.prior_runs = priorRuns || [];

  // Placeholder for journey history, semantic search, analytics
  context.journey_history = [];
  context.semantic_search = [];
  context.analytics = {};

  return context;
}

function buildAgentPrompt(agentData, context, input) {
  let prompt = `You are ${agentData.name}, an AI agent specialized in ${agentData.description}.

`;

  // Add context information
  if (context.contact) {
    prompt += `Contact Information:
- Name: ${context.contact.name}
- Email: ${context.contact.email || 'Not provided'}
- Company: ${context.contact.company || 'Not provided'}
- Title: ${context.contact.title || 'Not provided'}
- Industry: ${context.contact.industry || 'Not provided'}

`;
  }

  if (context.deal) {
    prompt += `Deal Information:
- Name: ${context.deal.name}
- Value: ${context.deal.value || 'Not specified'}
- Stage: ${context.deal.stage || 'Not specified'}
- Close Date: ${context.deal.close_date || 'Not specified'}

`;
  }

  // Add prior runs context
  if (context.prior_runs && context.prior_runs.length > 0) {
    prompt += `Previous Agent Runs:
${context.prior_runs.slice(0, 3).map(run =>
  `- ${run.agent_id}: ${run.status} (${new Date(run.created_at).toLocaleDateString()})`
).join('\n')}

`;
  }

  // Add input data
  if (Object.keys(input).length > 0) {
    prompt += `Input Data:
${JSON.stringify(input, null, 2)}

`;
  }

  prompt += `Your task is to analyze this information and take appropriate actions using the available tools. Provide a comprehensive response with actionable insights and recommendations.`;

  return prompt;
}

function buildDefaultInstructions(agentData) {
  return `You are ${agentData.name}. ${agentData.description}

Use the available tools to gather information and take actions as needed. Always provide clear, actionable recommendations based on the data available. Be thorough but concise in your analysis.`;
}

async function getAvailableTools(agentTools) {
  // For now, return a fixed set of common tools
  // In production, this would be dynamically generated based on agentTools
  const tools = [
    {
      type: 'function',
      function: {
        name: 'email-composer',
        description: 'Compose personalized emails for contacts',
        parameters: {
          type: 'object',
          properties: {
            contact: { type: 'object', description: 'Contact information' },
            type: { type: 'string', enum: ['introduction', 'follow-up', 'proposal'] },
            context: { type: 'string', description: 'Additional context' },
            tone: { type: 'string', enum: ['professional', 'casual'] }
          },
          required: ['contact', 'type']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'ai-enrichment',
        description: 'Enrich contact data with AI-powered research',
        parameters: {
          type: 'object',
          properties: {
            contactData: { type: 'object', description: 'Contact data to enrich' },
            enrichmentType: { type: 'string', enum: ['comprehensive', 'basic'] }
          },
          required: ['contactData']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'deal-health-analysis',
        description: 'Analyze deal health and provide recommendations',
        parameters: {
          type: 'object',
          properties: {
            dealId: { type: 'string', description: 'ID of the deal to analyze' },
            dealData: { type: 'object', description: 'Deal information' }
          },
          required: ['dealId']
        }
      }
    }
  ];

  return tools;
}

async function executeOpenAIResponses(request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    output_text: data.output_text,
    reasoning: data.reasoning,
    tool_calls: data.tool_calls,
    usage: data.usage
  };
}

async function executeToolCalls(toolCalls) {
  const results = [];

  for (const toolCall of toolCalls) {
    try {
      console.log('Executing tool call:', toolCall.name);

      // Invoke the corresponding Netlify function
      const { data, error } = await supabase.functions.invoke(toolCall.name, {
        body: toolCall.arguments || {}
      });

      if (error) {
        console.error('Tool execution failed:', error);
        results.push({
          toolCall,
          result: null,
          error: error.message
        });
      } else {
        results.push({
          toolCall,
          result: data,
          error: null
        });
      }
    } catch (error) {
      console.error('Tool execution error:', error);
      results.push({
        toolCall,
        result: null,
        error: error.message
      });
    }
  }

  return results;
}

async function processAgentOutputs(outputText, toolResults, context) {
  // Parse the agent output to extract structured updates
  const outputs = {
    updates: {
      contacts: [],
      deals: [],
      insights: [],
      tags: [],
      tasks: []
    },
    summary: outputText
  };

  try {
    // Simple parsing - in production, you'd use more sophisticated NLP
    const text = outputText.toLowerCase();

    // Extract contact updates
    if (context.contact && (text.includes('update contact') || text.includes('contact information'))) {
      outputs.updates.contacts.push({
        id: context.contact.id,
        updates: {} // Would parse specific updates from text
      });
    }

    // Extract deal updates
    if (context.deal && (text.includes('update deal') || text.includes('deal status'))) {
      outputs.updates.deals.push({
        id: context.deal.id,
        updates: {} // Would parse specific updates from text
      });
    }

    // Extract tasks
    if (text.includes('task') || text.includes('action item') || text.includes('follow up')) {
      outputs.updates.tasks.push({
        title: 'Follow up action',
        description: 'Agent recommended follow-up action',
        priority: 'medium'
      });
    }

  } catch (error) {
    console.warn('Failed to parse agent outputs:', error);
  }

  return outputs;
}

async function applyOutputs(outputs, userId) {
  // Apply contact updates
  for (const contactUpdate of outputs.updates.contacts || []) {
    if (Object.keys(contactUpdate.updates).length > 0) {
      await supabase
        .from('contacts')
        .update(contactUpdate.updates)
        .eq('id', contactUpdate.id);
    }
  }

  // Apply deal updates
  for (const dealUpdate of outputs.updates.deals || []) {
    if (Object.keys(dealUpdate.updates).length > 0) {
      await supabase
        .from('deals')
        .update(dealUpdate.updates)
        .eq('id', dealUpdate.id);
    }
  }

  // Create tasks (placeholder - would need tasks table)
  for (const task of outputs.updates.tasks || []) {
    console.log('Task creation placeholder:', task.title);
  }

  console.log('Applied agent outputs to database');
}