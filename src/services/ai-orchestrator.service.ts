/**
 * AI Orchestrator Service
 * Single entry point for all AI operations with intelligent routing and caching
 */

import { logger } from './logger.service';
import { cleanConfidence } from './aiNormalize';
import { cacheService } from './cache.service';
import { rateLimiter } from './rate-limiter.service';
import { httpClient } from './http-client.service';
import { aiJson, AIRole } from './aiClient';
import type { LiveOptions } from './liveOptions';
import { Contact } from '../types/contact';

export interface AIRequest {
  id: string;
  type: 'contact_scoring' | 'contact_enrichment' | 'email_generation' | 'email_analysis' | 
        'insights_generation' | 'communication_analysis' | 'automation_suggestions' | 
        'predictive_analytics' | 'relationship_mapping';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: any;
  context?: {
    contactId?: string;
    userId?: string;
    sessionId?: string;
    businessContext?: string;
  };
  options?: {
    useCache?: boolean;
    provider?: 'openai' | 'auto';
    model?: string;
    timeout?: number;
  };
  /** Live progress (onPartial / onStatus / onDelta / signal): the answer streams in while it is produced. */
  live?: LiveOptions;
}

export interface AIResponse {
  id: string;
  type: string;
  result: any;
  metadata: {
    provider: string;
    model: string;
    processingTime: number;
    /** 0-100 evidence-based confidence reported by the model, or null when none was given. */
    confidence: number | null;
    cached: boolean;
    timestamp: string;
    cost?: number;
  };
  error?: string;
}

export interface AIProvider {
  name: 'openai' | 'supabase';
  available: boolean;
  rateLimit: {
    remaining: number;
    resetTime: number;
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
    costPer1kTokens: number;
  };
  type: 'direct' | 'edge_function';
}

// Function Calling Interfaces
export interface FunctionCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  context: {
    contact_id?: string;
    user_id: string;
    session_id: string;
    trigger_source: string;
  };
}

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  execution_time: number;
  fallback_used?: boolean;
}

export interface FunctionHandler {
  execute: (params: any, context: FunctionCall['context']) => Promise<any>;
  validate?: (params: any) => boolean;
  fallback?: (params: any, context: FunctionCall['context']) => Promise<any>;
}

class AIOrchestrator {
  private requestQueue: AIRequest[] = [];
  private processing = false;
  private providers: Map<string, AIProvider> = new Map();
  private requestHistory: AIResponse[] = [];
  private functionRegistry: Map<string, FunctionHandler> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeFunctionRegistry();
    this.startQueueProcessor();
  }

  private initializeProviders(): void {
    // 'openai' is the server-side AI proxy (src/services/aiClient.ts). No API key exists in the browser;
    // authentication is the user's Supabase session and the server resolves model ids from roles.
    this.providers.set('openai', {
      name: 'openai',
      available: true,
      rateLimit: { remaining: 100, resetTime: Date.now() + 60000 },
      performance: { avgResponseTime: 1200, successRate: 0.98, costPer1kTokens: 0.003 },
      type: 'direct'
    });


    // Initialize Supabase as backup
    this.providers.set('supabase', {
      name: 'supabase',
      available: !!(import.meta.env['VITE_SUPABASE_URL'] && import.meta.env['VITE_SUPABASE_ANON_KEY']),
      rateLimit: { remaining: 100, resetTime: Date.now() + 60000 },
      performance: { avgResponseTime: 2000, successRate: 0.85, costPer1kTokens: 0.002 },
      type: 'edge_function'
    });
  }

  private initializeFunctionRegistry(): void {
    // Contact enrichment functions
    this.functionRegistry.set('enrich_contact_profile', {
      execute: this.enrichContactProfile.bind(this),
      validate: this.validateEnrichContactParams.bind(this)
    });

    this.functionRegistry.set('analyze_contact_engagement', {
      execute: this.analyzeContactEngagement.bind(this),
      validate: this.validateAnalyzeEngagementParams.bind(this)
    });

    this.functionRegistry.set('validate_contact_data', {
      execute: this.validateContactData.bind(this),
      validate: this.validateContactValidationParams.bind(this)
    });

    this.functionRegistry.set('generate_contact_insights', {
      execute: this.generateContactInsights.bind(this),
      validate: this.validateGenerateInsightsParams.bind(this)
    });

    // Task and action functions
    this.functionRegistry.set('create_followup_task', {
      execute: this.createFollowupTask.bind(this),
      validate: this.validateCreateTaskParams.bind(this)
    });

    this.functionRegistry.set('update_contact_score', {
      execute: this.updateContactScore.bind(this),
      validate: this.validateUpdateScoreParams.bind(this)
    });

    // Communication functions
    this.functionRegistry.set('generate_personalized_email', {
      execute: this.generatePersonalizedEmail.bind(this),
      validate: this.validateGenerateEmailParams.bind(this)
    });

    this.functionRegistry.set('suggest_contact_field', {
      execute: this.suggestContactField.bind(this),
      validate: this.validateSuggestFieldParams.bind(this)
    });
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processing && this.requestQueue.length > 0) {
        this.processNextRequest();
      }
    }, 100);
  }

  private async processNextRequest(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    this.processing = true;
    const request = this.requestQueue.shift()!;

    try {
      const response = await this.executeRequest(request);
      logger.info('AI request completed successfully', undefined, {
        requestId: request.id,
        service: 'ai-orchestrator',
        operation: 'request_completed'
      });
    } catch (error) {
      logger.error('AI request failed', error as Error, undefined, {
        requestId: request.id,
        service: 'ai-orchestrator',
        operation: 'request_failed'
      });
    } finally {
      this.processing = false;
    }
  }

  private async executeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);

    // Check cache first
    if (request.options?.useCache !== false) {
      const cached = cacheService.get<AIResponse>('ai_responses', cacheKey);
      if (cached) {
        logger.debug('AI response served from cache', undefined, {
          requestId: request.id,
          service: 'ai-orchestrator',
          operation: 'cache_hit'
        });
        return {
          ...cached,
          metadata: { ...cached.metadata, cached: true }
        };
      }
    }

    // Select optimal provider
    const provider = await this.selectProvider(request);
    
    // Execute request
    let result: any;
    let metadata: AIResponse['metadata'];

    try {
      const response = await this.callProvider(provider, request);
      result = response.result;
      metadata = {
        provider: provider.name,
        model: response.model || 'default',
        processingTime: Date.now() - startTime,
        confidence: response.confidence ?? null,
        cached: false,
        timestamp: new Date().toISOString(),
        cost: response.cost
      };
    } catch (error) {
      throw new Error(`AI provider ${provider.name} failed: ${error}`);
    }

    const aiResponse: AIResponse = {
      id: request.id,
      type: request.type,
      result,
      metadata
    };

    // Cache successful responses
    if (request.options?.useCache !== false) {
      const ttl = this.getCacheTTL(request.type);
      cacheService.set('ai_responses', cacheKey, aiResponse, ttl, ['ai', request.type]);
    }

    // Update provider performance
    this.updateProviderPerformance(provider.name, metadata);

    // Store in history
    this.requestHistory.push(aiResponse);
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }

    return aiResponse;
  }

  private async selectProvider(request: AIRequest): Promise<AIProvider> {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.available && p.rateLimit.remaining > 0);

    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    // Check fallback configuration
    const fallbackMode = import.meta.env['VITE_AI_FALLBACK_MODE'] || 'direct_first'; // 'direct_first' | 'supabase_first' | 'optimal'

    // If specific provider requested, use it
    if (request.options?.provider && request.options.provider !== 'auto') {
      const requestedProvider = availableProviders.find(p => p.name === request.options?.provider);
      if (requestedProvider) {
        return requestedProvider;
      }
    }

    // Apply fallback strategy
    if (fallbackMode === 'supabase_first') {
      // Try Supabase edge functions first
      const supabaseProvider = availableProviders.find(p => p.type === 'edge_function');
      if (supabaseProvider) {
        return supabaseProvider;
      }
    } else if (fallbackMode === 'direct_first') {
      // Try direct APIs first (default behavior)
      const directProviders = availableProviders.filter(p => p.type === 'direct');
      if (directProviders.length > 0) {
        return this.selectOptimalProvider(request, directProviders);
      }
      // Fallback to Supabase if no direct providers available
      const supabaseProvider = availableProviders.find(p => p.type === 'edge_function');
      if (supabaseProvider) {
        return supabaseProvider;
      }
    }

    // Default to optimal selection
    return this.selectOptimalProvider(request, availableProviders);
  }

  private selectOptimalProvider(request: AIRequest, providers: AIProvider[]): AIProvider {
    // Score providers based on request characteristics
    const scoredProviders = providers.map(provider => {
      let score = 0;

      // Performance factors
      score += provider.performance.successRate * 40;
      score += (3000 - provider.performance.avgResponseTime) / 100; // Prefer faster responses
      
      // Cost factors (lower cost = higher score)
      if (request.priority === 'low') {
        score += (0.01 - provider.performance.costPer1kTokens) * 1000;
      }

      // Task-specific preferences
      switch (request.type) {
        case 'contact_scoring':
        case 'insights_generation':
          // Prefer accuracy for scoring and insights
          if (provider.name === 'openai') score += 10;
          break;
        case 'email_generation':
        case 'communication_analysis':
          // Both providers are good for communication tasks
          break;
        case 'contact_enrichment':
        case 'predictive_analytics':
          // Prefer higher accuracy models
          if (provider.name === 'openai') score += 5;
          break;
        case 'automation_suggestions':
          // OpenAI is good for automation logic
          if (provider.name === 'openai') score += 5;
          break;
      }

      // Urgency factors
      if (request.priority === 'urgent') {
        score += (3000 - provider.performance.avgResponseTime) / 50; // Heavily prefer speed
      }

      return { provider, score };
    });

    // Return highest scoring provider
    const sortedProviders = scoredProviders.sort((a, b) => b.score - a.score);
    if (sortedProviders.length === 0) {
      throw new Error('No providers available for selection');
    }
    return sortedProviders[0]!.provider;
  }

  private async callProvider(provider: AIProvider, request: AIRequest): Promise<any> {
    const enableSupabaseBackup = import.meta.env['VITE_AI_ENABLE_SUPABASE_BACKUP'] !== 'false';
    const requestTimeout = request.options?.timeout || parseInt(import.meta.env['VITE_AI_FALLBACK_TIMEOUT'] || '60000');
    const maxRetries = parseInt(import.meta.env['VITE_AI_MAX_RETRY_ATTEMPTS'] || '2');
    const debugFallback = import.meta.env['VITE_AI_DEBUG_FALLBACK'] === 'true';

    // Hybrid approach: Try direct APIs first, fallback to Supabase edge functions
    if (provider.type === 'direct') {
      let lastError: Error | null = null;

      // Try direct API with retry logic
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (debugFallback) {
            logger.info(`Attempting direct ${provider.name} API (attempt ${attempt}/${maxRetries})`, undefined, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'direct_api_attempt'
            });
          }

          // Set timeout for the request
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), requestTimeout);
          });

          const apiCall = this.callAI(request);

          const result = await Promise.race([apiCall, timeoutPromise]);

          if (debugFallback) {
            logger.info(`Direct ${provider.name} API succeeded on attempt ${attempt}`, undefined, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'direct_api_success'
            });
          }

          return result;

        } catch (error) {
          lastError = error as Error;

          if (debugFallback) {
            logger.warn(`Direct ${provider.name} API failed on attempt ${attempt}`, {
              attempt,
              maxRetries,
              error: lastError.message
            }, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'direct_api_retry'
            });
          }

          // If this is not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      }

      // All direct API attempts failed, try Supabase fallback if enabled
      if (enableSupabaseBackup) {
        try {
          if (debugFallback) {
            logger.info(`All direct API attempts failed, trying Supabase fallback`, undefined, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'supabase_fallback_attempt'
            });
          }

          return await this.callSupabaseEdgeFunction(provider, request);
        } catch (supabaseError) {
          if (debugFallback) {
            logger.error(`Supabase fallback also failed`, supabaseError as Error, undefined, {
              requestId: request.id,
              service: 'ai-orchestrator',
              operation: 'supabase_fallback_failed'
            });
          }
          throw supabaseError;
        }
      } else {
        throw lastError || new Error(`Direct ${provider.name} API failed after ${maxRetries} attempts`);
      }

    } else if (provider.type === 'edge_function') {
      return await this.callSupabaseEdgeFunction(provider, request);
    } else {
      throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  private async callSupabaseEdgeFunction(provider: AIProvider, request: AIRequest): Promise<any> {
    const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'];
    const supabaseKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing for edge function fallback');
    }

    // Map request types to edge function endpoints
    const endpointMap: Record<string, string> = {
      'contact_scoring': 'ai-enrichment',
      'contact_enrichment': 'ai-enrichment',
      'email_generation': 'email-composer',
      'email_analysis': 'email-analyzer',
      'insights_generation': 'ai-insights',
      'communication_analysis': 'communication-optimization',
      'automation_suggestions': 'adaptive-playbook',
      'predictive_analytics': 'sales-forecasting',
      'relationship_mapping': 'ai-enrichment'
    };

    const endpoint = endpointMap[request.type];
    if (!endpoint) {
      throw new Error(`No edge function endpoint mapping for request type: ${request.type}`);
    }

    logger.info(`Using Supabase edge function fallback: ${endpoint}`, undefined, {
      requestId: request.id,
      service: 'ai-orchestrator',
      operation: 'supabase_edge_function'
    });

    const response = await httpClient.post(
      `${supabaseUrl}/functions/v1/${endpoint}`,
      {
        ...request.data,
        aiProvider: 'openai', // Default to OpenAI for edge functions
        options: request.options
      },
      {
        headers: { 'Authorization': `Bearer ${supabaseKey}` },
        timeout: request.options?.timeout || 30000
      }
    );

    // Transform Supabase response to match our expected format
    return this.transformSupabaseResponse(response.data, request.type);
  }

  private transformSupabaseResponse(supabaseData: any, requestType: string): any {
    // Transform Supabase edge function responses to match our internal format
    if (!supabaseData || !supabaseData.success) {
      throw new Error('Invalid response from Supabase edge function');
    }

    const data = supabaseData.data || supabaseData;

    switch (requestType) {
      case 'contact_scoring':
        return {
          result: {
            score: data.score ?? data.overall ?? null,
            breakdown: data.breakdown || {
              fitScore: null,
              engagementScore: null,
              conversionProbability: null,
              urgencyScore: null
            },
            reasoning: data.reasoning || [],
            recommendations: data.recommendations || [],
            nextBestActions: data.nextBestActions || []
          },
          model: 'supabase-edge-function',
          confidence: cleanConfidence(data.confidence)
        };

      case 'insights_generation':
        return {
          result: {
            insights: (data.insights || []).map((insight: any) => ({
              id: `supabase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: insight.type || 'recommendation',
              title: insight.title || 'AI Insight',
              description: insight.description || '',
              confidence: cleanConfidence(insight.confidence),
              impact: insight.impact || 'medium',
              category: insight.category || 'General',
              actionable: insight.actionable || false,
              suggestedActions: insight.suggestedActions || [],
              dataPoints: insight.dataPoints || []
            }))
          },
          model: 'supabase-edge-function',
          confidence: null
        };

      case 'contact_enrichment':
        return {
          result: data,
          model: 'supabase-edge-function',
          confidence: cleanConfidence(data?.confidence)
        };

      default:
        return {
          result: data,
          model: 'supabase-edge-function',
          confidence: cleanConfidence(data?.confidence)
        };
    }
  }

  /** Pick the server-side model role for a request. */
  private roleForRequest(request: AIRequest): AIRole {
    const hint = request.options?.model;
    if (hint === 'default' || hint === 'thinking' || hint === 'fast' || hint === 'pro') return hint;
    switch (request.type) {
      case 'contact_scoring':
      case 'predictive_analytics':
      case 'relationship_mapping':
        return 'thinking';
      default:
        return 'default';
    }
  }

  /** JSON Schema (Structured Outputs) for each request type. */
  private schemaForRequest(type: AIRequest['type']): { name: string; schema: Record<string, unknown> } {
    const str = { type: 'string' };
    const nullableStr = { type: ['string', 'null'] };
    const strList = { type: 'array', items: { type: 'string' } };
    const obj = (properties: Record<string, unknown>) => ({
      type: 'object',
      additionalProperties: false,
      properties,
      required: Object.keys(properties)
    });

    const confidence = { type: ['integer', 'null'], description: '0-100 integer justified by the evidence in the input, or null' };
    switch (type) {
      case 'contact_scoring':
        return {
          name: 'contact_scoring',
          schema: obj({
            score: { type: 'number' },
            breakdown: obj({
              fitScore: { type: 'number' },
              engagementScore: { type: 'number' },
              conversionProbability: { type: 'number' },
              urgencyScore: { type: 'number' }
            }),
            reasoning: strList,
            recommendations: strList,
            nextBestActions: strList,
            confidence
          })
        };
      case 'insights_generation':
        return {
          name: 'insights',
          schema: obj({
            insights: {
              type: 'array',
              items: obj({
                type: str,
                title: str,
                description: str,
                confidence,
                impact: { type: 'string', enum: ['low', 'medium', 'high'] },
                category: str,
                actionable: { type: 'boolean' },
                suggestedActions: strList,
                dataPoints: strList
              })
            }
          })
        };
      case 'contact_enrichment':
        return {
          name: 'contact_enrichment',
          schema: obj({
            phone: nullableStr,
            socialProfiles: obj({ linkedin: nullableStr, twitter: nullableStr, website: nullableStr }),
            industry: nullableStr,
            location: obj({ city: nullableStr, state: nullableStr, country: nullableStr }),
            bio: nullableStr,
            notes: nullableStr,
            confidence
          })
        };
      case 'email_generation':
        return {
          name: 'email_generation',
          schema: obj({ subject: str, body: str, tone: str, alternatives: strList, confidence })
        };
      default:
        return {
          name: 'analysis',
          schema: obj({ summary: str, analysis: str, recommendations: strList, nextSteps: strList, confidence })
        };
    }
  }

  /** Single transport: server-side AI proxy (Responses API). Throws AIError on failure; never fabricates a result. */
  private async callAI(request: AIRequest): Promise<any> {
    const role = this.roleForRequest(request);
    const { instructions, input } = this.createPromptForRequest(request);
    const { name, schema } = this.schemaForRequest(request.type);

    try {
      const json = await aiJson<any>({
        role,
        instructions,
        input,
        schema,
        schemaName: name,
        maxOutputTokens: 2000,
        // Enrichment must be grounded in real sources rather than guessed.
        ...(request.type === 'contact_enrichment' ? { tools: [{ type: 'web_search' as const }] } : {})
      }, request.live);
      const response = { json };

      if (response.json == null) {
        throw new Error('AI did not return structured JSON');
      }

      const { confidence: modelConfidence, ...result } = response.json as Record<string, any>;
      return {
        result: request.type === 'insights_generation' ? response.json : result,
        model: role,
        confidence: cleanConfidence(modelConfidence)
      };
    } catch (error) {
      logger.error('AI proxy call failed', error as Error, undefined, {
        requestType: request.type,
        role
      });
      throw error;
    }
  }

  private createPromptForRequest(request: AIRequest): { instructions: string; input: string } {
    const { type, data } = request;

    const systemInstructions = `You are SmartCRM's AI assistant, specialized in contact management and sales intelligence. You provide accurate, actionable insights with clear reasoning. Only use facts supplied or verifiable; never invent contact details.`;

    switch (type) {
      case 'contact_scoring':
        return {
          instructions: systemInstructions,
          input: `Analyze this contact and provide a lead scoring assessment:

Contact Information:
- Name: ${data.contact?.name || 'Unknown'}
- Title: ${data.contact?.title || 'Not specified'}
- Company: ${data.contact?.company || 'Not specified'}
- Email: ${data.contact?.email || 'Not specified'}
- Industry: ${data.contact?.industry || 'Not specified'}
- Interest Level: ${data.contact?.interestLevel || 'Not specified'}

Provide an overall score (0-100), a breakdown (fit, engagement, conversion probability, urgency; each 0-100), key reasoning points, recommendations and next best actions. Base the assessment only on the data above.`
        };

      case 'insights_generation':
        return {
          instructions: systemInstructions,
          input: `Generate insights for this contact:

Contact: ${data.contact?.name || 'Unknown'} at ${data.contact?.company || 'Unknown Company'}
Title: ${data.contact?.title || 'Not specified'}
Industry: ${data.contact?.industry || 'Not specified'}
Interest Level: ${data.contact?.interestLevel || 'Not specified'}

Focus on: ${data.insightTypes?.join(', ') || 'opportunities and recommendations'}

Provide 2-3 actionable insights with confidence levels (0-100) and suggested actions.`
        };

      case 'contact_enrichment':
        return {
          instructions: systemInstructions,
          input: `Enrich this contact profile using web search:

Current data:
- Name: ${data.contact?.name || 'Unknown'}
- Title: ${data.contact?.title || 'Not specified'}
- Company: ${data.contact?.company || 'Not specified'}
- Email: ${data.contact?.email || 'Not specified'}

Find: phone, social profiles, industry, location, a short professional bio, and notes.
Only return information you found in real sources. Use null for anything you could not verify. Do not guess.`
        };

      case 'email_generation':
        return {
          instructions: systemInstructions,
          input: `Write a ${data.type || 'follow-up'} email for ${data.contact?.name || 'the contact'}${data.contact?.company ? ` at ${data.contact.company}` : ''}.
Tone: ${data.tone || 'professional'}.
${data.context ? `Context: ${typeof data.context === 'string' ? data.context : JSON.stringify(data.context)}` : ''}
Return a subject, body, tone and up to 2 alternative subject lines.`
        };

      default:
        return {
          instructions: systemInstructions,
          input: `Process this ${type} request.
Contact: ${data.contact?.name || 'Unknown'}
Data: ${JSON.stringify(data).slice(0, 8000)}
Provide a summary, analysis, recommendations and next steps.`
        };
    }
  }

  private updateProviderPerformance(providerName: string, metadata: AIResponse['metadata']): void {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    // Update running averages
    const alpha = 0.1; // Smoothing factor
    provider.performance.avgResponseTime = 
      provider.performance.avgResponseTime * (1 - alpha) + metadata.processingTime * alpha;
    
    // Update rate limit info (simplified)
    provider.rateLimit.remaining = Math.max(0, provider.rateLimit.remaining - 1);
    if (Date.now() > provider.rateLimit.resetTime) {
      provider.rateLimit.remaining = provider.name === 'openai' ? 50 : 60;
      provider.rateLimit.resetTime = Date.now() + 60000;
    }
  }

  private getCacheKey(request: AIRequest): string {
    return `${request.type}_${JSON.stringify(request.data)}_${request.options?.provider || 'auto'}`;
  }

  private getCacheTTL(requestType: string): number {
    const ttlMap: Record<string, number> = {
      'contact_scoring': 3600000, // 1 hour
      'contact_enrichment': 86400000, // 24 hours
      'email_generation': 1800000, // 30 minutes
      'email_analysis': 1800000, // 30 minutes
      'insights_generation': 3600000, // 1 hour
      'communication_analysis': 1800000, // 30 minutes
      'automation_suggestions': 7200000, // 2 hours
      'predictive_analytics': 3600000, // 1 hour
      'relationship_mapping': 86400000 // 24 hours
    };

    return ttlMap[requestType] || 1800000; // Default 30 minutes
  }

  // Public API methods
  async submitRequest(request: Omit<AIRequest, 'id'>): Promise<string> {
    const fullRequest: AIRequest = {
      ...request,
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options: {
        useCache: true,
        provider: 'auto',
        timeout: 30000,
        ...request.options
      }
    };

    this.requestQueue.push(fullRequest);
    
    // Sort queue by priority
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    logger.info('AI request queued', {
      type: fullRequest.type,
      priority: fullRequest.priority
    }, {
      requestId: fullRequest.id,
      service: 'ai-orchestrator',
      operation: 'request_queued'
    });

    return fullRequest.id;
  }

  async executeImmediate(request: Omit<AIRequest, 'id'>): Promise<AIResponse> {
    const fullRequest: AIRequest = {
      ...request,
      id: `ai_immediate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options: {
        useCache: true,
        provider: 'auto',
        timeout: 30000,
        ...request.options
      }
    };

    return this.executeRequest(fullRequest);
  }

  getProviderStatus(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getRequestHistory(limit = 50): AIResponse[] {
    return this.requestHistory.slice(-limit);
  }

  getPerformanceMetrics(): any {
    const recent = this.requestHistory.slice(-100);
    
    return {
      totalRequests: this.requestHistory.length,
      successRate: recent.filter(r => !r.error).length / recent.length,
      avgResponseTime: recent.reduce((sum, r) => sum + r.metadata.processingTime, 0) / recent.length,
      cacheHitRate: recent.filter(r => r.metadata.cached).length / recent.length,
      providerBreakdown: this.getProviderBreakdown(recent)
    };
  }

  private getProviderBreakdown(responses: AIResponse[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    responses.forEach(r => {
      breakdown[r.metadata.provider] = (breakdown[r.metadata.provider] || 0) + 1;
    });
    return breakdown;
  }

  clearCache(): void {
    cacheService.deleteByTag('ai');
    logger.info('AI cache cleared', undefined, {
      service: 'ai-orchestrator',
      operation: 'cache_cleared'
    });
  }

  // Function Handler Implementations

  private async enrichContactProfile(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, contactData } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'contact_enrichment',
      priority: 'medium',
      data: { contact: contactData },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    logger.info('Contact profile enriched successfully', undefined, {
      service: 'ai-orchestrator',
      operation: 'contact_enrichment'
    });

    return response.result;
  }

  private async analyzeContactEngagement(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, engagementData } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'communication_analysis',
      priority: 'medium',
      data: {
        contact: engagementData.contact,
        interactions: engagementData.interactions || [],
        timeframe: engagementData.timeframe || '30d'
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);
    return {
      engagementScore: response.result.score ?? null,
      analysis: response.result.analysis || response.result.summary || '',
      recommendations: response.result.recommendations || []
    };
  }

  private async validateContactData(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactData } = params;

    // Basic validation rules
    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      suggestions: [] as string[]
    };

    // Email validation
    if (contactData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      validation.errors.push('Invalid email format');
      validation.isValid = false;
    }

    // Phone validation (basic)
    if (contactData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(contactData.phone.replace(/[\s\-\(\)]/g, ''))) {
      validation.warnings.push('Phone number format may be invalid');
    }

    // Required fields
    if (!contactData.name || contactData.name.trim().length < 2) {
      validation.errors.push('Name is required and must be at least 2 characters');
      validation.isValid = false;
    }

    // AI-powered validation suggestions
    if (contactData.company && contactData.title) {
      const request: Omit<AIRequest, 'id'> = {
        type: 'insights_generation',
        priority: 'low',
        data: {
          contact: contactData,
          insightTypes: ['data_quality', 'consistency']
        },
        context: {
          userId: context.user_id,
          sessionId: context.session_id
        }
      };

      try {
        const response = await this.executeImmediate(request);
        validation.suggestions = response.result.insights?.map((i: any) => i.description) || [];
      } catch (error) {
        logger.warn('AI validation failed, using basic validation', error as Error);
      }
    }

    return validation;
  }

  private async generateContactInsights(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, contactData, insightTypes } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'insights_generation',
      priority: 'medium',
      data: {
        contact: contactData,
        insightTypes: insightTypes || ['opportunities', 'recommendations', 'risks']
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);
    return response.result;
  }

  private async createFollowupTask(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, taskType, priority, dueDate, description } = params;

    // Generate task details using AI
    const request: Omit<AIRequest, 'id'> = {
      type: 'automation_suggestions',
      priority: 'medium',
      data: {
        contact: params.contactData,
        action: taskType,
        context: description
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    return {
      taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: taskType,
      priority: priority || 'medium',
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      description: description || response.result.description || 'Follow up with contact',
      aiSuggestions: response.result.suggestions || [],
      created: new Date().toISOString()
    };
  }

  private async updateContactScore(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, contactData, scoreFactors } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'contact_scoring',
      priority: 'high',
      data: {
        contact: contactData,
        factors: scoreFactors
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);
    return response.result;
  }

  private async generatePersonalizedEmail(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, contactData, emailType, context: emailContext } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'email_generation',
      priority: 'medium',
      data: {
        contact: contactData,
        type: emailType || 'introduction',
        context: emailContext,
        tone: params.tone || 'professional'
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);
    return response.result;
  }

  private async suggestContactField(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, contactData, fieldType } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'contact_enrichment',
      priority: 'low',
      data: {
        contact: contactData,
        fieldType: fieldType || 'missing_info'
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    // Extract field suggestions from enrichment data
    const suggestions = [];
    const confidence = response.metadata.confidence;
    if (response.result.phone && !contactData.phone) {
      suggestions.push({ field: 'phone', value: response.result.phone, confidence });
    }
    if (response.result.location && !contactData.location) {
      suggestions.push({ field: 'location', value: response.result.location, confidence });
    }
    if (response.result.bio && !contactData.bio) {
      suggestions.push({ field: 'bio', value: response.result.bio, confidence });
    }

    return {
      suggestions,
      enrichmentData: response.result
    };
  }

  // Validation Methods

  private validateEnrichContactParams(params: any): boolean {
    return !!(params.contactId && params.contactData && params.contactData.name);
  }

  private validateAnalyzeEngagementParams(params: any): boolean {
    return !!(params.contactId && params.engagementData);
  }

  private validateContactValidationParams(params: any): boolean {
    return !!(params.contactData);
  }

  private validateGenerateInsightsParams(params: any): boolean {
    return !!(params.contactId && params.contactData);
  }

  private validateCreateTaskParams(params: any): boolean {
    return !!(params.contactId && params.taskType);
  }

  private validateUpdateScoreParams(params: any): boolean {
    return !!(params.contactId && params.contactData);
  }

  private validateGenerateEmailParams(params: any): boolean {
    return !!(params.contactId && params.contactData && params.emailType);
  }

  private validateSuggestFieldParams(params: any): boolean {
    return !!(params.contactId && params.contactData);
  }
}

export const aiOrchestrator = new AIOrchestrator();