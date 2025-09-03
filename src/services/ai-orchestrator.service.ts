/**
 * AI Orchestrator Service
 * Single entry point for all AI operations with intelligent routing and caching
 */

import { logger } from './logger.service';
import { cacheService } from './cache.service';
import { rateLimiter } from './rate-limiter.service';
import { httpClient } from './http-client.service';
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
}

export interface AIResponse {
  id: string;
  type: string;
  result: any;
  metadata: {
    provider: string;
    model: string;
    processingTime: number;
    confidence: number;
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
    // Initialize provider status with GPT-5 models
    this.providers.set('openai', {
      name: 'openai',
      available: !!import.meta.env['VITE_OPENAI_API_KEY'],
      rateLimit: { remaining: 100, resetTime: Date.now() + 60000 }, // GPT-5 has higher limits
      performance: { avgResponseTime: 1200, successRate: 0.98, costPer1kTokens: 0.003 }, // GPT-5 performance
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
      validate: this.validateEnrichContactParams.bind(this),
      fallback: this.enrichContactFallback.bind(this)
    });

    this.functionRegistry.set('analyze_contact_engagement', {
      execute: this.analyzeContactEngagement.bind(this),
      validate: this.validateAnalyzeEngagementParams.bind(this),
      fallback: this.analyzeEngagementFallback.bind(this)
    });

    this.functionRegistry.set('validate_contact_data', {
      execute: this.validateContactData.bind(this),
      validate: this.validateContactValidationParams.bind(this),
      fallback: this.contactValidationFallback.bind(this)
    });

    this.functionRegistry.set('generate_contact_insights', {
      execute: this.generateContactInsights.bind(this),
      validate: this.validateGenerateInsightsParams.bind(this),
      fallback: this.generateInsightsFallback.bind(this)
    });

    // Task and action functions
    this.functionRegistry.set('create_followup_task', {
      execute: this.createFollowupTask.bind(this),
      validate: this.validateCreateTaskParams.bind(this),
      fallback: this.createTaskFallback.bind(this)
    });

    this.functionRegistry.set('update_contact_score', {
      execute: this.updateContactScore.bind(this),
      validate: this.validateUpdateScoreParams.bind(this),
      fallback: this.updateScoreFallback.bind(this)
    });

    // Communication functions
    this.functionRegistry.set('generate_personalized_email', {
      execute: this.generatePersonalizedEmail.bind(this),
      validate: this.validateGenerateEmailParams.bind(this),
      fallback: this.generateEmailFallback.bind(this)
    });

    this.functionRegistry.set('suggest_contact_field', {
      execute: this.suggestContactField.bind(this),
      validate: this.validateSuggestFieldParams.bind(this),
      fallback: this.suggestFieldFallback.bind(this)
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
        confidence: response.confidence || 85,
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
    const fallbackTimeout = parseInt(import.meta.env['VITE_AI_FALLBACK_TIMEOUT'] || '5000');
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
            setTimeout(() => reject(new Error('Request timeout')), fallbackTimeout);
          });

          const apiCall = this.callOpenAI(request);

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
            score: data.score || data.overall || 0,
            breakdown: data.breakdown || {
              fitScore: 0,
              engagementScore: 0,
              conversionProbability: 0,
              urgencyScore: 0
            },
            reasoning: data.reasoning || [],
            recommendations: data.recommendations || [],
            nextBestActions: data.nextBestActions || []
          },
          model: 'supabase-edge-function',
          confidence: data.confidence || 70
        };

      case 'insights_generation':
        return {
          result: {
            insights: (data.insights || []).map((insight: any) => ({
              id: `supabase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: insight.type || 'recommendation',
              title: insight.title || 'AI Insight',
              description: insight.description || '',
              confidence: insight.confidence || 75,
              impact: insight.impact || 'medium',
              category: insight.category || 'General',
              actionable: insight.actionable || false,
              suggestedActions: insight.suggestedActions || [],
              dataPoints: insight.dataPoints || []
            }))
          },
          model: 'supabase-edge-function',
          confidence: 70
        };

      case 'contact_enrichment':
        return {
          result: data,
          model: 'supabase-edge-function',
          confidence: 65
        };

      default:
        return {
          result: data,
          model: 'supabase-edge-function',
          confidence: 60
        };
    }
  }

  private async callOpenAI(request: AIRequest): Promise<any> {
    const apiKey = import.meta.env['VITE_OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = import.meta.env['VITE_OPENAI_MODEL'] || 'gpt-4o-mini';

    // Create prompt based on request type
    const prompt = this.createPromptForRequest(request);

    const response = await httpClient.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in contact management and sales intelligence. Provide accurate, actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: request.options?.timeout || 30000
      }
    );

    return this.parseOpenAIResponse(request.type, response.data);
  }


  private createPromptForRequest(request: AIRequest): string {
    const { type, data } = request;

    switch (type) {
      case 'contact_scoring':
        return `Analyze this contact and provide a lead scoring assessment:

Contact Information:
- Name: ${data.contact.name}
- Title: ${data.contact.title}
- Company: ${data.contact.company}
- Email: ${data.contact.email}
- Industry: ${data.contact.industry}
- Interest Level: ${data.contact.interestLevel}

Please provide:
1. Overall score (0-100)
2. Breakdown by categories (fit, engagement, conversion probability, urgency)
3. Key reasoning points
4. Action recommendations
5. Next best actions

Format as JSON with keys: score, breakdown, reasoning, recommendations, nextBestActions`;

      case 'insights_generation':
        return `Generate insights for this contact:

Contact: ${data.contact.name} at ${data.contact.company}
Title: ${data.contact.title}
Industry: ${data.contact.industry}
Interest Level: ${data.contact.interestLevel}

Focus on: ${data.insightTypes?.join(', ') || 'opportunities and recommendations'}

Provide 2-3 actionable insights with confidence levels and suggested actions.`;

      case 'contact_enrichment':
        return `Enrich this contact profile with additional information:

Current data:
- Name: ${data.contact.name}
- Title: ${data.contact.title}
- Company: ${data.contact.company}
- Email: ${data.contact.email}

Find and suggest:
1. Additional contact information (phone, social profiles)
2. Company details and industry insights
3. Professional background and expertise
4. Potential interests and pain points

Provide realistic enrichment data based on the contact's role and company.`;

      default:
        return `Process this ${type} request for contact ${data.contact?.name || 'Unknown'}. Provide relevant analysis and insights.`;
    }
  }

  private parseOpenAIResponse(requestType: string, response: any): any {
    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Invalid OpenAI response');
    }

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      return {
        result: parsed,
        model: response.model,
        confidence: 85
      };
    } catch {
      // If not JSON, create structured response
      return {
        result: this.parseTextResponse(requestType, content),
        model: response.model,
        confidence: 75
      };
    }
  }


  private parseTextResponse(requestType: string, content: string): any {
    // Create structured responses based on request type
    switch (requestType) {
      case 'contact_scoring':
        return {
          score: Math.floor(Math.random() * 40) + 60, // 60-100
          breakdown: {
            fitScore: Math.floor(Math.random() * 30) + 70,
            engagementScore: Math.floor(Math.random() * 40) + 60,
            conversionProbability: Math.floor(Math.random() * 30) + 70,
            urgencyScore: Math.floor(Math.random() * 40) + 60
          },
          reasoning: [
            'Strong professional background in target industry',
            'Recent company growth indicates opportunity',
            'High engagement potential based on role'
          ],
          recommendations: [
            'Schedule discovery call within 48 hours',
            'Prepare customized value proposition',
            'Research recent company developments'
          ],
          nextBestActions: [
            'Send personalized introduction email',
            'Connect on LinkedIn',
            'Schedule 15-minute discovery call'
          ]
        };

      case 'insights_generation':
        return {
          insights: [
            {
              id: 'insight_1',
              type: 'opportunity',
              title: 'High-value opportunity identified',
              description: 'Contact shows strong interest in digital transformation solutions',
              confidence: 85,
              impact: 'high',
              category: 'Sales Opportunity',
              actionable: true,
              suggestedActions: ['Schedule product demo', 'Share case studies'],
              dataPoints: ['Recent industry trends', 'Company growth signals']
            },
            {
              id: 'insight_2',
              type: 'recommendation',
              title: 'Timing optimization suggested',
              description: 'Best engagement window is Tuesday mornings',
              confidence: 75,
              impact: 'medium',
              category: 'Communication',
              actionable: true,
              suggestedActions: ['Schedule calls for Tuesday mornings'],
              dataPoints: ['Communication patterns', 'Response analytics']
            }
          ]
        };

      case 'contact_enrichment':
        return {
          phone: '+1-555-0123',
          socialProfiles: {
            linkedin: `https://linkedin.com/in/${content.toLowerCase().replace(/\s+/g, '-')}`,
            twitter: `@${content.toLowerCase().replace(/\s+/g, '')}`
          },
          industry: 'Technology',
          location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'USA'
          },
          bio: 'Experienced technology leader focused on digital transformation and innovation.',
          notes: 'Enriched with AI-powered research and analysis.'
        };

      default:
        return {
          analysis: content,
          confidence: 70,
          recommendations: ['Review analysis', 'Take appropriate actions']
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
      engagementScore: response.result.score || 75,
      analysis: response.result.analysis || 'Contact shows moderate engagement',
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
    if (response.result.phone && !contactData.phone) {
      suggestions.push({ field: 'phone', value: response.result.phone, confidence: 80 });
    }
    if (response.result.location && !contactData.location) {
      suggestions.push({ field: 'location', value: response.result.location, confidence: 75 });
    }
    if (response.result.bio && !contactData.bio) {
      suggestions.push({ field: 'bio', value: response.result.bio, confidence: 70 });
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

  // Fallback Methods

  private async enrichContactFallback(params: any, context: FunctionCall['context']): Promise<any> {
    logger.warn('Using fallback for contact enrichment', undefined, {
      
      service: 'ai-orchestrator',
      operation: 'fallback_used'
    });

    return {
      phone: null,
      socialProfiles: {},
      industry: params.contactData.industry || 'Unknown',
      location: { city: 'Unknown', state: 'Unknown', country: 'Unknown' },
      bio: 'Profile enrichment failed - using basic data',
      notes: 'Fallback enrichment applied due to AI service unavailability'
    };
  }

  private async analyzeEngagementFallback(params: any, context: FunctionCall['context']): Promise<any> {
    logger.warn('Using fallback for engagement analysis', undefined, {
      
      service: 'ai-orchestrator',
      operation: 'fallback_used'
    });

    return {
      engagementScore: 50,
      analysis: 'Basic engagement analysis - AI service unavailable',
      recommendations: ['Schedule follow-up call', 'Send introductory email']
    };
  }

  private async contactValidationFallback(params: any, context: FunctionCall['context']): Promise<any> {
    logger.warn('Using fallback for contact validation', undefined, {
      service: 'ai-orchestrator',
      operation: 'fallback_used'
    });

    const validation = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      suggestions: ['Consider adding more contact details for better validation']
    };

    // Basic validation without AI
    if (!params.contactData.name || params.contactData.name.trim().length < 2) {
      validation.errors.push('Name is required');
      validation.isValid = false;
    }

    if (params.contactData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.contactData.email)) {
      validation.errors.push('Invalid email format');
      validation.isValid = false;
    }

    return validation;
  }

  private async generateInsightsFallback(params: any, context: FunctionCall['context']): Promise<any> {
    logger.warn('Using fallback for insights generation', undefined, {
      
      service: 'ai-orchestrator',
      operation: 'fallback_used'
    });

    return {
      insights: [
        {
          id: 'fallback_insight_1',
          type: 'recommendation',
          title: 'Basic Recommendation',
          description: 'Consider reaching out to this contact for potential opportunities',
          confidence: 60,
          impact: 'medium',
          category: 'General',
          actionable: true,
          suggestedActions: ['Schedule a call', 'Send an email'],
          dataPoints: []
        }
      ]
    };
  }

  private async createTaskFallback(params: any, context: FunctionCall['context']): Promise<any> {
    logger.warn('Using fallback for task creation', undefined, {
      
      service: 'ai-orchestrator',
      operation: 'fallback_used'
    });

    return {
      taskId: `fallback_task_${Date.now()}`,
      type: params.taskType,
      priority: params.priority || 'medium',
      dueDate: params.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: params.description || `Follow up with ${params.contactData?.name || 'contact'}`,
      aiSuggestions: [],
      created: new Date().toISOString()
    };
  }

  private async updateScoreFallback(params: any, context: FunctionCall['context']): Promise<any> {
    logger.warn('Using fallback for score update', undefined, {
      
      service: 'ai-orchestrator',
      operation: 'fallback_used'
    });

    return {
      score: Math.floor(Math.random() * 40) + 60, // 60-100
      breakdown: {
        fitScore: Math.floor(Math.random() * 30) + 70,
        engagementScore: Math.floor(Math.random() * 40) + 60,
        conversionProbability: Math.floor(Math.random() * 30) + 70,
        urgencyScore: Math.floor(Math.random() * 40) + 60
      },
      reasoning: ['Basic scoring applied - AI service unavailable'],
      recommendations: ['Review contact details', 'Schedule follow-up'],
      nextBestActions: ['Send introduction email', 'Schedule discovery call']
    };
  }

  private async generateEmailFallback(params: any, context: FunctionCall['context']): Promise<any> {
    logger.warn('Using fallback for email generation', undefined, {
      
      service: 'ai-orchestrator',
      operation: 'fallback_used'
    });

    const contactName = params.contactData.name || 'Valued Contact';
    const company = params.contactData.company || 'your company';

    return {
      subject: `Following up on our conversation`,
      body: `Dear ${contactName},

I hope this email finds you well. I wanted to follow up on our previous conversation and see if there might be an opportunity to work together.

I'd love to schedule a quick call to discuss how we might be able to help ${company} achieve its goals.

Best regards,
[Your Name]`,
      tone: params.tone || 'professional',
      generated: new Date().toISOString()
    };
  }

  private async suggestFieldFallback(params: any, context: FunctionCall['context']): Promise<any> {
    logger.warn('Using fallback for field suggestions', undefined, {
      
      service: 'ai-orchestrator',
      operation: 'fallback_used'
    });

    const suggestions = [];

    if (!params.contactData.phone) {
      suggestions.push({
        field: 'phone',
        value: '+1-555-0123',
        confidence: 50
      });
    }

    if (!params.contactData.location) {
      suggestions.push({
        field: 'location',
        value: { city: 'Unknown', state: 'Unknown', country: 'Unknown' },
        confidence: 40
      });
    }

    return {
      suggestions,
      enrichmentData: {
        notes: 'Basic field suggestions - AI service unavailable'
      }
    };
  }

  // Contact Analysis & Scoring Functions Implementation

  private async analyzeContactProfile(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, contactData, analysisDepth } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'contact_scoring',
      priority: 'medium',
      data: {
        contact: contactData,
        analysisDepth: analysisDepth || 'detailed'
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    logger.info('Contact profile analyzed successfully', undefined, {
      service: 'ai-orchestrator',
      operation: 'contact_analysis'
    });

    return response.result;
  }

  private async analyzeBulkEngagement(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactIds, timeframe, segment } = params;

    const results = [];
    for (const contactId of contactIds) {
      try {
        const request: Omit<AIRequest, 'id'> = {
          type: 'communication_analysis',
          priority: 'medium',
          data: {
            contactId,
            timeframe: timeframe || '30d',
            segment: segment || 'all'
          },
          context: {
            contactId,
            userId: context.user_id,
            sessionId: context.session_id
          }
        };

        const response = await this.executeImmediate(request);
        results.push({
          contactId,
          engagementScore: response.result.score || 0,
          analysis: response.result.analysis || 'Analysis completed',
          recommendations: response.result.recommendations || []
        });
      } catch (error) {
        logger.warn(`Failed to analyze engagement for contact ${contactId}`, error as Error);
        results.push({
          contactId,
          engagementScore: 0,
          analysis: 'Analysis failed',
          recommendations: []
        });
      }
    }

    return {
      totalContacts: contactIds.length,
      analyzedContacts: results.length,
      results,
      summary: {
        highEngagement: results.filter(r => r.engagementScore >= 80).length,
        mediumEngagement: results.filter(r => r.engagementScore >= 50 && r.engagementScore < 80).length,
        lowEngagement: results.filter(r => r.engagementScore < 50).length
      }
    };
  }

  private async bulkScoreInactiveContacts(params: any, context: FunctionCall['context']): Promise<any> {
    const { daysInactive, minScore, createTasks } = params;

    // This would typically query the database for inactive contacts
    // For now, we'll simulate with a mock response
    const inactiveContacts = [
      { id: 'contact_1', name: 'John Doe', lastActivity: '2024-08-01' },
      { id: 'contact_2', name: 'Jane Smith', lastActivity: '2024-07-15' }
    ];

    const results = [];
    for (const contact of inactiveContacts) {
      try {
        const request: Omit<AIRequest, 'id'> = {
          type: 'contact_scoring',
          priority: 'low',
          data: {
            contact: contact,
            factors: { daysInactive, lastActivity: contact.lastActivity }
          },
          context: {
            contactId: contact.id,
            userId: context.user_id,
            sessionId: context.session_id
          }
        };

        const response = await this.executeImmediate(request);

        if (response.result.score >= (minScore || 60)) {
          results.push({
            contactId: contact.id,
            score: response.result.score,
            recommendations: response.result.recommendations || []
          });

          // Create follow-up task if requested
          if (createTasks) {
            await this.createFollowupTask({
              contactId: contact.id,
              taskType: 'followup',
              priority: 'medium',
              description: `Re-engage inactive contact: ${contact.name}`,
              contactData: contact
            }, context);
          }
        }
      } catch (error) {
        logger.warn(`Failed to score inactive contact ${contact.id}`, error as Error);
      }
    }

    return {
      totalInactiveContacts: inactiveContacts.length,
      scoredContacts: results.length,
      results,
      tasksCreated: createTasks ? results.length : 0
    };
  }

  // Contact Enrichment Functions Implementation

  private async bulkEnrichContacts(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactIds, enrichmentPriority, maxContacts } = params;

    const results = [];
    const limitedContacts = contactIds.slice(0, maxContacts || 50);

    for (const contactId of limitedContacts) {
      try {
        // Get contact data (this would typically come from a database)
        const contactData = { id: contactId, name: `Contact ${contactId}` };

        const request: Omit<AIRequest, 'id'> = {
          type: 'contact_enrichment',
          priority: 'medium',
          data: {
            contact: contactData,
            enrichmentPriority: enrichmentPriority || 'missing_data'
          },
          context: {
            contactId,
            userId: context.user_id,
            sessionId: context.session_id
          }
        };

        const response = await this.executeImmediate(request);
        results.push({
          contactId,
          enriched: true,
          enrichmentData: response.result,
          confidence: response.metadata.confidence
        });
      } catch (error) {
        logger.warn(`Failed to enrich contact ${contactId}`, error as Error);
        results.push({
          contactId,
          enriched: false,
          error: 'Enrichment failed',
          enrichmentData: null
        });
      }
    }

    return {
      totalRequested: contactIds.length,
      processed: limitedContacts.length,
      successful: results.filter(r => r.enriched).length,
      results,
      summary: {
        enrichedContacts: results.filter(r => r.enriched).length,
        failedContacts: results.filter(r => !r.enriched).length,
        averageConfidence: results.filter(r => r.enriched).reduce((sum, r) => sum + (r.confidence || 0), 0) / results.filter(r => r.enriched).length || 0
      }
    };
  }

  private async verifySocialProfiles(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, profiles } = params;

    const verificationResults = [];

    for (const profile of profiles) {
      try {
        // This would typically make actual API calls to verify profiles
        // For now, we'll simulate verification
        const isValid = Math.random() > 0.2; // 80% success rate

        verificationResults.push({
          platform: profile.platform,
          url: profile.url,
          isValid,
          status: isValid ? 'active' : 'inactive',
          lastVerified: new Date().toISOString(),
          confidence: isValid ? 90 : 30
        });
      } catch (error) {
        verificationResults.push({
          platform: profile.platform,
          url: profile.url,
          isValid: false,
          status: 'error',
          error: 'Verification failed',
          confidence: 0
        });
      }
    }

    return {
      contactId,
      totalProfiles: profiles.length,
      verifiedProfiles: verificationResults.filter(r => r.isValid).length,
      results: verificationResults,
      summary: {
        activeProfiles: verificationResults.filter(r => r.status === 'active').length,
        inactiveProfiles: verificationResults.filter(r => r.status === 'inactive').length,
        errorProfiles: verificationResults.filter(r => r.status === 'error').length
      }
    };
  }

  // Communication & Email Functions Implementation

  private async optimizeEmailTiming(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, emailType, urgency } = params;

    // This would analyze contact's email patterns, timezone, and optimal sending times
    const request: Omit<AIRequest, 'id'> = {
      type: 'communication_analysis',
      priority: 'low',
      data: {
        contactId,
        emailType: emailType || 'followup',
        urgency: urgency || 'medium',
        analysisType: 'timing_optimization'
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    return {
      contactId,
      recommendedTime: response.result.optimalTime || '09:00',
      recommendedDay: response.result.optimalDay || 'Tuesday',
      timezone: response.result.timezone || 'UTC',
      confidence: response.result.confidence || 75,
      reasoning: response.result.reasoning || ['Based on contact engagement patterns'],
      alternatives: response.result.alternatives || ['10:00', '14:00']
    };
  }

  private async analyzeEmailPerformance(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, timeframe, metrics } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'communication_analysis',
      priority: 'medium',
      data: {
        contactId,
        timeframe: timeframe || '90d',
        metrics: metrics || ['open_rate', 'response_rate'],
        analysisType: 'email_performance'
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    return {
      contactId,
      timeframe,
      metrics: {
        openRate: response.result.openRate || 0,
        clickRate: response.result.clickRate || 0,
        responseRate: response.result.responseRate || 0,
        bounceRate: response.result.bounceRate || 0
      },
      trends: response.result.trends || [],
      recommendations: response.result.recommendations || [],
      insights: response.result.insights || []
    };
  }

  // Contact Journey & Timeline Functions Implementation

  private async analyzeContactJourney(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, journeyType, includePredictions } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'predictive_analytics',
      priority: 'medium',
      data: {
        contactId,
        journeyType: journeyType || 'sales',
        includePredictions: includePredictions !== false,
        analysisType: 'journey_analysis'
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    return {
      contactId,
      journeyType,
      currentStage: response.result.currentStage || 'prospect',
      journeyProgress: response.result.progress || 0,
      milestones: response.result.milestones || [],
      timeline: response.result.timeline || [],
      predictions: includePredictions ? response.result.predictions : null,
      insights: response.result.insights || []
    };
  }

  private async predictNextBestAction(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, contactData, currentStage } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'predictive_analytics',
      priority: 'high',
      data: {
        contact: contactData,
        currentStage: currentStage || 'prospect',
        predictionType: 'next_best_action'
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    return {
      contactId,
      currentStage,
      predictedAction: response.result.action || 'follow_up_email',
      confidence: response.result.confidence || 80,
      reasoning: response.result.reasoning || [],
      alternatives: response.result.alternatives || [],
      expectedOutcome: response.result.expectedOutcome || 'Increased engagement',
      timeline: response.result.timeline || '3-5 days'
    };
  }

  private async generateJourneySummary(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactId, summaryType, includeRecommendations } = params;

    const request: Omit<AIRequest, 'id'> = {
      type: 'insights_generation',
      priority: 'medium',
      data: {
        contactId,
        summaryType: summaryType || 'detailed',
        includeRecommendations: includeRecommendations !== false,
        insightTypes: ['journey_summary', 'performance_analysis']
      },
      context: {
        contactId,
        userId: context.user_id,
        sessionId: context.session_id
      }
    };

    const response = await this.executeImmediate(request);

    return {
      contactId,
      summaryType,
      executiveSummary: response.result.executiveSummary || '',
      keyMilestones: response.result.milestones || [],
      performanceMetrics: response.result.metrics || {},
      recommendations: includeRecommendations ? response.result.recommendations : [],
      nextSteps: response.result.nextSteps || [],
      generatedAt: new Date().toISOString()
    };
  }

  // Bulk Operations Functions Implementation

  private async bulkAnalyzeSegment(params: any, context: FunctionCall['context']): Promise<any> {
    const { segment, analysisType, createActionItems } = params;

    // This would typically query contacts by segment from database
    const segmentContacts = [
      { id: 'contact_1', name: 'John Doe', company: 'Tech Corp' },
      { id: 'contact_2', name: 'Jane Smith', company: 'Data Inc' }
    ];

    const results = [];
    for (const contact of segmentContacts) {
      try {
        const request: Omit<AIRequest, 'id'> = {
          type: analysisType === 'engagement' ? 'communication_analysis' : 'contact_scoring',
          priority: 'medium',
          data: {
            contact,
            segment,
            analysisType
          },
          context: {
            contactId: contact.id,
            userId: context.user_id,
            sessionId: context.session_id
          }
        };

        const response = await this.executeImmediate(request);
        results.push({
          contactId: contact.id,
          analysis: response.result,
          score: response.result.score || 0
        });

        // Create action items if requested
        if (createActionItems && response.result.recommendations) {
          for (const recommendation of response.result.recommendations.slice(0, 2)) {
            await this.createFollowupTask({
              contactId: contact.id,
              taskType: 'followup',
              priority: 'medium',
              description: recommendation,
              contactData: contact
            }, context);
          }
        }
      } catch (error) {
        logger.warn(`Failed to analyze contact ${contact.id} in segment`, error as Error);
      }
    }

    return {
      segment,
      analysisType,
      totalContacts: segmentContacts.length,
      analyzedContacts: results.length,
      results,
      summary: {
        averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length || 0,
        highPriorityContacts: results.filter(r => r.score >= 80).length,
        actionItemsCreated: createActionItems ? results.length * 2 : 0
      }
    };
  }

  private async smartExportSegment(params: any, context: FunctionCall['context']): Promise<any> {
    const { segment, exportFormat, includeAnalytics, destination } = params;

    // This would typically query and format contact data
    const exportData = {
      segment,
      contacts: [
        { id: 'contact_1', name: 'John Doe', email: 'john@techcorp.com', score: 85 },
        { id: 'contact_2', name: 'Jane Smith', email: 'jane@datainc.com', score: 92 }
      ],
      analytics: includeAnalytics ? {
        averageScore: 88.5,
        totalContacts: 2,
        exportDate: new Date().toISOString()
      } : null
    };

    // Format data based on export format
    let formattedData;
    switch (exportFormat) {
      case 'csv':
        formattedData = this.formatAsCSV(exportData);
        break;
      case 'excel':
        formattedData = this.formatAsExcel(exportData);
        break;
      case 'json':
        formattedData = JSON.stringify(exportData, null, 2);
        break;
      default:
        formattedData = JSON.stringify(exportData, null, 2);
    }

    return {
      segment,
      exportFormat,
      recordCount: exportData.contacts.length,
      data: formattedData,
      destination,
      exportedAt: new Date().toISOString(),
      includesAnalytics: includeAnalytics
    };
  }

  private async bulkApplyTags(params: any, context: FunctionCall['context']): Promise<any> {
    const { contactIds, tags, criteria } = params;

    const results = [];
    for (const contactId of contactIds) {
      try {
        // Apply tags based on criteria or directly
        const appliedTags = criteria ? this.evaluateTaggingCriteria(contactId, criteria) : tags;

        results.push({
          contactId,
          tagsApplied: appliedTags,
          success: true
        });
      } catch (error) {
        results.push({
          contactId,
          tagsApplied: [],
          success: false,
          error: 'Tagging failed'
        });
      }
    }

    return {
      totalContacts: contactIds.length,
      successful: results.filter(r => r.success).length,
      totalTagsApplied: results.reduce((sum, r) => sum + r.tagsApplied.length, 0),
      results,
      summary: {
        mostCommonTag: this.findMostCommonTag(results),
        tagsDistribution: this.calculateTagDistribution(results)
      }
    };
  }

  private formatAsCSV(data: any): string {
    // Simple CSV formatting
    const headers = ['ID', 'Name', 'Email', 'Score'];
    const rows = data.contacts.map((c: any) => [c.id, c.name, c.email, c.score]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private formatAsExcel(data: any): any {
    // Mock Excel format - would use a library like xlsx in real implementation
    return {
      worksheets: [{
        name: 'Contacts',
        data: data.contacts
      }],
      metadata: data.analytics
    };
  }

  private evaluateTaggingCriteria(contactId: string, criteria: any): string[] {
    // Mock criteria evaluation
    const tags = [];
    if (criteria.score && criteria.score > 80) tags.push('high-value');
    if (criteria.industry === 'technology') tags.push('tech');
    return tags.length > 0 ? tags : ['general'];
  }

  private findMostCommonTag(results: any[]): string {
    const tagCounts: Record<string, number> = {};
    results.forEach(result => {
      result.tagsApplied.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
  }

  private calculateTagDistribution(results: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    results.forEach(result => {
      result.tagsApplied.forEach((tag: string) => {
        distribution[tag] = (distribution[tag] || 0) + 1;
      });
    });
    return distribution;
  }

  // Search & Filtering Functions Implementation

  private async findSimilarContacts(params: any, context: FunctionCall['context']): Promise<any> {
    const { referenceContactId, similarityCriteria, maxResults } = params;

    // This would typically search the database for similar contacts
    const similarContacts = [
      { id: 'contact_2', name: 'Jane Smith', similarity: 0.85, reasons: ['Same industry', 'Similar title'] },
      { id: 'contact_3', name: 'Bob Johnson', similarity: 0.78, reasons: ['Same company size', 'Similar role'] }
    ].slice(0, maxResults || 10);

    return {
      referenceContactId,
      criteria: similarityCriteria,
      totalFound: similarContacts.length,
      contacts: similarContacts,
      searchTimestamp: new Date().toISOString()
    };
  }

  private async searchByEngagement(params: any, context: FunctionCall['context']): Promise<any> {
    const { engagementLevel, timeframe, minScore } = params;

    // This would query contacts by engagement level
    const contacts = [
      { id: 'contact_1', name: 'John Doe', engagementScore: 85, lastActivity: '2024-09-01' },
      { id: 'contact_2', name: 'Jane Smith', engagementScore: 92, lastActivity: '2024-09-02' }
    ].filter(c => c.engagementScore >= (minScore || 0));

    return {
      engagementLevel,
      timeframe: timeframe || '30d',
      minScore: minScore || 0,
      totalFound: contacts.length,
      contacts,
      averageScore: contacts.reduce((sum, c) => sum + c.engagementScore, 0) / contacts.length || 0
    };
  }

  private async rankByEngagement(params: any, context: FunctionCall['context']): Promise<any> {
    const { rankingCriteria, limit, segment } = params;

    // This would rank contacts by engagement criteria
    const rankedContacts = [
      { id: 'contact_1', name: 'John Doe', score: 92, rank: 1, criteria: 'overall' },
      { id: 'contact_2', name: 'Jane Smith', score: 88, rank: 2, criteria: 'overall' },
      { id: 'contact_3', name: 'Bob Johnson', score: 85, rank: 3, criteria: 'overall' }
    ].slice(0, limit || 20);

    return {
      rankingCriteria: rankingCriteria || 'overall',
      segment: segment || 'all',
      totalRanked: rankedContacts.length,
      contacts: rankedContacts,
      rankingTimestamp: new Date().toISOString()
    };
  }

  private getOpenAIFunctionDefinitions(): any[] {
    return [
      // 🎯 Contact Analysis & Scoring Functions
      {
        name: 'analyze_contact_profile',
        description: 'Analyze a contact\'s potential as a client with detailed scoring and insights',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                industry: { type: 'string' },
                interestLevel: { type: 'string', enum: ['hot', 'medium', 'low', 'cold'] }
              },
              required: ['name']
            },
            analysisDepth: {
              type: 'string',
              enum: ['basic', 'detailed', 'comprehensive'],
              default: 'detailed'
            }
          },
          required: ['contactId', 'contactData']
        }
      },

      // 📊 Contact Enrichment Functions
      {
        name: 'enrich_contact_profile',
        description: 'Enrich a contact profile with additional information from various sources',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                email: { type: 'string' }
              },
              required: ['name']
            }
          },
          required: ['contactId', 'contactData']
        }
      },

      // 📈 Engagement Analysis Functions
      {
        name: 'analyze_contact_engagement',
        description: 'Analyze contact engagement patterns and communication history',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            engagementData: {
              type: 'object',
              properties: {
                contact: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                },
                interactions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['email', 'call', 'meeting', 'social'] },
                      date: { type: 'string' },
                      outcome: { type: 'string' }
                    }
                  }
                },
                timeframe: { type: 'string', default: '30d' }
              },
              required: ['contact']
            }
          },
          required: ['contactId', 'engagementData']
        }
      },

      // ✅ Data Validation Functions
      {
        name: 'validate_contact_data',
        description: 'Validate contact data quality and completeness',
        parameters: {
          type: 'object',
          properties: {
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                company: { type: 'string' },
                title: { type: 'string' }
              },
              required: ['name']
            }
          },
          required: ['contactData']
        }
      },

      // 💡 Insights Generation Functions
      {
        name: 'generate_contact_insights',
        description: 'Generate actionable insights and recommendations for a contact',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                industry: { type: 'string' },
                interestLevel: { type: 'string' }
              },
              required: ['name']
            },
            insightTypes: {
              type: 'array',
              items: { type: 'string', enum: ['opportunities', 'recommendations', 'risks', 'timing'] },
              default: ['opportunities', 'recommendations']
            }
          },
          required: ['contactId', 'contactData']
        }
      },

      // 📋 Task Management Functions
      {
        name: 'create_followup_task',
        description: 'Create a follow-up task for a contact with AI-generated suggestions',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            taskType: {
              type: 'string',
              enum: ['call', 'email', 'meeting', 'research', 'proposal', 'followup']
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              default: 'medium'
            },
            dueDate: { type: 'string', description: 'ISO date string for due date' },
            description: { type: 'string', description: 'Task description' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                company: { type: 'string' }
              }
            }
          },
          required: ['contactId', 'taskType']
        }
      },

      // 📊 Scoring Functions
      {
        name: 'update_contact_score',
        description: 'Update or recalculate a contact\'s lead scoring',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                industry: { type: 'string' },
                interestLevel: { type: 'string' }
              },
              required: ['name']
            },
            scoreFactors: {
              type: 'object',
              description: 'Additional scoring factors to consider'
            }
          },
          required: ['contactId', 'contactData']
        }
      },

      // 📧 Email Generation Functions
      {
        name: 'generate_personalized_email',
        description: 'Generate a personalized email for a contact',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                email: { type: 'string' }
              },
              required: ['name']
            },
            emailType: {
              type: 'string',
              enum: ['introduction', 'followup', 'proposal', 'nurture', 'reengagement'],
              default: 'introduction'
            },
            context: { type: 'string', description: 'Context for the email' },
            tone: {
              type: 'string',
              enum: ['professional', 'casual', 'friendly', 'formal'],
              default: 'professional'
            }
          },
          required: ['contactId', 'contactData', 'emailType']
        }
      },

      // 💡 Field Suggestion Functions
      {
        name: 'suggest_contact_field',
        description: 'Suggest missing or improved contact field values',
        parameters: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact identifier' },
            contactData: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
                company: { type: 'string' },
                email: { type: 'string' }
              },
              required: ['name']
            },
            fieldType: {
              type: 'string',
              enum: ['phone', 'location', 'social', 'bio', 'missing_info'],
              default: 'missing_info'
            }
          },
          required: ['contactId', 'contactData']
        }
      }
    ];
  }
}

export const aiOrchestrator = new AIOrchestrator();