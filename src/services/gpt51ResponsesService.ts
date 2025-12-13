/**
import { getModelForTask, SMARTCRM_DEFAULT_MODEL } from '../config/ai';
 * GPT-5.1 Responses API Service
 * Advanced AI service using OpenAI's latest Responses API with GPT-5.1
 * Supports reasoning controls, verbosity, custom tools, and new tool types
 */

import { logger } from './logger.service';
import { aiCache } from '../utils/cache';

export interface GPT51Request {
  model?: 'gpt-5.1' | 'gpt-5-mini' | 'gpt-5-nano';
  input: string;
  reasoning?: {
    effort: 'none' | 'low' | 'medium' | 'high';
  };
  text?: {
    verbosity: 'low' | 'medium' | 'high';
  };
  max_output_tokens?: number;
  tools?: Tool[];
  tool_choice?: ToolChoice;
  previous_response_id?: string | undefined;
  instructions?: string;
}

export interface Tool {
  type: 'custom' | 'apply_patch' | 'shell' | 'function';
  name?: string;
  description?: string;
  parameters?: any;
}

export interface ToolChoice {
  type: 'allowed_tools';
  mode: 'auto' | 'required';
  tools: Array<{ type: string; name: string }>;
}

export interface GPT51Response {
  id: string;
  output_text: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens?: number;
  };
}

export interface ToolCall {
  id: string;
  type: string;
  name?: string;
  arguments?: any;
  preamble?: string;
}

export class GPT51ResponsesService {
  private static instance: GPT51ResponsesService;
  private readonly API_BASE_URL = 'https://api.openai.com/v1/responses';
  private apiKey = import.meta.env['VITE_OPENAI_API_KEY'];
  private maxRetries = 3;
  private retryDelay = 1000;

  static getInstance(): GPT51ResponsesService {
    if (!GPT51ResponsesService.instance) {
      GPT51ResponsesService.instance = new GPT51ResponsesService();
    }
    return GPT51ResponsesService.instance;
  }

  constructor() {
    logger.info('GPT-5.1 Responses Service initialized', {
      hasApiKey: !!this.apiKey,
      apiUrl: this.API_BASE_URL
    });
  }

  /**
   * Create a response using GPT-5.1 Responses API
   */
  async createResponse(request: GPT51Request): Promise<GPT51Response> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const cacheKey = aiCache.getGPT51CacheKey(request);
    const cachedResponse = aiCache.get(cacheKey);

    if (cachedResponse) {
      logger.info('Returning cached GPT-5.1 response');
      return cachedResponse;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`GPT-5.1 API call attempt ${attempt}`, {
          model: request.model || getModelForTask('sdr') || SMARTCRM_DEFAULT_MODEL,
          reasoning: request.reasoning?.effort || 'none',
          verbosity: request.text?.verbosity || 'medium',
          hasTools: !!request.tools?.length
        });

        const response = await fetch(this.API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: request.model || getModelForTask('sdr') || SMARTCRM_DEFAULT_MODEL,
            input: request.input,
            reasoning: request.reasoning || { effort: 'none' },
            text: request.text || { verbosity: 'medium' },
            max_output_tokens: request.max_output_tokens,
            tools: request.tools,
            tool_choice: request.tool_choice,
            previous_response_id: request.previous_response_id,
            instructions: request.instructions
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`GPT-5.1 API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        const result: GPT51Response = {
          id: data.id,
          output_text: data.output_text,
          reasoning: data.reasoning,
          tool_calls: data.tool_calls,
          usage: data.usage
        };

        // Cache successful responses
        aiCache.set(cacheKey, result);

        logger.info('GPT-5.1 response created successfully', {
          responseId: result.id,
          outputLength: result.output_text?.length || 0,
          toolCalls: result.tool_calls?.length || 0,
          usage: result.usage
        });

        return result;

      } catch (error) {
        logger.warn(`GPT-5.1 API attempt ${attempt} failed:`, error as Error);

        if (attempt === this.maxRetries) {
          logger.error('All GPT-5.1 API attempts failed');
          throw new Error(`GPT-5.1 API call failed after ${this.maxRetries} attempts: ${(error as Error).message}`);
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, attempt - 1)));
      }
    }

    throw new Error('Unexpected error in GPT-5.1 API call');
  }

  /**
   * Analyze product intelligence with GPT-5.1
   */
  async analyzeProductIntelligence(
    urls: string[],
    documents: string[],
    context?: string
  ): Promise<{
    company: any;
    product: any;
    market: any;
    contacts: any[];
    recommendations: string[];
  }> {
    const input = `
Analyze the following company/product information and provide structured intelligence:

URLs to analyze: ${urls.join(', ')}
${documents.length > 0 ? `Documents: ${documents.join(', ')}` : ''}
${context ? `Additional context: ${context}` : ''}

Please provide:
1. Company overview (name, industry, size, location, description)
2. Product analysis (name, category, features, pricing, target market)
3. Market intelligence (size, growth, competitors, opportunities, threats)
4. Key contacts found (with roles and confidence levels)
5. Strategic recommendations for sales engagement

Format your response as a structured JSON object.
    `;

    const response = await this.createResponse({
      model: SMARTCRM_DEFAULT_MODEL,
      input,
      reasoning: { effort: 'high' },
      text: { verbosity: 'high' },
      max_output_tokens: 4000
    });

    try {
      // Parse the JSON response
      const parsed = JSON.parse(response.output_text);
      return {
        company: parsed.company || {},
        product: parsed.product || {},
        market: parsed.market || {},
        contacts: parsed.contacts || [],
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      logger.warn('Failed to parse GPT-5.1 analysis response, using fallback');
      // Fallback parsing for non-JSON responses
      return this.parseFallbackAnalysis(response.output_text);
    }
  }

  /**
   * Generate content with advanced reasoning
   */
  async generateContent(
    analysis: any,
    contentType: 'email' | 'call_script' | 'sales_playbook' | 'proposal',
    context?: string
  ): Promise<string> {
    const input = `
Based on this analysis: ${JSON.stringify(analysis)}

Generate a ${contentType} for sales engagement.
${context ? `Additional context: ${context}` : ''}

Use high reasoning effort to create compelling, personalized content.
    `;

    const response = await this.createResponse({
      model: SMARTCRM_DEFAULT_MODEL,
      input,
      reasoning: { effort: 'high' },
      text: { verbosity: 'high' },
      max_output_tokens: 2000
    });

    return response.output_text;
  }

  /**
   * Use apply_patch tool for code generation/modification
   */
  async applyCodePatch(
    task: string,
    currentCode?: string,
    previousResponseId?: string
  ): Promise<{ patches: any[], explanation: string }> {
    const tools: Tool[] = [
      {
        type: 'apply_patch',
        name: 'apply_patch'
      }
    ];

    const input = `
${task}
${currentCode ? `\nCurrent code:\n${currentCode}` : ''}

Use the apply_patch tool to make the necessary code changes.
Explain your reasoning before applying patches.
    `;

    const response = await this.createResponse({
      model: SMARTCRM_DEFAULT_MODEL,
      input,
      reasoning: { effort: 'high' },
      text: { verbosity: 'medium' },
      tools,
      previous_response_id: previousResponseId,
      instructions: 'Before calling apply_patch, explain what changes you will make and why.'
    });

    return {
      patches: response.tool_calls?.filter(call => call.type === 'apply_patch') || [],
      explanation: response.output_text
    };
  }

  /**
   * Use shell tool for system interactions
   */
  async executeShellCommand(
    command: string,
    context?: string,
    previousResponseId?: string
  ): Promise<{ output: string, success: boolean }> {
    const tools: Tool[] = [
      {
        type: 'shell',
        name: 'shell'
      }
    ];

    const input = `
Execute this shell command: ${command}
${context ? `Context: ${context}` : ''}

Use the shell tool to run the command and analyze the results.
    `;

    const response = await this.createResponse({
      model: SMARTCRM_DEFAULT_MODEL,
      input,
      reasoning: { effort: 'medium' },
      text: { verbosity: 'low' },
      tools,
      previous_response_id: previousResponseId
    });

    // In a real implementation, you'd handle the shell tool execution
    // For now, return the model's reasoning
    return {
      output: response.output_text,
      success: !response.tool_calls?.some(call => call.type === 'error')
    };
  }

  /**
   * Use custom tools with freeform inputs
   */
  async useCustomTool(
    toolName: string,
    toolDescription: string,
    task: string,
    grammar?: string
  ): Promise<{ result: string, toolCalls: ToolCall[] }> {
    const tools: Tool[] = [
      {
        type: 'custom',
        name: toolName,
        description: toolDescription,
        parameters: grammar ? { grammar } : undefined
      }
    ];

    const response = await this.createResponse({
      model: SMARTCRM_DEFAULT_MODEL,
      input: task,
      reasoning: { effort: 'medium' },
      text: { verbosity: 'medium' },
      tools,
      tool_choice: {
        type: 'allowed_tools',
        mode: 'required',
        tools: [{ type: 'custom', name: toolName }]
      }
    });

    return {
      result: response.output_text,
      toolCalls: response.tool_calls || []
    };
  }

  /**
   * Fallback parser for non-JSON responses
   */
  private parseFallbackAnalysis(text: string): any {
    // Simple fallback parsing - in production, you'd want more robust parsing
    return {
      company: { name: 'Unknown', description: text.substring(0, 200) },
      product: { name: 'Unknown' },
      market: { size: 'Unknown' },
      contacts: [],
      recommendations: ['Analysis completed - review full response for details']
    };
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return ['gpt-5.2', 'gpt-5.2-thinking', 'gpt-5.2-instant', 'gpt-5-mini', 'gpt-5-nano'];
  }

  /**
   * Validate API configuration
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const gpt51ResponsesService = GPT51ResponsesService.getInstance();