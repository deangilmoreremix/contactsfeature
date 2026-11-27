/**
 * Responses API service (server-proxied).
 * All calls go through src/services/aiClient.ts; the OpenAI key and real model ids live server-side.
 * The class/export names are kept for backwards compatibility with existing importers.
 */

import { logger } from './logger.service';
import { aiCache } from '../utils/cache';
import { AIError, type AIRole, type AIEffort } from './aiClient';
import { aiCall, type LiveOptions } from './liveOptions';

export interface GPT51Request {
  /** Live progress callbacks (text typing in, web-search status, Stop via signal). */
  live?: LiveOptions;
  /** Preferred: model role resolved server-side. */
  role?: AIRole;
  /**
   * Legacy hint. Real model ids are never used in the browser; names containing
   * "thinking", "pro" or "instant"/"mini"/"nano" are mapped to a role, anything else is "default".
   */
  model?: string;
  input: string;
  reasoning?: {
    effort: AIEffort;
  };
  /** Accepted for compatibility; verbosity is controlled server-side. */
  text?: {
    verbosity: 'low' | 'medium' | 'high';
  };
  max_output_tokens?: number;
  previous_response_id?: string | undefined;
  instructions?: string;
  /** Hosted web search only (custom/shell/apply_patch tools are not available from the browser). */
  webSearch?: boolean;
}

export interface GPT51Response {
  id: string;
  output_text: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  citations?: Array<{ url: string; title?: string }>;
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

function resolveRole(request: GPT51Request): AIRole {
  if (request.role) return request.role;
  const m = (request.model || '').toLowerCase();
  if (m.includes('thinking')) return 'thinking';
  if (m.includes('pro')) return 'pro';
  if (m.includes('instant') || m.includes('mini') || m.includes('nano')) return 'fast';
  return 'default';
}

function parseJsonLoose(text: string): any | null {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* fall through */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* ignore */ }
  }
  return null;
}

export class GPT51ResponsesService {
  private static instance: GPT51ResponsesService;

  static getInstance(): GPT51ResponsesService {
    if (!GPT51ResponsesService.instance) {
      GPT51ResponsesService.instance = new GPT51ResponsesService();
    }
    return GPT51ResponsesService.instance;
  }

  /**
   * Create a response through the server-side AI proxy (Responses API).
   * Throws AIError on failure; no fabricated output is ever returned.
   */
  async createResponse(request: GPT51Request): Promise<GPT51Response> {
    const cacheKey = aiCache.getGPT51CacheKey({ ...request, model: resolveRole(request) });
    const cachedResponse = aiCache.get(cacheKey);

    if (cachedResponse) {
      logger.info('Returning cached Responses API result');
      return cachedResponse;
    }

    try {
      const res = await aiCall({
        role: resolveRole(request),
        ...(request.reasoning?.effort ? { effort: request.reasoning.effort } : {}),
        input: request.input,
        ...(request.instructions ? { instructions: request.instructions } : {}),
        ...(request.max_output_tokens ? { maxOutputTokens: request.max_output_tokens } : {}),
        ...(request.previous_response_id ? { previousResponseId: request.previous_response_id } : {}),
        ...(request.webSearch ? { tools: [{ type: 'web_search' as const }] } : {})
      }, request.live);

      const result: GPT51Response = {
        id: res.id,
        output_text: res.text,
        citations: res.citations,
        ...(res.usage
          ? { usage: { input_tokens: res.usage.input_tokens ?? 0, output_tokens: res.usage.output_tokens ?? 0 } }
          : {})
      };

      aiCache.set(cacheKey, result);
      logger.info('Responses API call succeeded', {
        responseId: result.id,
        outputLength: result.output_text?.length || 0
      });
      return result;
    } catch (error) {
      logger.error('Responses API call failed', error as Error);
      if (error instanceof AIError) throw error;
      throw new AIError((error as Error).message || 'AI request failed', 502);
    }
  }

  /**
   * Analyze product intelligence with GPT-5.1
   */
  async analyzeProductIntelligence(
    urls: string[],
    documents: string[],
    context?: string,
    live?: LiveOptions
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
      role: 'thinking',
      input,
      reasoning: { effort: 'high' },
      text: { verbosity: 'high' },
      max_output_tokens: 4000,
      webSearch: urls.length > 0,
      ...(live ? { live } : {})
    });

    const parsed = parseJsonLoose(response.output_text);
    if (!parsed) {
      throw new AIError('AI returned an unparseable product analysis', 502);
    }
    return {
      company: parsed.company || {},
      product: parsed.product || {},
      market: parsed.market || {},
      contacts: parsed.contacts || [],
      recommendations: parsed.recommendations || []
    };
  }

  /**
   * Generate content with advanced reasoning
   */
  async generateContent(
    analysis: any,
    contentType: 'email' | 'call_script' | 'sales_playbook' | 'proposal',
    context?: string,
    live?: LiveOptions
  ): Promise<string> {
    const input = `
Based on this analysis: ${JSON.stringify(analysis)}

Generate a ${contentType} for sales engagement.
${context ? `Additional context: ${context}` : ''}

Use high reasoning effort to create compelling, personalized content.
    `;

    const response = await this.createResponse({
      role: 'thinking',
      input,
      reasoning: { effort: 'high' },
      text: { verbosity: 'high' },
      max_output_tokens: 2000,
      ...(live ? { live } : {})
    });

    return response.output_text;
  }

  /**
   * Get available models
   */
  getAvailableModels(): AIRole[] {
    return ['default', 'thinking', 'fast', 'pro'];
  }

  /**
   * Validate API configuration
   */
  isConfigured(): boolean {
    return true; // the key is held server-side; auth is the user's Supabase session
  }
}

export const gpt51ResponsesService = GPT51ResponsesService.getInstance();