import { supabase } from './supabaseClient';
import { logger } from './logger.service';
import { mcpAdapter } from './mcpAdapter';
import type {
  AgentConfig,
  AgentRun,
  AgentContext,
  AgentExecutionResult,
  ToolCall,
  AgentResponse
} from '../types/agent';

export interface AgentExecutionRequest {
  agentId: string;
  contactId?: string;
  dealId?: string;
  userId: string;
  input?: Record<string, any>;
  context?: AgentContext;
  instructions?: string;
}

export interface OpenAIResponsesRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
    tool_call_id?: string;
  }>;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
      };
    };
  }>;
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
}

export interface OpenAIResponsesResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number;
  };
}

class AgentFramework {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp:generateContent';

  /**
   * Execute an agent using OpenAI Responses API
   */
  async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    try {
      logger.info('Executing agent', {
        agentId: request.agentId,
        contactId: request.contactId,
        dealId: request.dealId
      });

      // Load agent configuration
      const agentConfig = await this.loadAgentConfig(request.agentId);
      if (!agentConfig) {
        throw new Error(`Agent ${request.agentId} not found`);
      }

      // Gather context data
      const context = await this.gatherContext(request.userId, request.contactId, request.dealId);

      // Create agent run record
      const agentRun: Omit<AgentRun, 'id' | 'created_at'> = {
        agent_id: request.agentId,
        contact_id: request.contactId || undefined,
        deal_id: request.dealId || undefined,
        user_id: request.userId,
        input_data: request.input || {},
        status: 'running'
      };

      const savedRun = await this.saveAgentRun(agentRun);

      try {
        // Build system prompt
        const systemPrompt = this.buildSystemPrompt(agentConfig, context, request.instructions);

        // Build tools from agent config
        const tools = await this.buildTools(agentConfig.tools);

        // Execute agent with tool calling
        const openAIRequest: OpenAIResponsesRequest = {
          model: agentConfig.model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(request.input || {}) }
          ],
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: agentConfig.max_output_tokens || 4000,
          reasoning_effort: (agentConfig.reasoning_effort === 'none' ? 'low' : agentConfig.reasoning_effort) || 'medium'
        };

        if (tools && tools.length > 0) {
          openAIRequest.tools = tools;
        }

        const response = await this.callOpenAIResponses(openAIRequest);

        // Process tool calls and responses
        const { toolCalls, finalResponse } = await this.processAgentResponse(response, agentConfig);

        // Execute tool calls
        const toolResults = await this.executeToolCalls(toolCalls, request);

        // Generate final agent response
        const agentResponse = await this.generateAgentResponse(
          agentConfig,
          finalResponse,
          toolResults,
          response.usage
        );

        // Update agent run with results
        await this.updateAgentRun(savedRun.id, {
          status: 'completed',
          output_data: agentResponse,
          tool_calls: toolCalls,
          execution_time_ms: Date.now() - new Date(savedRun.created_at).getTime(),
          tokens_used: {
            input_tokens: response.usage.prompt_tokens,
            output_tokens: response.usage.completion_tokens,
            reasoning_tokens: response.usage.reasoning_tokens || 0,
            total_tokens: response.usage.total_tokens
          },
          completed_at: new Date().toISOString()
        });

        // Apply outputs to update contacts/deals
        const updates = await this.applyAgentOutputs(agentResponse, request);

        return {
          run: { ...savedRun, status: 'completed' },
          response: agentResponse,
          updates
        };

      } catch (executionError) {
        // Update run with error
        await this.updateAgentRun(savedRun.id, {
          status: 'failed',
          error_message: executionError instanceof Error ? executionError.message : 'Unknown error',
          completed_at: new Date().toISOString()
        });
        throw executionError;
      }

    } catch (error) {
      logger.error('Agent execution failed', error as Error);
      throw error;
    }
  }

  /**
   * Load agent configuration from Supabase
   */
  private async loadAgentConfig(agentId: string): Promise<AgentConfig | null> {
    const { data, error } = await supabase
      .from('agent_metadata')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      tools: data.tools || [],
      input_schema: data.input_schema || {},
      output_schema: data.output_schema || {},
      recommended_ui_placement: data.recommended_ui_placement || '',
      trigger_options: data.trigger_options || {},
      prompt_template: data.prompt_template,
      instructions: data.instructions,
      model: data.model || 'gpt-4o',
      reasoning_effort: data.reasoning_effort || 'medium',
      verbosity: data.verbosity || 'medium',
      max_output_tokens: data.max_output_tokens
    };
  }

  /**
   * Gather context data for agent execution
   */
  private async gatherContext(userId: string, contactId?: string, dealId?: string): Promise<AgentContext> {
    const context: AgentContext = {};

    try {
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

      // Load journey history (simplified)
      context.journey_history = [];

      // Load prior agent runs
      context.prior_runs = await this.loadAgentRuns(undefined, contactId, dealId, 5);

      // Load analytics (placeholder)
      context.analytics = {};

      logger.info('Context gathered successfully', {
        hasContact: !!context.contact,
        hasDeal: !!context.deal,
        priorRuns: context.prior_runs?.length || 0
      });

    } catch (error) {
      logger.error('Error gathering context:', error);
    }

    return context;
  }

  /**
   * Build system prompt for agent
   */
  private buildSystemPrompt(agentConfig: AgentConfig, context: AgentContext, customInstructions?: string): string {
    let prompt = agentConfig.instructions || agentConfig.description || '';

    // Add context information
    if (context.contact) {
      prompt += `\n\nContact Context: ${JSON.stringify(context.contact, null, 2)}`;
    }

    if (context.deal) {
      prompt += `\n\nDeal Context: ${JSON.stringify(context.deal, null, 2)}`;
    }

    if (context.prior_runs && context.prior_runs.length > 0) {
      prompt += `\n\nPrior Agent Runs: ${JSON.stringify(context.prior_runs.slice(0, 3), null, 2)}`;
    }

    if (customInstructions) {
      prompt += `\n\nAdditional Instructions: ${customInstructions}`;
    }

    prompt += `\n\nYou have access to various tools. Use them when needed to gather information or perform actions. Always provide well-structured, actionable responses.`;

    return prompt;
  }

  /**
   * Check if a tool is an MCP tool
   */
  private async isMCPTool(toolName: string): Promise<boolean> {
    const mcpTool = await mcpAdapter.getTool(toolName);
    return mcpTool !== null;
  }

  /**
   * Build tools array from agent config
   */
  private async buildTools(toolNames: string[]): Promise<OpenAIResponsesRequest['tools']> {
    const tools: OpenAIResponsesRequest['tools'] = [];

    for (const toolName of toolNames) {
      // Check if it's an MCP tool first
      if (await this.isMCPTool(toolName)) {
        const mcpTools = await mcpAdapter.getOpenAITools([toolName]);
        tools.push(...mcpTools);
      } else {
        // Use existing Netlify function tools
        const tool = await this.getToolDefinition(toolName);
        if (tool) {
          tools.push(tool);
        }
      }
    }

    return tools;
  }

  /**
   * Get tool definition by name
   */
  private async getToolDefinition(toolName: string): Promise<any> {
    // Map tool names to Netlify function definitions
    const toolDefinitions: Record<string, any> = {
      'ai-enrichment': {
        name: 'ai-enrichment',
        description: 'AI contact scoring and lead qualification using GPT-4 and Gemini',
        parameters: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Contact ID to analyze' },
            include_social: { type: 'boolean', description: 'Include social media analysis' }
          },
          required: ['contact_id']
        }
      },
      'email-composer': {
        name: 'email-composer',
        description: 'Generate personalized emails with optional banner images',
        parameters: {
          type: 'object',
          properties: {
            contact: { type: 'object', description: 'Contact information' },
            purpose: { type: 'string', description: 'Email purpose (introduction, follow-up, proposal, etc.)' },
            generate_images: { type: 'boolean', description: 'Generate email banner images' }
          },
          required: ['contact', 'purpose']
        }
      },
      'generate-demo-visuals': {
        name: 'generate-demo-visuals',
        description: 'Generate presentation visuals using Gemini 2.5 Flash',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Description of visuals needed' },
            contact_id: { type: 'string', description: 'Contact ID for context' },
            deal_id: { type: 'string', description: 'Deal ID for context' }
          },
          required: ['prompt']
        }
      },
      'deal-health-analysis': {
        name: 'deal-health-analysis',
        description: 'Analyze deal health and provide recommendations',
        parameters: {
          type: 'object',
          properties: {
            deal_id: { type: 'string', description: 'Deal ID to analyze' }
          },
          required: ['deal_id']
        }
      },
      'sales-forecasting': {
        name: 'sales-forecasting',
        description: 'Generate sales forecasts and predictions',
        parameters: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Contact ID' },
            deal_id: { type: 'string', description: 'Deal ID' },
            timeframe: { type: 'string', description: 'Forecast timeframe' }
          }
        }
      },
      'semantic-search': {
        name: 'semantic-search',
        description: 'Search contacts and deals using semantic similarity',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum results' }
          },
          required: ['query']
        }
      }
      // Add more tool definitions as needed
    };

    const definition = toolDefinitions[toolName];
    if (!definition) {
      logger.warn(`Tool definition not found: ${toolName}`);
      return null;
    }

    return {
      type: 'function',
      function: definition
    };
  }

  /**
   * Call OpenAI Responses API
   */
  private async callOpenAIResponses(request: OpenAIResponsesRequest): Promise<OpenAIResponsesResponse> {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(this.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    return await response.json();
  }

  /**
   * Process agent response and extract tool calls
   */
  private async processAgentResponse(
    response: OpenAIResponsesResponse,
    agentConfig: AgentConfig
  ): Promise<{ toolCalls: ToolCall[], finalResponse: string }> {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response choices returned');
    }

    const message = choice.message;
    const toolCalls: ToolCall[] = [];
    const finalResponse = message.content || '';

    // Process tool calls
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        toolCalls.push({
          id: toolCall.id,
          type: 'function',
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments)
        });
      }
    }

    return { toolCalls, finalResponse };
  }

  /**
   * Execute tool calls
   */
  private async executeToolCalls(toolCalls: ToolCall[], request: AgentExecutionRequest): Promise<any[]> {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeTool(toolCall, request);
        results.push({
          tool_call_id: toolCall.id,
          result
        });
      } catch (error) {
        logger.error(`Tool execution failed: ${toolCall.name}`, error as Error);
        results.push({
          tool_call_id: toolCall.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Execute individual tool
   */
  private async executeTool(toolCall: ToolCall, request: AgentExecutionRequest): Promise<any> {
    const { name, arguments: args } = toolCall;

    // Check if it's an MCP tool first
    if (await this.isMCPTool(name)) {
      return await mcpAdapter.executeTool(name, args || {});
    }

    // Route to appropriate Netlify function
    switch (name) {
      case 'ai-enrichment':
        return await this.callNetlifyFunction('ai-enrichment', args);

      case 'email-composer':
        return await this.callNetlifyFunction('email-composer', args);

      case 'generate-demo-visuals':
        return await this.callNetlifyFunction('gemini-image-generator', {
          prompt: args?.prompt || '',
          variants: 3,
          aspect_ratio: '16:9',
          contact_id: args?.contact_id,
          deal_id: args?.deal_id,
          agent_id: request.agentId,
          feature: 'demo-visuals',
          format: 'presentation'
        });

      case 'deal-health-analysis':
        return await this.callNetlifyFunction('deal-health-analysis', args);

      case 'sales-forecasting':
        return await this.callNetlifyFunction('sales-forecasting', args);

      case 'semantic-search':
        return await this.callNetlifyFunction('semantic-search', args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Call Netlify function
   */
  private async callNetlifyFunction(functionName: string, payload: any): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User must be authenticated');
    }

    const response = await fetch(`/.netlify/functions/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Function ${functionName} error: ${errorData.error || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Generate final agent response
   */
  private async generateAgentResponse(
    agentConfig: AgentConfig,
    content: string,
    toolResults: any[],
    usage: any
  ): Promise<AgentResponse> {
    return {
      id: `response_${Date.now()}`,
      agent_id: agentConfig.id,
      output_text: content,
      reasoning: '',
      tool_calls: [],
      usage: {
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
        reasoning_tokens: usage.reasoning_tokens,
        total_tokens: usage.total_tokens
      }
    };
  }

  /**
   * Apply agent outputs to update contacts and deals
   */
  private async applyAgentOutputs(response: AgentResponse, request: AgentExecutionRequest): Promise<AgentExecutionResult['updates']> {
    // Parse the response content to extract updates
    // This would be more sophisticated in production
    const updates: AgentExecutionResult['updates'] = {
      contacts: [],
      deals: [],
      insights: [],
      tags: [],
      tasks: []
    };

    // Simple parsing - in production this would be more robust
    try {
      const content = JSON.parse(response.output_text);
      if (content.contact_updates && request.contactId) {
        updates.contacts.push({
          id: request.contactId,
          updates: content.contact_updates
        });
      }

      if (content.deal_updates && request.dealId) {
        updates.deals.push({
          id: request.dealId,
          updates: content.deal_updates
        });
      }

      if (content.tasks) {
        updates.tasks = content.tasks;
      }

      if (content.tags) {
        updates.tags = content.tags;
      }
    } catch (error) {
      // If not JSON, treat as text response
      logger.info('Agent response is text-only, no structured updates');
    }

    return updates;
  }

  /**
   * Save agent run to database
   */
  private async saveAgentRun(run: Omit<AgentRun, 'id' | 'created_at'>): Promise<AgentRun> {
    const { data, error } = await supabase
      .from('agent_runs')
      .insert(run)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save agent run: ${error.message}`);
    }

    return data;
  }

  /**
   * Update agent run
   */
  private async updateAgentRun(runId: string, updates: Partial<AgentRun>): Promise<void> {
    const { error } = await supabase
      .from('agent_runs')
      .update(updates)
      .eq('id', runId);

    if (error) {
      logger.error('Failed to update agent run', error);
    }
  }

  /**
   * Load agent runs for context
   */
  private async loadAgentRuns(agentId?: string, contactId?: string, dealId?: string, limit = 10): Promise<AgentRun[]> {
    let query = supabase
      .from('agent_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agentId) query = query.eq('agent_id', agentId);
    if (contactId) query = query.eq('contact_id', contactId);
    if (dealId) query = query.eq('deal_id', dealId);

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to load agent runs', error);
      return [];
    }

    return data || [];
  }
}

export const agentFramework = new AgentFramework();