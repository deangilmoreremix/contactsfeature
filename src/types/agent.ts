/**
 * Agent Framework Types
 * TypeScript interfaces for the unified agent framework using OpenAI's Responses API
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  tools: string[];
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  recommended_ui_placement: string;
  trigger_options: {
    manual?: boolean;
    auto?: boolean;
    triggers?: string[];
    interval?: string;
  };
  prompt_template?: string;
  instructions?: string;
  model?: 'gpt-5.1' | 'gpt-5-mini' | 'gpt-5-nano';
  reasoning_effort?: 'none' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  max_output_tokens?: number;
}

export interface ToolCall {
  id: string;
  type: 'function' | 'custom' | 'apply_patch' | 'shell';
  name: string;
  arguments?: Record<string, any>;
  preamble?: string;
  result?: any;
  error?: string;
}

export interface AgentResponse {
  id: string;
  agent_id: string;
  contact_id?: string;
  deal_id?: string;
  output_text: string;
  reasoning?: string;
  tool_calls: ToolCall[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens?: number;
    total_tokens: number;
  };
  metadata?: Record<string, any>;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  contact_id?: string;
  deal_id?: string;
  user_id: string;
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  tool_calls?: ToolCall[];
  status: 'running' | 'completed' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
  tokens_used?: {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens?: number;
    total_tokens: number;
  };
  created_at: string;
  completed_at?: string;
}

export interface AgentContext {
  contact?: {
    id: string;
    name: string;
    email?: string;
    company?: string;
    title?: string;
    industry?: string;
    [key: string]: any;
  };
  deal?: {
    id: string;
    name: string;
    value?: number;
    stage?: string;
    close_date?: string;
    [key: string]: any;
  };
  journey_history?: Array<{
    type: string;
    timestamp: string;
    data: Record<string, any>;
  }>;
  semantic_search?: Array<{
    content: string;
    score: number;
    source: string;
  }>;
  analytics?: Record<string, any>;
  prior_runs?: AgentRun[];
}

export interface NetlifyFunctionTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  function_path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface AgentExecutionRequest {
  agentId: string;
  contactId?: string;
  dealId?: string;
  userId: string;
  input?: Record<string, any>;
  context?: AgentContext;
}

export interface AgentExecutionResult {
  run: AgentRun;
  response: AgentResponse;
  updates: {
    contacts?: Array<{
      id: string;
      updates: Record<string, any>;
    }>;
    deals?: Array<{
      id: string;
      updates: Record<string, any>;
    }>;
    insights?: Array<{
      type: string;
      data: Record<string, any>;
    }>;
    tags?: Array<{
      entity_type: 'contact' | 'deal';
      entity_id: string;
      tag: string;
    }>;
    tasks?: Array<{
      title: string;
      description?: string;
      due_date?: string;
      priority?: 'low' | 'medium' | 'high';
      assigned_to?: string;
    }>;
  };
}