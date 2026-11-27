import { supabase } from './supabaseClient';
import { logger } from './logger.service';
import { mcpAdapter } from './mcpAdapter';
import { aiJson, type AIRole } from './aiClient';
import type { LiveOptions } from './liveOptions';
import { streamFunction } from './liveFunction';
import aiEndpoints from '../lib/streaming/aiEndpoints.json';

/** Netlify functions that answer over SSE when asked (dual-mode, docs/STREAMING.md). Everything else stays plain JSON. */
const DUAL_MODE_FUNCTIONS = new Set<string>(aiEndpoints.endpoints);
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
  /** Live progress for the planning turn (the agent's reply types in via onPartial: {response}). */
  live?: LiveOptions;
}

/** Function-tool definition offered to the agent planner (executed client-side via Netlify functions / MCP). */
export interface AgentToolDefinition {
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
}

export interface AgentModelUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  reasoning_tokens?: number;
}

/** Normalized result of one agent model turn (via the server-side AI proxy). */
export interface AgentModelResult {
  content: string;
  tool_calls: Array<{ id: string; name: string; arguments: string }>;
  usage: AgentModelUsage;
}

class AgentFramework {
  /**
   * Execute an agent via the server-side AI proxy (Responses API)
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
      const context = await this.gatherContext(request.contactId, request.dealId);

      // Create agent run record
      const agentRun: Omit<AgentRun, 'id' | 'created_at'> = {
        agent_id: request.agentId,
        ...(request.contactId ? { contact_id: request.contactId } : {}),
        ...(request.dealId ? { deal_id: request.dealId } : {}),
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

        // Execute agent (planning turn: the model may request tool calls)
        const response = await this.callAgentModel({
          role: this.roleForAgent(agentConfig),
          instructions: systemPrompt,
          input: JSON.stringify(request.input || {}),
          tools: tools || [],
          maxOutputTokens: agentConfig.max_output_tokens || 4000,
          ...(request.live ? { live: request.live } : {})
        });

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
      model: data.model || 'default',
      reasoning_effort: data.reasoning_effort || 'medium',
      verbosity: data.verbosity || 'medium',
      max_output_tokens: data.max_output_tokens
    };
  }

  /**
   * Gather context data for agent execution
   */
  private async gatherContext(contactId?: string, dealId?: string): Promise<AgentContext> {
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
  private async buildTools(toolNames: string[]): Promise<AgentToolDefinition[]> {
    const tools: AgentToolDefinition[] = [];

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
        description: 'AI contact scoring and lead qualification using AI',
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
        description: 'Generate presentation visuals using OpenAI image generation',
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
      },
      'social-selling-agent': {
        name: 'social-selling-agent',
        description: 'AI-powered LinkedIn and social media engagement with personalized outreach',
        parameters: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Contact ID to analyze' },
            campaign_type: { type: 'string', description: 'Type of social campaign' },
            platform: { type: 'string', description: 'Social platform (linkedin, twitter, etc.)' },
            personalization_level: { type: 'string', description: 'Level of personalization' }
          },
          required: ['contact_id']
        }
      },
      'email-personalization-agent': {
        name: 'email-personalization-agent',
        description: 'Advanced email personalization with dynamic content and A/B testing',
        parameters: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Contact ID for personalization' },
            email_type: { type: 'string', description: 'Type of email (outreach, follow-up, etc.)' },
            industry_context: { type: 'string', description: 'Industry-specific context' },
            personalization_level: { type: 'string', description: 'Depth of personalization' },
            ab_test_variants: { type: 'array', description: 'A/B testing variants' }
          },
          required: ['contact_id']
        }
      },
      'revenue-intelligence-agent': {
        name: 'revenue-intelligence-agent',
        description: 'Predictive revenue analytics with deal forecasting and pipeline optimization',
        parameters: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Contact ID for analysis' },
            deal_id: { type: 'string', description: 'Deal ID for forecasting' },
            forecast_period: { type: 'string', description: 'Forecast time period' },
            include_seasonal_analysis: { type: 'boolean', description: 'Include seasonal trends' }
          }
        }
      },
      'competitive-intelligence-agent': {
        name: 'competitive-intelligence-agent',
        description: 'Real-time competitor monitoring and strategic intelligence gathering',
        parameters: {
          type: 'object',
          properties: {
            target_company: { type: 'string', description: 'Company to analyze' },
            industry: { type: 'string', description: 'Industry context' },
            monitoring_period: { type: 'string', description: 'Analysis time period' },
            include_pricing_analysis: { type: 'boolean', description: 'Include pricing intelligence' }
          },
          required: ['target_company']
        }
      },
      'negotiation-coach-agent': {
        name: 'negotiation-coach-agent',
        description: 'Real-time negotiation assistance with strategy recommendations and objection handling',
        parameters: {
          type: 'object',
          properties: {
            deal_id: { type: 'string', description: 'Deal ID for negotiation coaching' },
            negotiation_stage: { type: 'string', description: 'Current negotiation stage' },
            buyer_persona: { type: 'string', description: 'Buyer personality type' },
            deal_value: { type: 'number', description: 'Deal monetary value' },
            current_objections: { type: 'string', description: 'Current buyer objections' }
          },
          required: ['deal_id']
        }
      },
      'content-creation-agent': {
        name: 'content-creation-agent',
        description: 'AI-powered content generation for marketing, sales, and thought leadership',
        parameters: {
          type: 'object',
          properties: {
            content_type: { type: 'string', description: 'Type of content to create' },
            target_audience: { type: 'string', description: 'Target audience description' },
            key_messages: { type: 'array', description: 'Key messages to include' },
            tone: { type: 'string', description: 'Content tone and style' },
            length: { type: 'string', description: 'Content length preference' }
          },
          required: ['content_type']
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

  /** Map an agent's stored model/effort hints onto a server-side model role. */
  private roleForAgent(agentConfig: AgentConfig): AIRole {
    const hint = String(agentConfig.model || '').toLowerCase();
    if (hint.includes('pro')) return 'pro';
    if (hint.includes('instant') || hint.includes('fast') || hint.includes('mini') || hint.includes('nano')) return 'fast';
    if (hint.includes('thinking') || agentConfig.reasoning_effort === 'high') return 'thinking';
    return 'default';
  }

  /**
   * One agent model turn through the AI proxy. The proxy does not accept raw function tools, so the
   * model is asked (with a strict JSON schema) to reply and to list any tool calls it wants executed.
   */
  private async callAgentModel(params: {
    role: AIRole;
    instructions: string;
    input: string;
    tools: AgentToolDefinition[];
    maxOutputTokens: number;
    live?: LiveOptions;
  }): Promise<AgentModelResult> {
    const toolNames = params.tools.map(t => t.function.name);
    const toolCatalog = params.tools.length
      ? `\n\nAvailable tools (request them via tool_calls; arguments_json must be a JSON object string matching the parameters):\n${JSON.stringify(params.tools.map(t => t.function), null, 2)}`
      : '\n\nNo tools are available; leave tool_calls empty.';

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        response: { type: 'string', description: 'The agent response text (may itself be a JSON string if the instructions require structured output).' },
        tool_calls: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: toolNames.length ? { type: 'string', enum: toolNames } : { type: 'string' },
              arguments_json: { type: 'string' }
            },
            required: ['name', 'arguments_json']
          }
        }
      },
      required: ['response', 'tool_calls']
    };

    const result = await aiJson<{ response: string; tool_calls: Array<{ name: string; arguments_json: string }> }>({
      role: params.role,
      instructions: params.instructions + toolCatalog,
      input: params.input,
      schema,
      schemaName: 'agent_turn',
      maxOutputTokens: params.maxOutputTokens
    }, params.live);

    return {
      content: result.response || '',
      tool_calls: (result.tool_calls || []).map((c, i) => ({
        id: `call_${Date.now()}_${i}`,
        name: c.name,
        arguments: c.arguments_json || '{}'
      })),
      // The proxy does not report per-call usage to this layer; do not fabricate numbers.
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }

  /**
   * Process agent response and extract tool calls
   */
  private async processAgentResponse(
    response: AgentModelResult,
    _agentConfig: AgentConfig
  ): Promise<{ toolCalls: ToolCall[], finalResponse: string }> {
    const toolCalls: ToolCall[] = [];
    for (const call of response.tool_calls) {
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(call.arguments || '{}');
      } catch {
        throw new Error(`Agent requested tool "${call.name}" with invalid JSON arguments`);
      }
      toolCalls.push({ id: call.id, type: 'function', name: call.name, arguments: args });
    }
    return { toolCalls, finalResponse: response.content };
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

    // Tool runs report status / text to the caller's live callbacks. onPartial stays with the planning turn
    // (the agent's own reply), so a tool's JSON never overwrites it.
    const live: LiveOptions | undefined = request.live
      ? { ...(request.live.onStatus ? { onStatus: request.live.onStatus } : {}), ...(request.live.onDelta ? { onDelta: request.live.onDelta } : {}), ...(request.live.signal ? { signal: request.live.signal } : {}) }
      : undefined;

    // Route to appropriate Netlify function
    switch (name) {
      case 'ai-enrichment':
        return await this.callNetlifyFunction('ai-enrichment', args);

      case 'email-composer':
        return await this.callNetlifyFunction('email-composer', args, live);

      case 'generate-demo-visuals':
        return await this.callNetlifyFunction('generate-image', {
          prompt: args?.['prompt'] || '',
          n: 3,
          size: '1536x1024'
        });

      case 'deal-health-analysis':
        return await this.callNetlifyFunction('deal-health-analysis', args, live);

      case 'sales-forecasting':
        return await this.callNetlifyFunction('sales-forecasting', args, live);

      case 'semantic-search':
        return await this.callNetlifyFunction('semantic-search', args);

      case 'social-selling-agent':
        return await this.callNetlifyFunction('social-selling-agent', args, live);

      case 'email-personalization-agent':
        return await this.callNetlifyFunction('email-personalization-agent', args, live);

      case 'revenue-intelligence-agent':
        return await this.callNetlifyFunction('revenue-intelligence-agent', args, live);

      case 'competitive-intelligence-agent':
        return await this.callNetlifyFunction('competitive-intelligence-agent', args, live);

      case 'negotiation-coach-agent':
        return await this.callNetlifyFunction('negotiation-coach-agent', args, live);

      case 'content-creation-agent':
        return await this.callNetlifyFunction('content-creation-agent', args, live);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Call Netlify function. Dual-mode functions (the ones that stream) are called over SSE so `live` receives
   * status / text while they work; the resolved value is the same JSON the function returns in plain mode.
   */
  private async callNetlifyFunction(functionName: string, payload: any, live?: LiveOptions): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('User must be authenticated');
    }

    if (DUAL_MODE_FUNCTIONS.has(functionName)) {
      try {
        const { result } = await streamFunction<any>(`/.netlify/functions/${functionName}`, payload ?? {}, live ?? {});
        return result;
      } catch (e) {
        if (live?.signal?.aborted) throw e;
        throw new Error(`Function ${functionName} error: ${e instanceof Error ? e.message : 'request failed'}`);
      }
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
    _toolResults: any[],
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
        updates.contacts?.push({
          id: request.contactId,
          updates: content.contact_updates
        });
      }

      if (content.deal_updates && request.dealId) {
        updates.deals?.push({
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